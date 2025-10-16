import { ReactNode } from 'react';

const EmptyState = ({ icon, title, description }: { icon?: ReactNode; title: string; description: string }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-brand-navy/40 px-6 py-12 text-center text-brand-secondary">
      {icon && <div className="text-brand-gold">{icon}</div>}
      <h3 className="text-xl font-semibold text-brand-light">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed">{description}</p>
    </div>
  );
};

export default EmptyState;
