import { FormEvent, useState } from 'react';
import { CheckCircle2, LogIn, Phone, ShieldCheck, UserPlus } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'guest';

type AuthPageProps = {
  onAuthSuccess: () => void;
  onGuestEnter: () => void;
};

const AuthPage = ({ onAuthSuccess, onGuestEnter }: AuthPageProps) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [formState, setFormState] = useState({ name: '', phone: '', password: '', code: '' });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (mode === 'login') {
      if (!formState.phone || !formState.password) {
        setError('يرجى إدخال رقم الهاتف وكلمة المرور.');
        return;
      }
      setSuccessMessage('تم تسجيل الدخول بنجاح.');
      setTimeout(onAuthSuccess, 600);
    }

    if (mode === 'register') {
      if (!formState.name || !formState.phone || !formState.password) {
        setError('يرجى إكمال كل الحقول المطلوبة.');
        return;
      }
      setSuccessMessage('تم إنشاء الحساب بنجاح. يمكنك الآن تسجيل الدخول.');
      setMode('login');
    }

    if (mode === 'guest') {
      if (!formState.code.trim()) {
        setError('يرجى إدخال كود الدخول المخصص للضيوف.');
        return;
      }
      setSuccessMessage('تم التحقق من الكود. سيتم تحويلك لواجهة الضيوف.');
      setTimeout(onGuestEnter, 600);
    }
  };

  const renderFormFields = () => {
    switch (mode) {
      case 'login':
        return (
          <>
            <label className="space-y-2">
              <span className="text-sm text-brand-secondary">رقم الهاتف</span>
              <input
                value={formState.phone}
                onChange={(event) => setFormState((state) => ({ ...state, phone: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
                placeholder="مثال: 01001234567"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-brand-secondary">كلمة المرور</span>
              <input
                type="password"
                value={formState.password}
                onChange={(event) => setFormState((state) => ({ ...state, password: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
                placeholder="••••••••"
              />
            </label>
          </>
        );
      case 'register':
        return (
          <>
            <label className="space-y-2">
              <span className="text-sm text-brand-secondary">الاسم الكامل</span>
              <input
                value={formState.name}
                onChange={(event) => setFormState((state) => ({ ...state, name: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
                placeholder="مثال: أحمد حسن"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-brand-secondary">رقم الهاتف</span>
              <input
                value={formState.phone}
                onChange={(event) => setFormState((state) => ({ ...state, phone: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
                placeholder="مثال: 01001234567"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-brand-secondary">كلمة المرور</span>
              <input
                type="password"
                value={formState.password}
                onChange={(event) => setFormState((state) => ({ ...state, password: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
                placeholder="••••••••"
              />
            </label>
          </>
        );
      case 'guest':
        return (
          <label className="space-y-2">
            <span className="text-sm text-brand-secondary">كود الدخول</span>
            <input
              value={formState.code}
              onChange={(event) => setFormState((state) => ({ ...state, code: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
              placeholder="مثال: ABC123"
            />
          </label>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-blue px-4 py-10 text-brand-light">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-brand-navy/80 p-10 shadow-soft">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-5 py-2 text-sm text-brand-gold">
            <Phone className="h-4 w-4" />
            إدارة الدروس الخصوصية بسهولة
          </div>
          <h1 className="mt-6 text-4xl font-black text-brand-light">مرحبًا بك في المحاسب الشخصي</h1>
          <p className="mt-3 text-sm text-brand-secondary">
            سجل الدخول أو أنشئ حسابًا جديدًا لإدارة دخلك ومصروفاتك وطلابك في مكان واحد.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:justify-center">
          <button
            onClick={() => setMode('login')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === 'login'
                ? 'bg-brand-gold text-brand-blue shadow-soft'
                : 'border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10'
            }`}
          >
            <LogIn className="h-4 w-4" />
            تسجيل الدخول
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === 'register'
                ? 'bg-brand-gold text-brand-blue shadow-soft'
                : 'border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            إنشاء حساب
          </button>
          <button
            onClick={() => setMode('guest')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === 'guest'
                ? 'bg-brand-gold text-brand-blue shadow-soft'
                : 'border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            دخول الزائر
          </button>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {renderFormFields()}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-900/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-green-700/30 bg-green-900/30 px-4 py-3 text-sm text-green-200">
              <CheckCircle2 className="h-4 w-4" />
              {successMessage}
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-gold px-4 py-3 text-sm font-semibold text-brand-blue transition hover:bg-brand-gold/90"
          >
            {mode === 'login' && 'تسجيل الدخول'}
            {mode === 'register' && 'إنشاء الحساب'}
            {mode === 'guest' && 'الدخول كزائر'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
