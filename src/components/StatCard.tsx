import { ReactNode } from 'react';

const toneClasses: Record<string, string> = {
  default: 'bg-slate-800/70 border-white/10 text-gray-100',
  success: 'bg-green-900/30 border-green-700/40 text-green-300',
  warning: 'bg-red-900/30 border-red-500/40 text-red-200',
  highlight: 'bg-brand-gold/10 border-brand-gold/40 text-brand-light'
};

type StatCardProps = {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof toneClasses;
  description?: string;
  action?: ReactNode;
};

const StatCard = ({ title, value, icon, tone = 'default', description, action }: StatCardProps) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-4 py-5 shadow-xl transition hover:-translate-y-1 hover:border-brand-gold/40 sm:px-6 ${
        toneClasses[tone] ?? toneClasses.default
      }`}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs text-brand-secondary sm:text-sm">{title}</p>
          <p className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{value}</p>
          {description && <p className="mt-3 text-xs text-brand-secondary sm:text-sm">{description}</p>}
        </div>
        {icon && <div className="text-brand-gold/80">{icon}</div>}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default StatCard;
