import { useEffect, useMemo, useState } from 'react';
import { Copy, KeySquare, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { toast } from 'sonner';
import { fetchActiveGuestCode, generateGuestCode, type GuestCodeRecord } from '../features/guestCodes/api';

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
  const [record, setRecord] = useState<GuestCodeRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchActiveGuestCode()
      .then((data) => {
        if (mounted) {
          setRecord(data);
        }
      })
      .catch(() => {
        toast.error('تعذر تحميل كود الضيف الحالي');
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const code = record?.code ?? '------';

  const lastUpdate = useMemo(() => {
    if (!record) return null;
    return new Date(record.updated_at ?? record.created_at);
  }, [record]);

  const handleCopy = async () => {
    try {
      if (!code || code === '------') {
        toast.error('لا يوجد كود متاح للنسخ حالياً');
        return;
      }

      const fallbackCopy = () => {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      };

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(code);
        } catch (error) {
          console.warn('clipboard write failed, using fallback', error);
          fallbackCopy();
        }
      } else {
        fallbackCopy();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('تم نسخ الكود بنجاح');
    } catch (error) {
      setCopied(false);
      toast.error('تعذر نسخ الكود، حاول مرة أخرى');
    }
  };

  const handleGenerate = () => {
    const newCode = generateCode();
    setGenerating(true);
    setCopied(false);
    generateGuestCode(newCode)
      .then((data) => {
        setRecord(data);
        toast.success('تم إنشاء كود جديد وحفظه في القاعدة');
      })
      .catch(() => {
        toast.error('تعذر إنشاء كود جديد، حاول مرة أخرى');
      })
      .finally(() => setGenerating(false));
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
          value={
            loading
              ? 'جارٍ التحميل...'
              : lastUpdate
              ? lastUpdate.toLocaleString('ar-EG')
              : 'غير متوفر'
          }
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
        <p className="mt-4 text-5xl font-black tracking-widest text-brand-light">
          {loading ? '••••••' : code}
        </p>
        <p className="mt-4 text-sm text-brand-secondary">
          شارك هذا الكود مع الضيوف لمنحهم صلاحية عرض البيانات دون تعديل.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleCopy}
            disabled={loading || !record}
            className="flex items-center gap-2 rounded-xl border border-brand-gold px-6 py-3 text-sm font-semibold text-brand-gold transition hover:bg-brand-gold/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Copy className="h-4 w-4" />
            نسخ الكود
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-blue transition hover:bg-brand-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            {generating ? 'جارٍ الإنشاء...' : 'إنشاء كود جديد'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestCodes;
