import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '../../components/Modal';
import StudentAutocomplete from '../../components/StudentAutocomplete';
import GroupSelect from '../../components/GroupSelect';
import DebtSettleDialog from './DebtSettleDialog';
import type { Group, Payment, Student } from '../../types/db';
import {
  createPayment,
  createStudentIfNotExists,
  getGroupBalance,
  type GroupBalance
} from './api';
import { toast } from 'sonner';
import { egp } from '../../utils/format';

const paymentSchema = z
  .object({
    studentId: z.string().nullable().optional(),
    studentName: z.string().optional(),
    groupId: z.string().nullable().optional(),
    amount: z.coerce
      .number({ invalid_type_error: 'أدخل مبلغًا صالحًا' })
      .positive('المبلغ يجب أن يكون أكبر من صفر'),
    paid_at: z.string().min(1, 'حدد تاريخ الدفع'),
    method: z.enum(['cash', 'card', 'transfer']),
    note: z.string().optional().nullable()
  })
  .superRefine((data, ctx) => {
    const hasStudent = Boolean(data.studentId);
    const hasGroup = Boolean(data.groupId);
    if (!hasStudent && !hasGroup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'اختر طالبًا أو مجموعة على الأقل',
        path: ['studentName']
      });
    }
    if ((data.studentName?.trim() ?? '').length > 0 && !hasStudent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'يرجى اختيار الطالب من القائمة أو إنشائه',
        path: ['studentName']
      });
    }
  });

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payload: {
    payment: Payment;
    student: Student | null;
    group: Group | null;
    balance: GroupBalance | null;
  }) => void;
}

const defaultValues: PaymentFormValues = {
  studentId: null,
  studentName: '',
  groupId: null,
  amount: 0,
  paid_at: new Date().toISOString().slice(0, 10),
  method: 'cash',
  note: ''
};

