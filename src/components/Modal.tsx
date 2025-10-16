import { ReactNode, useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

type ModalProps = {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

const Modal = ({ title, description, isOpen, onClose, children, footer }: ModalProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen || !contentRef.current) return;
    contentRef.current.focus();
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            ref={contentRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-[95vw] max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 text-gray-100 shadow-xl sm:w-[600px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/5 px-4 pb-3 pt-4 sm:px-6">
              <div className="space-y-1">
                <h2 id={titleId} className="text-lg font-semibold sm:text-xl">
                  {title}
                </h2>
                {description && <p className="text-xs text-brand-secondary sm:text-sm">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-brand-secondary transition hover:bg-white/10 hover:text-brand-gold"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex max-h-[calc(90vh-9rem)] flex-col overflow-y-auto px-4 pb-4 pt-3 text-sm text-gray-100 sm:px-6 sm:pt-4">
              <div className="space-y-4 pb-[env(safe-area-inset-bottom)]">{children}</div>
            </div>
            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/5 px-4 py-4 sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default Modal;
