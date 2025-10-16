import { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

const PageHeader = ({ title, description, actions }: PageHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-800/70 px-4 py-5 shadow-xl sm:px-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-black text-gray-100 sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-brand-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base">{actions}</div>}
    </div>
  );
};

export default PageHeader;
