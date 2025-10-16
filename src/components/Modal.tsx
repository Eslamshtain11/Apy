import { ReactNode } from 'react';

type ModalProps = {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

const Modal = ({ title, description, isOpen, onClose, children, footer }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-brand-navy/95 p-8 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-light">{title}</h2>
            {description && <p className="mt-2 text-sm text-brand-secondary">{description}</p>}
          </div>
          <button onClick={onClose} className="text-sm text-brand-secondary transition hover:text-brand-gold">
            إغلاق
          </button>
        </div>
        <div className="mt-6 space-y-4 text-sm text-brand-light">{children}</div>
        {footer && <div className="mt-8 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
