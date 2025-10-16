# ⛳️ برومبت إلى Codex — “الدمج المالي الذكي مع LONG Cat + Gemini”

**الدور/Role:**
أنت مطوّر Full-Stack (TypeScript/Node + Supabase/Postgres + React) تبني “مساعد مالي ذكي” داخل مشروع **المحاسب الذكي**. استخدم **LONG Cat (OpenAI-compatible)** كمزوّد أساسي، و**Gemini** كـfallback تلقائي. راعِ الأمان والخصوصية (لا مفاتيح في الكود، تجميع/إخفاء البيانات قبل الإرسال للـLLM). سلّم كود جاهز للتشغيل.

---

## 0) الإعدادات والبيئة

أنشئ متغيرات البيئة التالية فقط (لا تضع مفاتيح صريحة في الكود):

```
# LLMs
LONGCAT_API_KEY=<<يوضع بواسطة المستخدم>>
LONGCAT_BASE_URL=https://api.longcat.chat/openai
LONGCAT_MODEL=LongCat-Flash-Chat

GEMINI_API_KEY=<<يوضع بواسطة المستخدم>>
GEMINI_MODEL=gemini-1.5-pro

# عام
AI_TIMEOUT_MS=30000
AI_MAX_TOKENS=1200
AI_TEMPERATURE=0.2

# قاعدة البيانات (Supabase/Postgres)
DATABASE_URL=<<يوضع بواسطة المستخدم أو استخدم عميل Supabase القائم>>
```

ثبّت الحزم:

```
npm i openai @google/generative-ai pg zod
```

---

## 1) مخطط قاعدة البيانات والترحيلات (Supabase/Postgres)

أنشئ/حدّث الجداول (SQL migration):

```sql
-- accounts: حسابات المستخدم (محفظة/بنك/كاش)
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  currency text not null default 'EGP',
  created_at timestamptz default now()
);

-- transactions: المعاملات المالية
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  account_id uuid references accounts(id) on delete set null,
  ts timestamptz not null,                   -- توقيت العملية
  amount numeric not null,                   -- بالموجب للـدخل، بالسالب للمصروف
  currency text not null default 'EGP',
  category text,                             -- مثل: Food, Transport, Income:Salary
  merchant text,
  note text,
  created_at timestamptz default now()
);

-- budgets (اختياري): ميزانيات شهرية لكل تصنيف
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  month date not null,                       -- YYYY-MM-01
  category text not null,
  amount_limit numeric not null
);

-- aggregated views: ملخصات شهرية
create or replace view v_monthly_summary as
select
  user_id,
  date_trunc('month', ts) as month,
  sum(case when amount > 0 then amount else 0 end) as income,
  sum(case when amount < 0 then -amount else 0 end) as expenses,
  sum(amount) as net
from transactions
group by 1,2;

-- أعلى التجّار/التصنيفات
create or replace view v_top_merchants as
select user_id, merchant, sum(abs(amount)) total, count(*) cnt
from transactions where merchant is not null
group by 1,2 order by total desc;

create or replace view v_top_categories as
select user_id, category, sum(abs(amount)) total, count(*) cnt
from transactions where category is not null
group by 1,2 order by total desc;

-- RLS (مثال)
-- enable row level security and allow user_id = auth.uid()
```

> فعّل RLS بسياسات تقصر القراءة/الكتابة على `auth.uid()`.

---

## 2) طبقة LLM موحدة + fallback

`src/ai/types.ts`

```ts
export type Role = 'system'|'user'|'assistant';
export type ChatMsg = { role: Role; content: string };
export interface ChatUsage { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; }
export interface ChatResult { id: string; content: string; usage?: ChatUsage }
export interface AIProvider {
  name: string;
  chat(messages: ChatMsg[], opts?: { max_tokens?: number; temperature?: number }): Promise<ChatResult>;
}
```

`src/ai/providers/longcat.ts`

