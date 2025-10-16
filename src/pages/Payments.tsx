import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Filter, Lightbulb, PlusCircle, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import PaymentDialog from '../features/payments/PaymentDialog';
import { monthOptions, expenses, type PaymentRecord } from '../data/mockData';
import { egp, filterByMonth, formatDate } from '../utils/format';
import { useSmartInsights } from '../features/analytics/useSmartInsights';
import type { Group, Student } from '../types/db';
import { listGroupsStore, listPaymentsStore, listStudentsStore } from '../features/payments/api';

const PaymentRow = ({
  payment,
  student,
  group
}: {
  payment: PaymentRecord;
  student?: Student;
  group?: Group;
}) => (
  <tr className="border-b border-white/5 hover:bg-brand-navy/40">
    <td className="px-4 py-4 text-sm text-brand-light">{student?.full_name ?? '—'}</td>
    <td className="px-4 py-4 text-sm text-brand-secondary">{group?.name ?? '—'}</td>
    <td className="px-4 py-4 text-sm text-brand-light">{egp(payment.amount)}</td>
    <td className="px-4 py-4 text-sm text-brand-secondary">{formatDate(payment.paid_at)}</td>
    <td className="px-4 py-4 text-sm text-brand-secondary">
      {payment.method === 'cash' ? 'نقدي' : payment.method === 'card' ? 'بطاقة' : 'تحويل'}
    </td>
    <td className="px-4 py-4 text-sm text-brand-secondary">{payment.note ?? '—'}</td>
  </tr>
);

