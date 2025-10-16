import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Edit3, FileSpreadsheet, FileText, Filter, Lightbulb, PlusCircle, Search, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import PaymentDialog from '../features/payments/PaymentDialog';
import { egp, filterByMonth, formatDate } from '../utils/format';
import { useSmartInsights } from '../features/analytics/useSmartInsights';
import type { Group, Student } from '../types/db';
import {
  deletePayment,
  type PaymentEntity
} from '../features/payments/api';
import { toast } from 'sonner';
import { useAppData } from '../contexts/AppDataContext';

const monthFormatter = new Intl.DateTimeFormat('ar-EG', { month: 'long' });

const PaymentRow = ({
  payment,
  student,
  group,
  onEdit,
  onDelete,
  deleting
}: {
  payment: PaymentEntity;
  student?: Student;
  group?: Group;
  onEdit: (payment: PaymentEntity) => void;
  onDelete: (payment: PaymentEntity) => void;
  deleting: boolean;
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
    <td className="px-4 py-4 text-sm text-brand-secondary">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onEdit(payment)}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-400/40 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/10"
        >
          <Edit3 className="h-3.5 w-3.5" />
          تعديل
        </button>
        <button
          type="button"
          onClick={() => onDelete(payment)}
          disabled={deleting}
          className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {deleting ? 'جارٍ الحذف' : 'حذف'}
        </button>
      </div>
    </td>
  </tr>
);

