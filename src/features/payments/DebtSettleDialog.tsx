import { useState } from 'react';
import Modal from '../../components/Modal';
import type { Group } from '../../types/db';
import { createPayment, getGroupBalance, type GroupBalance } from './api';
import type { Payment } from '../../types/db';
import { egp } from '../../utils/format';
import { toast } from 'sonner';

interface DebtSettleDialogProps {
  isOpen: boolean;
  group: Group;
  balance: GroupBalance;
  onClose: () => void;
  onSettled: (result: { payment: Payment; balance: GroupBalance }) => void;
  defaultStudentId?: string | null;
}

const DebtSettleDialog = ({ isOpen, group, balance, onClose, onSettled, defaultStudentId }: DebtSettleDialogProps) => {
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState(balance.remaining);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    const targetAmount = mode === 'full' ? balance.remaining : amount;
    if (targetAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صالح لتسديد الدين');
      return;
    }
    if (targetAmount > balance.remaining) {
      toast.error('المبلغ المدخل أكبر من المتبقي على المجموعة');
      return;
    }

    setSubmitting(true);
    try {
      const payment = await createPayment({
        student_id: defaultStudentId ?? null,
        group_id: group.id,
        amount: targetAmount,
        method: 'cash',
        paid_at: new Date().toISOString().slice(0, 10),
        note: mode === 'full' ? 'تسديد دين كامل' : 'تسديد دين جزئي'
      });
      const latestBalance = await getGroupBalance(group.id);
      toast.success('تم تسجيل عملية التسديد بنجاح');
      onSettled({ payment, balance: latestBalance });
      setAmount(latestBalance.remaining);
      setMode('full');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('تعذر تسجيل عملية التسديد، حاول مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setMode('full');
        setAmount(balance.remaining);
        onClose();
      }}
      title="تسديد دين المجموعة"
      description={`المجموعة: ${group.name}`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-5 py-2 text-sm font-semibold text-brand-secondary transition hover:text-brand-light"
            disabled={submitting}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl bg-brand-gold px-5 py-2 text-sm font-semibold text-brand-blue transition hover:bg-brand-gold/90 disabled:opacity-60"
            disabled={submitting}
          >
            تأكيد التسديد
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-xl border border-white/10 bg-brand-blue/40 p-4 text-brand-light">
          <p>إجمالي المطلوب: {egp(balance.due_total)}</p>
          <p>المدفوع: {egp(balance.paid_total)}</p>
          <p className="font-semibold text-brand-gold">المتبقي: {egp(balance.remaining)}</p>
        </div>
        <div className="flex flex-col gap-3 text-brand-light">
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              type="radio"
              name="debt-mode"
              value="full"
              checked={mode === 'full'}
              onChange={() => {
                setMode('full');
                setAmount(balance.remaining);
              }}
            />
            تسديد كامل ({egp(balance.remaining)})
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              type="radio"
              name="debt-mode"
              value="partial"
              checked={mode === 'partial'}
              onChange={() => {
                setMode('partial');
                setAmount(balance.remaining);
              }}
            />
            تسديد جزئي
          </label>
          {mode === 'partial' && (
            <input
              type="number"
              min={0}
              step={50}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="w-full rounded-xl border border-white/10 bg-brand-navy/40 px-4 py-3 text-brand-light focus:border-brand-gold focus:outline-none"
              placeholder="أدخل المبلغ المراد سداده"
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DebtSettleDialog;
