import { ReactNode } from 'react';

type ModalProps = {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
};

const sizeClassMap: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl'
};

const Modal = ({ title, description, isOpen, onClose, children, footer, size = 'lg' }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/80 p-4">
      <div
        className={`w-full ${sizeClassMap[size]} rounded-2xl border border-white/10 bg-brand-navy/95 p-6 shadow-soft sm:p-8`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-light">{title}</h2>
            {description && <p className="mt-2 text-sm text-brand-secondary">{description}</p>}
          </div>
          <button onClick={onClose} className="text-sm text-brand-secondary transition hover:text-brand-gold">
            إغلاق
          </button>
        </div>
        <div className="mt-6 space-y-4 overflow-y-auto text-sm text-brand-light" style={{ maxHeight: '70vh' }}>
          {children}
        </div>
        {footer && <div className="mt-8 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
