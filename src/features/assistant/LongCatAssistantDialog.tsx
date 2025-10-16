import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Send, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../../components/Modal';

interface LongCatAssistantDialogProps {
  open: boolean;
  onClose: () => void;
}

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
}

const endpoint = (import.meta.env.VITE_FINANCE_ASSISTANT_URL as string | undefined) ?? '/api/finance/ask';

const LongCatAssistantDialog = ({ open, onClose }: LongCatAssistantDialogProps) => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    } else {
      setQuestion('');
      setMessages([]);
      setLoading(false);
    }
  }, [open]);

  const canAsk = useMemo(() => question.trim().length > 0 && !loading, [question, loading]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canAsk) return;

    const query = question.trim();
    setLoading(true);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', content: query }
    ]);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });

      if (!response.ok) {
        throw new Error('assistant_request_failed');
      }

      const payload = await response.json();
      const assistantReply: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: (payload.text ?? payload.result ?? '').trim() || 'تعذر الحصول على رد من المساعد حالياً.',
        provider: payload.provider ?? undefined
      };

      setMessages((current) => [...current, assistantReply]);
      setQuestion('');
    } catch (error) {
      console.error(error);
      toast.error('تعذر التواصل مع مساعد LONG Cat، تحقق من نقطة النهاية المهيأة.');
      setMessages((current) => current.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="مساعد LONG Cat الذكي"
      description="اكتب سؤالك عن الدخل أو المصروفات وسيقوم المساعد بتحليل بيانات Supabase وتقديم خطة أو ملخص فوري."
      isOpen={open}
      onClose={onClose}
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-brand-blue/40 p-4 text-xs text-brand-secondary">
          <p>
            يحافظ المساعد على خصوصيتك: يتم إرسال المجاميع والتحليلات فقط دون مشاركة أسماء الطلاب أو البيانات الحساسة. تأكد من
            إعداد نقطة النهاية الخلفية التي تنفذ تكامل LONG Cat وGemini الوارد في التوثيق.
          </p>
          <p className="mt-2 flex items-center gap-2 text-brand-secondary/80">
            <ShieldAlert className="h-4 w-4 text-brand-gold" />
            الردود إرشادية وليست استشارة مالية رسمية.
          </p>
        </div>

        <div className="space-y-3">
          <div className="max-h-64 space-y-4 overflow-y-auto pr-2">
            {messages.length ? (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-soft ${
                    message.role === 'user'
                      ? 'border-brand-gold/40 bg-brand-gold/10 text-brand-light'
                      : 'border-white/10 bg-brand-navy/60 text-brand-light'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-brand-secondary/80">
                    <span>{message.role === 'user' ? 'أنت' : 'المساعد'}</span>
                    {message.provider ? <span>المزوّد: {message.provider}</span> : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-white/10 bg-brand-navy/40 p-6 text-center text-sm text-brand-secondary">
                اطرح سؤالك حول المصروفات، الدخل، أو اطلب خطة ادخار للشهر القادم.
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="مثال: ما هو صافي الدخل في أكتوبر؟ كيف يمكنني توزيع مصروف شهري قدره 5000 ج.م؟"
              className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-brand-navy/60 px-4 py-3 text-sm text-brand-light focus:border-brand-gold focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3 text-xs text-brand-secondary">
              <span>سيتم إرسال الطلب إلى نقطة النهاية: {endpoint}</span>
              <button
                type="submit"
                disabled={!canAsk}
                className="flex items-center gap-2 rounded-xl bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-blue transition hover:bg-brand-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                إرسال السؤال
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default LongCatAssistantDialog;