const PaymentDialog = ({ isOpen, onClose, onSuccess }: PaymentDialogProps) => {
  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues
  });

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupBalance, setGroupBalance] = useState<GroupBalance | null>(null);
  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);

  const studentName = watch('studentName') ?? '';
  const amount = watch('amount');

  useEffect(() => {
    if (!isOpen) {
      reset(defaultValues);
      setSelectedStudent(null);
      setSelectedGroup(null);
      setGroupBalance(null);
    }
  }, [isOpen, reset]);

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      const payment = await createPayment({
        student_id: values.studentId ?? null,
        group_id: values.groupId ?? null,
        amount: values.amount,
        method: values.method,
        paid_at: values.paid_at,
        note: values.note?.trim() ? values.note : null
      });

      let latestBalance: GroupBalance | null = null;
      if (values.groupId) {
        latestBalance = await getGroupBalance(values.groupId);
        setGroupBalance(latestBalance);
      }

      toast.success('تم حفظ الدفعة بنجاح');
      onSuccess({ payment, student: selectedStudent, group: selectedGroup, balance: latestBalance });
      reset(defaultValues);
      setSelectedStudent(null);
      setSelectedGroup(null);
      setGroupBalance(null);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('تعذر حفظ الدفعة، حاول مرة أخرى');
    }
  };

  const amountPreview = useMemo(() => egp(Number(amount) || 0), [amount]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="إضافة دفعة جديدة"
        description="سجل دفعة لطالب أو مجموعة مع تحديث فوري لرصيد المجموعة"
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-5 py-2 text-sm font-semibold text-brand-secondary transition hover:text-brand-light"
              disabled={isSubmitting}
            >
              إلغاء
            </button>
            {selectedGroup && groupBalance && groupBalance.remaining > 0 && (
              <button
                type="button"
                onClick={() => setIsDebtDialogOpen(true)}
                className="rounded-xl border border-brand-gold px-5 py-2 text-sm font-semibold text-brand-gold transition hover:bg-brand-gold/10"
              >
                تسديد الدين ({egp(groupBalance.remaining)})
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="rounded-xl bg-brand-gold px-5 py-2 text-sm font-semibold text-brand-blue transition hover:bg-brand-gold/90 disabled:opacity-60"
              disabled={isSubmitting}
            >
              حفظ الدفعة
            </button>
          </>
        }
      >
        <div className="space-y-6 text-sm">
          <div>
            <label className="mb-2 block text-brand-secondary">اسم الطالب</label>
            <StudentAutocomplete
              value={studentName}
              studentId={selectedStudent?.id ?? null}
              onChange={({ id, name, student }) => {
                setValue('studentName', name, { shouldValidate: true });
                setValue('studentId', id ?? null, { shouldValidate: true });
                if (student) {
                  setSelectedStudent(student);
                } else {
                  setSelectedStudent(null);
                }
              }}
              onCreateStudent={async (name) => {
                const student = await createStudentIfNotExists(name);
                setSelectedStudent(student);
                setValue('studentId', student.id, { shouldValidate: true });
                setValue('studentName', student.full_name, { shouldValidate: true });
                return student;
              }}
              error={errors.studentName?.message}
            />
          </div>
          <div>
            <label className="mb-2 block text-brand-secondary">المجموعة</label>
            <GroupSelect
              value={selectedGroup}
              onChange={(group) => {
                setSelectedGroup(group);
                setValue('groupId', group?.id ?? null, { shouldValidate: true });
              }}
              onBalanceChange={(balance) => {
                setGroupBalance(balance);
              }}
              error={errors.groupId?.message}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-brand-secondary">المبلغ (EGP)</label>
              <input
                type="number"
                min={0}
                step={50}
                value={amount}
                onChange={(event) => setValue('amount', Number(event.target.value), { shouldValidate: true })}
                className={`w-full rounded-xl border px-4 py-3 text-brand-light focus:border-brand-gold focus:outline-none ${
                  errors.amount ? 'border-red-500/60 bg-red-900/20' : 'border-white/10 bg-brand-blue/40'
                }`}
              />
              {errors.amount && <p className="mt-2 text-xs text-red-400">{errors.amount.message}</p>}
              <p className="mt-2 text-xs text-brand-secondary">{amountPreview}</p>
            </div>
            <div>
              <label className="mb-2 block text-brand-secondary">تاريخ الدفع</label>
              <input
                type="date"
                value={watch('paid_at')}
                onChange={(event) => setValue('paid_at', event.target.value, { shouldValidate: true })}
                className={`w-full rounded-xl border px-4 py-3 text-brand-light focus:border-brand-gold focus:outline-none ${
                  errors.paid_at ? 'border-red-500/60 bg-red-900/20' : 'border-white/10 bg-brand-blue/40'
                }`}
              />
              {errors.paid_at && <p className="mt-2 text-xs text-red-400">{errors.paid_at.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-brand-secondary">طريقة الدفع</label>
              <select
                value={watch('method')}
                onChange={(event) => setValue('method', event.target.value as PaymentFormValues['method'])}
                className="w-full rounded-xl border border-white/10 bg-brand-blue/40 px-4 py-3 text-brand-light focus:border-brand-gold focus:outline-none"
              >
                <option value="cash">نقدي</option>
                <option value="card">بطاقة</option>
                <option value="transfer">تحويل بنكي</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-brand-secondary">ملاحظات</label>
              <input
                value={watch('note') ?? ''}
                onChange={(event) => setValue('note', event.target.value)}
                placeholder="ملاحظة اختيارية"
                className="w-full rounded-xl border border-white/10 bg-brand-blue/40 px-4 py-3 text-brand-light placeholder:text-brand-secondary focus:border-brand-gold focus:outline-none"
              />
            </div>
          </div>
        </div>
      </Modal>
      {selectedGroup && groupBalance && (
        <DebtSettleDialog
          isOpen={isDebtDialogOpen}
          group={selectedGroup}
          balance={groupBalance}
          defaultStudentId={selectedStudent?.id ?? null}
          onClose={() => setIsDebtDialogOpen(false)}
          onSettled={({ payment, balance }) => {
            setGroupBalance(balance);
            toast.success('تم تحديث رصيد المجموعة بعد التسديد');
            onSuccess({ payment, student: selectedStudent, group: selectedGroup, balance });
          }}
        />
      )}
    </>
  );
};

export default PaymentDialog;
