export type Group = {
  id: string;
  name: string;
};

export type Student = {
  id: string;
  name: string;
  groupId: string;
};

export type Payment = {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'late';
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
};

export const groups: Group[] = [
  { id: 'grp-1', name: 'مجموعة الفيزياء - ثالث ثانوي' },
  { id: 'grp-2', name: 'مجموعة الكيمياء - ثاني ثانوي' },
  { id: 'grp-3', name: 'مجموعة العلوم - أولى إعدادي' }
];

export const students: Student[] = [
  { id: 'stu-1', name: 'أحمد سمير', groupId: 'grp-1' },
  { id: 'stu-2', name: 'ليلى محمود', groupId: 'grp-1' },
  { id: 'stu-3', name: 'مريم خالد', groupId: 'grp-2' },
  { id: 'stu-4', name: 'يوسف عمر', groupId: 'grp-3' }
];

const currentYear = new Date().getFullYear();

export const payments: Payment[] = [
  { id: 'pay-1', studentId: 'stu-1', amount: 1200, date: `${currentYear}-01-05`, status: 'paid' },
  { id: 'pay-2', studentId: 'stu-2', amount: 1200, date: `${currentYear}-01-07`, status: 'late' },
  { id: 'pay-3', studentId: 'stu-3', amount: 950, date: `${currentYear}-02-10`, status: 'paid' },
  { id: 'pay-4', studentId: 'stu-4', amount: 800, date: `${currentYear}-02-15`, status: 'pending' },
  { id: 'pay-5', studentId: 'stu-1', amount: 1200, date: `${currentYear}-03-05`, status: 'paid' },
  { id: 'pay-6', studentId: 'stu-2', amount: 1200, date: `${currentYear}-03-05`, status: 'paid' },
  { id: 'pay-7', studentId: 'stu-3', amount: 950, date: `${currentYear}-03-12`, status: 'paid' }
];

export const expenses: Expense[] = [
  { id: 'exp-1', description: 'إيجار القاعة', amount: 2000, date: `${currentYear}-01-02` },
  { id: 'exp-2', description: 'تجهيزات مطبوعة', amount: 450, date: `${currentYear}-01-18` },
  { id: 'exp-3', description: 'أجهزة عرض', amount: 1200, date: `${currentYear}-02-05` },
  { id: 'exp-4', description: 'اشتراك منصات تعليمية', amount: 600, date: `${currentYear}-03-01` }
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
