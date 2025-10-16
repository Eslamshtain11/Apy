import type { Group, Payment, Student } from '../types/db';

export type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
};

export type PaymentRecord = Payment & {
  status: 'paid' | 'pending' | 'late';
};

const now = new Date();
const currentYear = now.getFullYear();

const isoDate = (month: number, day: number) =>
  new Date(currentYear, month - 1, day).toISOString().slice(0, 10);

export const groups: Group[] = [
  {
    id: 'grp-1',
    name: 'مجموعة الفيزياء - ثالث ثانوي',
    description: 'طلاب الثانوية العامة - فيزياء',
    due_total: 9600,
    created_at: isoDate(1, 1)
  },
  {
    id: 'grp-2',
    name: 'مجموعة الكيمياء - ثاني ثانوي',
    description: 'مراجعة كيمياء شاملة',
    due_total: 7200,
    created_at: isoDate(1, 3)
  },
  {
    id: 'grp-3',
    name: 'مجموعة العلوم - أولى إعدادي',
    description: 'تقوية علوم للفصل الدراسي',
    due_total: 5400,
    created_at: isoDate(1, 5)
  }
];

export const students: Student[] = [
  {
    id: 'stu-1',
    full_name: 'أحمد سمير',
    phone: '01001234567',
    group_id: 'grp-1',
    active: true,
    created_at: isoDate(1, 2)
  },
  {
    id: 'stu-2',
    full_name: 'ليلى محمود',
    phone: '01007654321',
    group_id: 'grp-1',
    active: true,
    created_at: isoDate(1, 4)
  },
  {
    id: 'stu-3',
    full_name: 'مريم خالد',
    phone: '01006543218',
    group_id: 'grp-2',
    active: true,
    created_at: isoDate(1, 6)
  },
  {
    id: 'stu-4',
    full_name: 'يوسف عمر',
    phone: '01007891234',
    group_id: 'grp-3',
    active: true,
    created_at: isoDate(1, 8)
  }
];

export const payments: PaymentRecord[] = [
  {
    id: 'pay-1',
    student_id: 'stu-1',
    group_id: 'grp-1',
    amount: 1200,
    method: 'cash',
    paid_at: isoDate(1, 5),
    note: null,
    status: 'paid'
  },
  {
    id: 'pay-2',
    student_id: 'stu-2',
    group_id: 'grp-1',
    amount: 1200,
    method: 'transfer',
    paid_at: isoDate(1, 7),
    note: null,
    status: 'late'
  },
  {
    id: 'pay-3',
    student_id: 'stu-3',
    group_id: 'grp-2',
    amount: 950,
    method: 'cash',
    paid_at: isoDate(2, 10),
    note: null,
    status: 'paid'
  },
  {
    id: 'pay-4',
    student_id: 'stu-4',
    group_id: 'grp-3',
    amount: 800,
    method: 'card',
    paid_at: isoDate(2, 15),
    note: null,
    status: 'pending'
  },
  {
    id: 'pay-5',
    student_id: 'stu-1',
    group_id: 'grp-1',
    amount: 1200,
    method: 'cash',
    paid_at: isoDate(3, 5),
    note: null,
    status: 'paid'
  },
  {
    id: 'pay-6',
    student_id: 'stu-2',
    group_id: 'grp-1',
    amount: 1200,
    method: 'transfer',
    paid_at: isoDate(3, 5),
    note: null,
    status: 'paid'
  },
  {
    id: 'pay-7',
    student_id: 'stu-3',
    group_id: 'grp-2',
    amount: 950,
    method: 'cash',
    paid_at: isoDate(3, 12),
    note: null,
    status: 'paid'
  }
];

export const expenses: Expense[] = [
  { id: 'exp-1', description: 'إيجار القاعة', amount: 2000, date: isoDate(1, 2) },
  { id: 'exp-2', description: 'تجهيزات مطبوعة', amount: 450, date: isoDate(1, 18) },
  { id: 'exp-3', description: 'أجهزة عرض', amount: 1200, date: isoDate(2, 5) },
  { id: 'exp-4', description: 'اشتراك منصات تعليمية', amount: 600, date: isoDate(3, 1) }
];

export const guestCode = {
  code: 'ACDM-4821',
  updatedAt: new Date().toISOString()
};

const formatter = new Intl.DateTimeFormat('ar-EG', { month: 'long' });

export const monthOptions = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  const date = new Date(currentYear, index, 1);
  return {
    value: month.toString().padStart(2, '0'),
    label: formatter.format(date),
    numericMonth: month
  };
});
