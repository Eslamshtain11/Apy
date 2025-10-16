import { useMemo, useState } from 'react';
import { Copy, KeySquare, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { guestCode } from '../data/mockData';

const generateCode = () => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let index = 0; index < 6; index += 1) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  return result;
};

const GuestCodes = () => {
  const [code, setCode] = useState(guestCode.code);
  const [copied, setCopied] = useState(false);

  const lastUpdate = useMemo(() => new Date(guestCode.updatedAt), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopied(false);
    }
  };

  const handleGenerate = () => {
    const newCode = generateCode();
    setCode(newCode);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="أكواد الضيوف"
        description="قم بإنشاء أكواد مؤقتة لزوار المنصة لعرض التقارير فقط"
      />

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="آخر تحديث"
          value={lastUpdate.toLocaleString('ar-EG')}
          icon={<RefreshCw className="h-10 w-10" />}
        />
        <StatCard
          title="الزوار النشطون"
          value="زائر واحد"
          description="يمكن إنشاء أكثر من كود لاحقًا"
          icon={<KeySquare className="h-10 w-10" />}
        />
        <StatCard
          title="حالة النسخ"
          value={copied ? 'تم النسخ!' : 'اضغط للنسخ'}
          icon={<Copy className="h-10 w-10" />}
        />
      </section>

      <div className="rounded-2xl border border-dashed border-brand-gold/40 bg-brand-navy/40 p-10 text-center shadow-soft">
        <h2 className="text-2xl font-black text-brand-gold">كود الدخول الحالي</h2>
        <p className="mt-4 text-5xl font-black tracking-widest text-brand-light">{code}</p>
        <p className="mt-4 text-sm text-brand-secondary">
          شارك هذا الكود مع الضيوف لمنحهم صلاحية عرض البيانات دون تعديل.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-xl border border-brand-gold px-6 py-3 text-sm font-semibold text-brand-gold transition hover:bg-brand-gold/10"
          >
            <Copy className="h-4 w-4" />
            نسخ الكود
          </button>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 rounded-xl bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-blue transition hover:bg-brand-gold/90"
          >
            <RefreshCw className="h-4 w-4" />
            إنشاء كود جديد
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestCodes;