```ts
import OpenAI from "openai";
import type { AIProvider, ChatMsg, ChatResult } from "../types";

const BASE_URL = process.env.LONGCAT_BASE_URL ?? "https://api.longcat.chat/openai";
const MODEL = process.env.LONGCAT_MODEL ?? "LongCat-Flash-Chat";
const TIMEOUT = Number(process.env.AI_TIMEOUT_MS ?? 30000);

export class LongCatProvider implements AIProvider {
  name = "LongCat";
  private client = new OpenAI({ apiKey: process.env.LONGCAT_API_KEY, baseURL: BASE_URL, timeout: TIMEOUT });
  async chat(messages: ChatMsg[], opts?: { max_tokens?: number; temperature?: number }): Promise<ChatResult> {
    const r = await this.client.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: opts?.max_tokens ?? Number(process.env.AI_MAX_TOKENS ?? 1200),
      temperature: opts?.temperature ?? Number(process.env.AI_TEMPERATURE ?? 0.2)
    });
    return { id: r.id, content: r.choices?.[0]?.message?.content ?? "", usage: r.usage as any };
  }
}
```

`src/ai/providers/gemini.ts`

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, ChatMsg, ChatResult } from "../types";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-pro";

export class GeminiProvider implements AIProvider {
  name = "Gemini";
  private client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  async chat(messages: ChatMsg[], opts?: { max_tokens?: number; temperature?: number }): Promise<ChatResult> {
    const sys = messages.find(m => m.role === "system")?.content ?? "";
    const userText = messages.filter(m => m.role !== "system").map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    const model = this.client.getGenerativeModel({ model: MODEL, systemInstruction: sys || undefined });
    const res = await model.generateContent({ contents: [{ role: "user", parts: [{ text: userText }]}], generationConfig: { maxOutputTokens: opts?.max_tokens, temperature: opts?.temperature } });
    return { id: crypto.randomUUID(), content: res.response.text() ?? "" };
  }
}
```

`src/ai/router.ts`

```ts
import type { ChatMsg, ChatResult } from "./types";
import { LongCatProvider } from "./providers/longcat";
import { GeminiProvider } from "./providers/gemini";

const longcat = new LongCatProvider();
const gemini  = new GeminiProvider();

function retryable(err:any){ return /timeout|ETIMEDOUT|ECONNRESET|429|5\d\d|rate_limit/i.test(String(err?.message??"")); }

export async function aiChat(messages: ChatMsg[], opts?: { max_tokens?: number; temperature?: number }): Promise<{ provider: string; result: ChatResult }> {
  try { return { provider: "LongCat", result: await longcat.chat(messages, opts) }; }
  catch(e){ if(!retryable(e)) throw e; return { provider: "Gemini (fallback)", result: await gemini.chat(messages, opts) }; }
}
```

---

## 3) طبقة “سؤال → SQL آمن → إجابة” (قراءة فقط)

### 3.1 كتالوج المخطط (Schema Catalog) الذي نعلّمه للـLLM

`src/ai/finance/schema.ts`

```ts
export const SCHEMA_DOC = `
You can query a Postgres database with the following tables (READ-ONLY):
- accounts(id uuid, user_id uuid, name text, currency text, created_at timestamptz)
- transactions(id uuid, user_id uuid, account_id uuid, ts timestamptz, amount numeric, currency text, category text, merchant text, note text, created_at timestamptz)
- v_monthly_summary(user_id uuid, month timestamptz, income numeric, expenses numeric, net numeric)
- v_top_merchants(user_id uuid, merchant text, total numeric, cnt int)
- v_top_categories(user_id uuid, category text, total numeric, cnt int)

Rules:
- Generate ONLY safe SELECT queries; NEVER write/alter.
- Always filter by user_id = $1.
- Prefer aggregates (SUM/AVG/COUNT) and date_trunc('month', ts) for monthly views.
- Currency is EGP unless stated otherwise.
`;
```

### 3.2 مترجم لغة طبيعية → SQL (باستخدام LLM) + تحقق

`src/ai/finance/nl2sql.ts`

```ts
import { z } from "zod";
import { aiChat } from "../router";
import { SCHEMA_DOC } from "./schema";