const Payments = () => {
  const [paymentList, setPaymentList] = useState<PaymentRecord[]>(() =>
    listPaymentsStore().map((payment) => ({ ...payment, status: payment.status ?? 'paid' }))
  );
  const [studentsList, setStudentsList] = useState<Student[]>(() => [...listStudentsStore()]);
  const [groupsList, setGroupsList] = useState<Group[]>(() => [...listGroupsStore()]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  const insights = useSmartInsights(paymentList, expenses);

  const filteredPayments = useMemo(() => {
    const monthFiltered = filterByMonth(paymentList, selectedMonth, (item) => item.paid_at);
    if (!searchTerm.trim()) return monthFiltered;
    const normalized = searchTerm.trim().toLowerCase();
    return monthFiltered.filter((payment) => {
      const student = payment.student_id
        ? studentsList.find((item) => item.id === payment.student_id)
        : undefined;
      const group = payment.group_id ? groupsList.find((item) => item.id === payment.group_id) : undefined;
      const haystack = `${student?.full_name ?? ''} ${group?.name ?? ''}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [paymentList, selectedMonth, searchTerm, studentsList, groupsList]);

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const uniqueStudents = useMemo(() => {
    const ids = filteredPayments
      .map((payment) => payment.student_id)
      .filter((id): id is string => Boolean(id));
    return new Set(ids).size;
  }, [filteredPayments]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="كشف الحساب"
        description="إدارة الدفعات، البحث اللحظي، والتصدير إلى Excel أو PDF"
        actions={
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              onClick={() => setIsDialogOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-gold px-4 py-3 font-semibold text-brand-blue transition hover:bg-brand-gold/90"
            >
              <PlusCircle className="h-4 w-4" />
              إضافة دفعة
            </button>
            <button
              onClick={() => setIsInsightsOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-purple-600/40 px-4 py-3 font-semibold text-purple-300 transition hover:bg-purple-600/10"
            >
              <Lightbulb className="h-4 w-4" />
              تحليل ذكي
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-green-700/50 px-4 py-3 font-semibold text-green-400 transition hover:bg-green-700/10">
              <FileSpreadsheet className="h-4 w-4" />
              تصدير XLSX
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-red-500/50 px-4 py-3 font-semibold text-red-300 transition hover:bg-red-500/10">
              <FileText className="h-4 w-4" />
              تصدير PDF
            </button>
          </div>
        }
      />

      <section className="grid gap-6 md:grid-cols-4">
        <StatCard title="عدد الدفعات" value={`${filteredPayments.length} عملية`} icon={<Filter className="h-10 w-10" />} />
        <StatCard
          title="إجمالي المبلغ"
          value={egp(totalAmount)}
          tone="highlight"
          icon={<FileSpreadsheet className="h-10 w-10" />}
        />
        <StatCard
          title="متوسط الدفع"
          value={filteredPayments.length ? egp(Math.round(totalAmount / filteredPayments.length)) : egp(0)}
          icon={<Search className="h-10 w-10" />}
        />
        <StatCard
          title="عدد الطلاب الدافعين"
          value={`${uniqueStudents} طالب`}
          icon={<Filter className="h-10 w-10" />}
        />
      </section>

      <section className="rounded-2xl border border-white/5 bg-brand-navy/40 p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/10 bg-brand-blue/40 px-4 py-3">
            <Search className="h-4 w-4 text-brand-secondary" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث باسم الطالب أو المجموعة"
              className="flex-1 bg-transparent text-sm text-brand-light placeholder:text-brand-secondary focus:outline-none"
            />
          </div>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-brand-blue/40 px-4 py-3 text-sm text-brand-light focus:border-brand-gold focus:outline-none md:w-60"
          >
            <option value="all">كل الشهور</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-right">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-brand-secondary">
                <th className="px-4 py-3">الطالب</th>
                <th className="px-4 py-3">المجموعة</th>
                <th className="px-4 py-3">المبلغ</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">طريقة الدفع</th>
                <th className="px-4 py-3">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length ? (
                filteredPayments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    student={payment.student_id ? studentsList.find((student) => student.id === payment.student_id) : undefined}
                    group={payment.group_id ? groupsList.find((group) => group.id === payment.group_id) : undefined}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12">
                    <EmptyState title="لا توجد دفعات" description="استخدم زر إضافة دفعة لتسجيل أول عملية." />
                  </td>
                </tr>
              )}
            </tbody>
            {filteredPayments.length > 0 && (
              <tfoot>
                <tr className="bg-brand-gold/10 text-sm font-semibold text-brand-light">
                  <td className="px-4 py-3">الإجمالي</td>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3">{egp(totalAmount)}</td>
                  <td className="px-4 py-3" colSpan={3}>
                    {filteredPayments.length} دفعات مسجلة
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <Modal
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
        title="تحليل ذكي"
        description="أفكار سريعة لمساعدتك على تحسين التدفق النقدي"
      >
        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.title}
              className={`rounded-xl border px-4 py-3 text-sm ${
                insight.tone === 'success'
                  ? 'border-green-500/40 bg-green-900/20 text-green-200'
                  : insight.tone === 'warning'
                  ? 'border-red-500/40 bg-red-900/20 text-red-200'
                  : 'border-white/10 bg-brand-blue/40 text-brand-secondary'
              }`}
            >
              <h4 className="font-semibold text-brand-light">{insight.title}</h4>
              <p className="mt-1 leading-6">{insight.description}</p>
            </div>
          ))}
        </div>
      </Modal>

      <PaymentDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={({ payment, student, group, balance }) => {
          setPaymentList((current) => [...current, { ...payment, status: 'paid' }]);
          if (student) {
            setStudentsList((current) => {
              const exists = current.some((item) => item.id === student.id);
              return exists ? current.map((item) => (item.id === student.id ? student : item)) : [...current, student];
            });
          }
          if (group) {
            setGroupsList((current) => {
              const exists = current.some((item) => item.id === group.id);
              return exists ? current.map((item) => (item.id === group.id ? group : item)) : [...current, group];
            });
          }
          if (balance && group) {
            setGroupsList((current) =>
              current.map((item) => (item.id === group.id ? { ...item, due_total: group.due_total } : item))
            );
          }
        }}
      />
    </div>
  );
};

export default Payments;
