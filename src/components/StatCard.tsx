import { ReactNode } from 'react';

const toneClasses: Record<string, string> = {
  default: 'bg-brand-navy/60 border-white/5',
  success: 'bg-green-900/40 border-green-700/40 text-green-300',
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
      className={`relative overflow-hidden rounded-2xl border px-6 py-6 shadow-soft transition hover:-translate-y-1 hover:border-brand-gold/40 ${
        toneClasses[tone] ?? toneClasses.default
      }`}
    >
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-sm text-brand-secondary">{title}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-brand-light">{value}</p>
          {description && <p className="mt-3 text-sm text-brand-secondary">{description}</p>}
        </div>
        {icon && <div className="text-brand-gold/80">{icon}</div>}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default StatCard;