const SqlPlan = z.object({ sql: z.string().min(10), rationale: z.string().optional() });

export async function nlToSql(userId: string, question: string): Promise<string> {
  const sys = `You are a financial SQL generator. Output ONLY a JSON with { "sql": "<SELECT...>" }.
${SCHEMA_DOC}
Security: SELECT-only, no DDL/DML, must include "WHERE user_id = $1" (bind param).`;
  const { result } = await aiChat([
    { role: "system", content: sys },
    { role: "user", content: `Question: ${question}\nReturn JSON now.` }
  ], { max_tokens: 500, temperature: 0 });

  const text = result.content.trim();
  const json = JSON.parse(text.startsWith('{') ? text : text.substring(text.indexOf('{')));
  const parsed = SqlPlan.parse(json);
  const sql = parsed.sql;

  // حواجز أمان بسيطة
  if (!/^select/i.test(sql) || /(insert|update|delete|alter|drop)/i.test(sql)) throw new Error("Unsafe SQL");
  if (!/where\s+[^;]*user_id\s*=\s*\$1/i.test(sql)) throw new Error("Missing user_id filter");
  return sql;
}
```

### 3.3 تنفيذ SQL وإرجاع جواب لسؤال المستخدم

`src/ai/finance/ask.ts`

```ts
import { Pool } from "pg";
import { nlToSql } from "./nl2sql";
import { aiChat } from "../router";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function answerFinanceQuestion(userId: string, question: string) {
  const sql = await nlToSql(userId, question);
  const { rows } = await pool.query(sql, [userId]);

  // لا نرسل بيانات صف خامة للـ LLM؛ نلخّص أرقام/مجاميع
  const summary = JSON.stringify(rows.slice(0, 200)); // حد آمن
  const sys = "أنت محلّل مالي. قدّم إجابة دقيقة موجزة مع أرقام رئيسية وخطوات عملية قصيرة.";
  const { provider, result } = await aiChat([
    { role: "system", content: sys },
    { role: "user", content: `السؤال: ${question}\nبيانات مختصرة (JSON): ${summary}\nاعرض العملة بـ EGP.` }
  ], { max_tokens: 600, temperature: 0.2 });

  return { provider, text: result.content };
}
```

---

## 4) API Routes

`src/server/routes/finance.ask.ts`

```ts
import type { Request, Response } from "express";
import { answerFinanceQuestion } from "../../ai/finance/ask";

