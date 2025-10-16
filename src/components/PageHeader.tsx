import { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

const PageHeader = ({ title, description, actions }: PageHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-brand-navy/50 px-6 py-6 shadow-soft md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-black text-brand-light">{title}</h1>
        {description && <p className="mt-2 text-sm text-brand-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 text-sm">{actions}</div>}
    </div>
  );
};

export default PageHeader;