const buildMonthOptions = (payments: PaymentEntity[]) => {
  const map = new Map<string, string>();
  payments.forEach((payment) => {
    const date = new Date(payment.paid_at);
    const value = `${date.getMonth() + 1}`.padStart(2, '0');
    if (!map.has(value)) {
      map.set(value, monthFormatter.format(date));
    }
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
};

const augmentPayment = (payment: PaymentEntity): PaymentEntity => ({
  ...payment,
  status: payment.status ?? 'paid'
});

const Payments = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { payments, students, groups, expenses, loading, setPayments, setStudents, refresh } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentEntity | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (location.state && (location.state as { openDialog?: boolean }).openDialog) {
      setIsDialogOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const monthOptions = useMemo(() => buildMonthOptions(payments), [payments]);

  const filteredPayments = useMemo(() => {
    const monthFiltered = filterByMonth(payments, selectedMonth, (item) => item.paid_at);
    if (!searchTerm.trim()) return monthFiltered;
    const normalized = searchTerm.trim().toLowerCase();
    return monthFiltered.filter((payment) => {
      const student = payment.student_id
        ? students.find((item) => item.id === payment.student_id)
        : undefined;
      const group = payment.group_id ? groups.find((item) => item.id === payment.group_id) : undefined;
      const haystack = `${student?.full_name ?? ''} ${group?.name ?? ''}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [payments, selectedMonth, searchTerm, students, groups]);

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const uniqueStudents = useMemo(() => {
    const ids = filteredPayments
      .map((payment) => payment.student_id)
      .filter((id): id is string => Boolean(id));
    return new Set(ids).size;
  }, [filteredPayments]);

  const insights = useSmartInsights(filteredPayments, expenses);

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingPayment(null);
    setEditingStudent(null);
    setEditingGroup(null);
  };

  const handleDelete = async (payment: PaymentEntity) => {
    const confirmDelete = window.confirm('هل أنت متأكد من حذف هذه الدفعة؟');
    if (!confirmDelete) return;
    setDeletingId(payment.id);
    try {
      await deletePayment(payment.id);
      setPayments((current) => current.filter((item) => item.id !== payment.id));
      toast.success('تم حذف الدفعة بنجاح');
      void refresh();
    } catch (error) {
      console.error(error);
      toast.error('تعذر حذف الدفعة، حاول مرة أخرى');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (payment: PaymentEntity) => {
    const student = payment.student_id ? students.find((item: Student) => item.id === payment.student_id) ?? null : null;
    const group = payment.group_id ? groups.find((item: Group) => item.id === payment.group_id) ?? null : null;
    setEditingPayment(payment);
    setEditingStudent(student);
    setEditingGroup(group);
    setIsDialogOpen(true);
  };

  const handleCreateClick = () => {
    setEditingPayment(null);
    setEditingStudent(null);
    setEditingGroup(null);
    setIsDialogOpen(true);
  };

  const exportToExcel = () => {
    const header = ['الطالب', 'المجموعة', 'المبلغ', 'التاريخ', 'طريقة الدفع', 'ملاحظات'];
    const rows = filteredPayments.map((payment) => {
      const student = payment.student_id ? students.find((item) => item.id === payment.student_id) : null;
      const group = payment.group_id ? groups.find((item) => item.id === payment.group_id) : null;
      return [
        student?.full_name ?? '—',
        group?.name ?? '—',
        egp(payment.amount),
        formatDate(payment.paid_at),
        payment.method === 'cash' ? 'نقدي' : payment.method === 'card' ? 'بطاقة' : 'تحويل',
        payment.note ?? ''
      ];
    });
    const csvContent = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'payments-report.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('تم تصدير كشف الحساب إلى ملف Excel');
  };

  const exportToPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('تعذر فتح نافذة الطباعة، تحقق من إعدادات المتصفح');
      return;
    }
    const rows = filteredPayments
      .map((payment, index) => {
        const student = payment.student_id ? students.find((item) => item.id === payment.student_id) : null;
        const group = payment.group_id ? groups.find((item) => item.id === payment.group_id) : null;
        return `<tr>
          <td>${index + 1}</td>
          <td>${student?.full_name ?? '—'}</td>
          <td>${group?.name ?? '—'}</td>
          <td>${egp(payment.amount)}</td>
          <td>${formatDate(payment.paid_at)}</td>
          <td>${payment.method === 'cash' ? 'نقدي' : payment.method === 'card' ? 'بطاقة' : 'تحويل'}</td>
          <td>${payment.note ?? ''}</td>
        </tr>`;
      })
      .join('');
    printWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
      <title>تقرير الدفعات</title>
      <style>
        body { font-family: 'Cairo', sans-serif; padding: 24px; background: #0A192F; color: #CCD6F6; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid rgba(255,255,255,0.2); padding: 8px; text-align: right; }
        th { background: #172A46; }
      </style>
    </head><body>
      <h1>كشف الدفعات</h1>
      <p>إجمالي المبالغ: ${egp(totalAmount)}</p>
      <table><thead><tr>
        <th>#</th><th>الطالب</th><th>المجموعة</th><th>المبلغ</th><th>التاريخ</th><th>الطريقة</th><th>ملاحظات</th>
      </tr></thead><tbody>${rows}</tbody></table>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    toast.success('يمكنك حفظ التقرير كملف PDF من نافذة الطباعة');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="كشف الحساب"
        description="إدارة الدفعات، البحث اللحظي، والتصدير إلى Excel أو PDF"
        actions={
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              onClick={handleCreateClick}
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
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 rounded-xl border border-green-700/50 px-4 py-3 font-semibold text-green-400 transition hover:bg-green-700/10"
            >
              <FileSpreadsheet className="h-4 w-4" />
              تصدير XLSX
            </button>
            <button
              onClick={exportToPdf}
              className="flex items-center gap-2 rounded-xl border border-red-500/50 px-4 py-3 font-semibold text-red-300 transition hover:bg-red-500/10"
            >
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
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-brand-secondary">
                    جاري تحميل الدفعات...
                  </td>
                </tr>
              ) : filteredPayments.length ? (
                filteredPayments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    student={payment.student_id ? students.find((student) => student.id === payment.student_id) : undefined}
                    group={payment.group_id ? groups.find((group) => group.id === payment.group_id) : undefined}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    deleting={deletingId === payment.id}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12">
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
                  <td className="px-4 py-3" colSpan={4}>
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
                  ? 'border-green-700/40 bg-green-900/20 text-green-200'
                  : insight.tone === 'warning'
                  ? 'border-red-500/40 bg-red-900/30 text-red-200'
                  : 'border-brand-gold/30 bg-brand-gold/10 text-brand-light'
              }`}
            >
              <p className="text-base font-semibold">{insight.title}</p>
              <p className="mt-2 text-brand-light/80">{insight.description}</p>
            </div>
          ))}
        </div>
      </Modal>

      <PaymentDialog
        isOpen={isDialogOpen}
        mode={editingPayment ? 'edit' : 'create'}
        initialPayment={editingPayment}
        initialStudent={editingStudent}
        initialGroup={editingGroup}
        onClose={handleDialogClose}
        onSuccess={({ payment, student, action }) => {
          setPayments((current) => {
            const normalized = augmentPayment(payment);
            if (action === 'update') {
              return current.map((item) => (item.id === payment.id ? normalized : item));
            }
            const withoutCurrent = current.filter((item) => item.id !== payment.id);
            return [normalized, ...withoutCurrent];
          });

          if (student) {
            setStudents((current) => {
              const exists = current.some((item) => item.id === student.id);
              return exists
                ? current.map((item) => (item.id === student.id ? student : item))
                : [...current, student];
            });
          }

          void refresh();
        }}
      />
    </div>
  );
};

export default Payments;