export async function postFinanceAsk(req: Request, res: Response) {
  try {
    const userId = req.user?.id || req.body.userId; // حسب نظام التوثيق عندك
    const { question } = req.body;
    const ans = await answerFinanceQuestion(userId, question);
    res.json(ans);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
}
```

`src/server/routes/finance.insights.ts`

```ts
import type { Request, Response } from "express";
import { Pool } from "pg";
import { aiChat } from "../../ai/router";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function postFinanceInsights(req: Request, res: Response) {
  const userId = req.user?.id || req.body.userId;
  const { rows: monthly } = await pool.query(
    "select month, income, expenses, net from v_monthly_summary where user_id = $1 order by month desc limit 12", [userId]
  );
  const { rows: topCats } = await pool.query(
    "select category, total, cnt from v_top_categories where user_id = $1 order by total desc limit 10", [userId]
  );
  const metrics = { monthly, topCats };

  const sys = "أنت مساعد مالي. لخص التدفق النقدي والاتجاهات وقدّم 5 توصيات قابلة للتنفيذ لتخفيض المصروفات أو زيادة الادخار.";
  const { provider, result } = await aiChat(
    [{ role: "system", content: sys }, { role: "user", content: `هذه بيانات آخر 12 شهرًا (JSON): ${JSON.stringify(metrics)}` }],
    { max_tokens: 900, temperature: 0.2 }
  );
  res.json({ provider, result: result.content });
}
```

---

## 5) واجهة المستخدم

### 5.1 لوحة الأسئلة

`src/components/FinanceChat.tsx`

```tsx
import { useState } from "react";

export default function FinanceChat(){
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [prov, setProv] = useState("");

  async function ask(){
    const r = await fetch("/api/finance/ask", {
      method:"POST",
      headers:{ "content-type":"application/json" },
      body: JSON.stringify({ question: q })
    });
    const data = await r.json();
    setA(data.text || data.result || "");
    setProv(data.provider || "");
  }

  return (
    <div className="space-y-3">
      <div className="text-sm opacity-70">اسأل عن أي شيء بخصوص مالياتك (EGP)</div>
      <div className="flex gap-2">
        <input className="border rounded p-2 flex-1" value={q} onChange={e=>setQ(e.target.value)} placeholder="مثال: صرفت كام أكل الشهر ده؟" />
        <button onClick={ask} className="px-4 py-2 rounded border">اسأل</button>
      </div>
      {prov && <div className="text-xs opacity-60">Provider: {prov}</div>}
      {a && <pre className="border rounded p-3 whitespace-pre-wrap">{a}</pre>}
    </div>
  );
}
```

### 5.2 لوحة الرؤى السريعة

استخدم `InsightsPanel` الذي يعرض نتيجة `/api/finance/insights`.

---

## 6) تشغيل تلقائي “اطّلاع دائم” (Jobs)

* أضف **Job يومي** (pg_cron أو خادم Worker) يُشغّل:

  * إعادة حساب الملخّصات (ممكن فقط `REFRESH MATERIALIZED VIEW` لو استخدمت MVs).
  * إنشاء تنبيهات إذا تجاوزت فئة ميزانيتها.
* لا تُرسل بيانات خام للـLLM تلقائيًا؛ أرسل **مجاميع شهرية** فقط.

---

## 7) الخصوصية والأمان (مهم)

* لا تُرسل أسماء حقيقية/ملاحظات حساسة للـLLM. قبل الإرسال قم بتجريد الحقول إلى **(month, totals, category, merchant initials)** فقط عند الإمكان.
* مفاتيح البيئة في `.env` فقط.
* استعلامات SQL **قراءة فقط** مع حواجز regex + التحقق أعلاه.
* أنت مستخدم قاصر: لو شاركت التطبيق مع آخرين، اعرض تلميحًا واضحًا بأن التقارير لا تُعدّ مشورة مالية احترافية.

---

## 8) اختبارات مبسّطة

* موك لطبقة LLM (LongCat ترجع 429) وتحقق أن الراوتر يستخدم Gemini تلقائيًا.
* اختبار `nlToSql` يعيد SELECT به `WHERE user_id = $1` فقط.
* اختبار `finance.insights` يعيد توصيات غير فارغة عند وجود بيانات عيّنية.

---

## 9) أمثلة أسئلة يدعمها النظام

* “صرفي على الأكل والمشروبات في سبتمبر قد إيه؟”
* “أعلى 5 تجّار صرفت عندهم آخر 3 شهور؟”
* “توقّع لو قللت مواصلات 10% أو زوّدت دخل جانبي 1000 جنيه—أثّرها على صافي الشهر؟” (أعد بناء SQL بمحاكاة بسيطة)
* “أنا متجاوز الميزانية في إيه؟ واقترح تخفيضات عملية الأسبوع الجاي.”

---

**معايير القبول:**

* `/api/finance/ask` يجيب إجابة مفهومة مبنية على بيانات المستخدم فقط.
* `/api/finance/insights` يولّد ملخصًا + 5 توصيات.
* NL→SQL دائمًا READ-ONLY ومفلتر بـ `user_id = $1`.
* fallback لـ Gemini يعمل عند فشل LongCat.
* لا تسريب مفاتيح أو بيانات حساسة في اللوغز.

---

انتهى البرومبت.
