import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Filter, Lightbulb, PlusCircle, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { payments as initialPayments, students, groups, expenses } from '../data/mockData';
import { filterByMonth, formatCurrency, formatDate } from '../utils/format';
import { useSmartInsights } from '../features/analytics/useSmartInsights';

const PaymentRow = ({
  studentName,
  groupName,
  amount,
  date,
  onEdit,
  onDelete
}: {
  studentName: string;
  groupName: string;
  amount: number;
  date: string;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <tr className="border-b border-white/5 hover:bg-brand-navy/40">
    <td className="px-4 py-4 text-sm text-brand-light">{studentName}</td>
    <td className="px-4 py-4 text-sm text-brand-secondary">{groupName}</td>
    <td className="px-4 py-4 text-sm text-brand-light">{formatCurrency(amount)}</td>
    <td className="px-4 py-4 text-sm text-brand-secondary">{formatDate(date)}</td>
    <td className="px-4 py-4 text-sm text-brand-light">
      <div className="flex items-center gap-3">
        <button
          onClick={onEdit}
          className="rounded-lg border border-blue-400/40 px-3 py-1 text-xs font-semibold text-blue-300 transition hover:bg-blue-400/10"
        >
          تعديل
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
        >
          حذف
        </button>
      </div>
    </td>
  </tr>
);

const Payments = () => {
  const [paymentList, setPaymentList] = useState(initialPayments);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [editablePaymentId, setEditablePaymentId] = useState<string | null>(null);
  const [formState, setFormState] = useState({ studentId: students[0]?.id ?? '', amount: 0, date: '', status: 'paid' });

  const insights = useSmartInsights(paymentList, expenses);

  const filteredPayments = useMemo(() => {
    const monthFiltered = filterByMonth(paymentList, selectedMonth);
    if (!searchTerm) return monthFiltered;
    return monthFiltered.filter((payment) => {
      const student = students.find((item) => item.id === payment.studentId);
      const group = groups.find((item) => item.id === student?.groupId);
      const haystack = `${student?.name ?? ''} ${group?.name ?? ''}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [paymentList, searchTerm, selectedMonth]);

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const openCreateModal = () => {
    setEditablePaymentId(null);
    setFormState({ studentId: students[0]?.id ?? '', amount: 0, date: '', status: 'paid' });
    setIsModalOpen(true);
  };

  const openEditModal = (id: string) => {
    const payment = paymentList.find((item) => item.id === id);
    if (!payment) return;
    setEditablePaymentId(id);
    setFormState({
      studentId: payment.studentId,
      amount: payment.amount,
      date: payment.date,
      status: payment.status
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formState.studentId || !formState.date || !formState.amount) return;
    if (editablePaymentId) {
      setPaymentList((items) =>
        items.map((item) => (item.id === editablePaymentId ? { ...item, ...formState } : item))
      );
    } else {
      setPaymentList((items) => [
        ...items,
        {
          id: `pay-${Date.now()}`,
          ...formState
        }
      ]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setPaymentList((items) => items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="كشف الحساب"
        description="إدارة الدفعات، البحث اللحظي، والتصدير إلى Excel أو PDF"
        actions={
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              onClick={openCreateModal}
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
          value={formatCurrency(totalAmount)}
          tone="highlight"
          icon={<FileSpreadsheet className="h-10 w-10" />}
        />
        <StatCard
          title="متوسط الدفع"
          value={formatCurrency(filteredPayments.length ? Math.round(totalAmount / filteredPayments.length) : 0)}
          icon={<Search className="h-10 w-10" />}
        />
        <StatCard
          title="طلاب نشطون"
          value={`${new Set(filteredPayments.map((payment) => payment.studentId)).size} طالب`}
          icon={<PlusCircle className="h-10 w-10" />}
        />
      </section>

      <div className="rounded-2xl border border-white/5 bg-brand-navy/40 p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm">
            <Search className="h-4 w-4 text-brand-secondary" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث باسم الطالب أو المجموعة"
              className="flex-1 bg-transparent text-brand-light focus:outline-none"
            />
          </div>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm text-brand-light focus:border-brand-gold focus:outline-none"
          >
            <option value="all">كل الشهور</option>
            {Array.from({ length: 12 }).map((_, index) => (
              <option key={index} value={String(index + 1).padStart(2, '0')}>
                {new Intl.DateTimeFormat('ar-EG', { month: 'long' }).format(new Date(new Date().getFullYear(), index, 1))}
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
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length ? (
                filteredPayments.map((payment) => {
                  const student = students.find((item) => item.id === payment.studentId);
                  const group = groups.find((item) => item.id === student?.groupId);
                  return (
                    <PaymentRow
                      key={payment.id}
                      studentName={student?.name ?? 'غير معروف'}
                      groupName={group?.name ?? 'غير معروف'}
                      amount={payment.amount}
                      date={payment.date}
                      onEdit={() => openEditModal(payment.id)}
                      onDelete={() => handleDelete(payment.id)}
                    />
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12">
                    <EmptyState
                      title="لا توجد بيانات"
                      description="لم يتم العثور على دفعات مطابقة للبحث الحالي."
                    />
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-brand-gold/10 text-sm font-semibold text-brand-light">
                <td className="px-4 py-3" colSpan={2}>
                  الإجمالي
                </td>
                <td className="px-4 py-3">{formatCurrency(totalAmount)}</td>
                <td className="px-4 py-3" colSpan={2}>
                  {filteredPayments.length} عملية
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Modal
        title={editablePaymentId ? 'تعديل الدفعة' : 'إضافة دفعة جديدة'}
        description="قم بتعبئة تفاصيل الدفعة ثم اضغط حفظ للتحديث"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-brand-secondary hover:bg-white/10"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              className="rounded-xl bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-gold/90"
            >
              حفظ
            </button>
          </>
        }
      >
        <label className="flex flex-col gap-2">
          <span>الطالب</span>
          <select
            value={formState.studentId}
            onChange={(event) => setFormState((state) => ({ ...state, studentId: event.target.value }))}
            className="rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span>المبلغ</span>
          <input
            type="number"
            value={formState.amount}
            onChange={(event) => setFormState((state) => ({ ...state, amount: Number(event.target.value) }))}
            className="rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span>التاريخ</span>
          <input
            type="date"
            value={formState.date}
            onChange={(event) => setFormState((state) => ({ ...state, date: event.target.value }))}
            className="rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span>الحالة</span>
          <select
            value={formState.status}
            onChange={(event) => setFormState((state) => ({ ...state, status: event.target.value as typeof formState.status }))}
            className="rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
          >
            <option value="paid">مدفوع</option>
            <option value="pending">قادم</option>
            <option value="late">متأخر</option>
          </select>
        </label>
      </Modal>

      <Modal
        title="تحليل Gemini الذكي"
        description="استنادًا إلى بيانات الدخل والمصروفات الحالية"
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
        footer={
          <button
            onClick={() => setIsInsightsOpen(false)}
            className="rounded-xl bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-gold/90"
          >
            فهمت
          </button>
        }
      >
        {insights.map((insight) => (
          <div
            key={insight.title}
            className={`rounded-xl border px-4 py-3 text-sm transition ${
              insight.tone === 'success'
                ? 'border-green-600/40 bg-green-900/30 text-green-200'
                : insight.tone === 'warning'
                ? 'border-red-500/40 bg-red-900/30 text-red-200'
                : 'border-purple-600/40 bg-purple-900/20 text-purple-100'
            }`}
          >
            <h3 className="text-lg font-semibold">{insight.title}</h3>
            <p className="mt-2 leading-7">{insight.description}</p>
          </div>
        ))}
      </Modal>
    </div>
  );
};

export default Payments;
