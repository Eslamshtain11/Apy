import { useMemo, useState } from 'react';
import { FileSpreadsheet, PiggyBank, PlusCircle, ReceiptText, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { filterByMonth, formatCurrency, formatDate, egp } from '../utils/format';
import { useAppData } from '../contexts/AppDataContext';
import { createExpense, deleteExpense, updateExpense } from '../features/expenses/api';
import { toast } from 'sonner';

const monthFormatter = new Intl.DateTimeFormat('ar-EG', { month: 'long' });

const Expenses = () => {
  const { expenses, loading, setExpenses, refresh } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editableExpenseId, setEditableExpenseId] = useState<string | null>(null);
  const [formState, setFormState] = useState({ description: '', amount: 0, date: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    const monthFiltered = filterByMonth(expenses, selectedMonth, (expense) => expense.spent_at);
    if (!searchTerm.trim()) return monthFiltered;
    const normalized = searchTerm.trim().toLowerCase();
    return monthFiltered.filter((expense) => expense.description.toLowerCase().includes(normalized));
  }, [expenses, searchTerm, selectedMonth]);

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const monthOptions = useMemo(() => {
    const map = new Map<string, string>();
    expenses.forEach((expense) => {
      const date = new Date(expense.spent_at);
      const value = `${date.getMonth() + 1}`.padStart(2, '0');
      if (!map.has(value)) {
        map.set(value, monthFormatter.format(date));
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [expenses]);

  const openCreateModal = () => {
    setEditableExpenseId(null);
    setFormState({ description: '', amount: 0, date: new Date().toISOString().slice(0, 10) });
    setIsModalOpen(true);
  };

  const openEditModal = (id: string) => {
    const expense = expenses.find((item) => item.id === id);
    if (!expense) return;
    setEditableExpenseId(id);
    setFormState({ description: expense.description, amount: expense.amount, date: expense.spent_at });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formState.description.trim() || !formState.date || formState.amount <= 0) {
      toast.error('يرجى إدخال بيانات صحيحة للمصروف');
      return;
    }
    setSaving(true);
    try {
      if (editableExpenseId) {
        const updated = await updateExpense(editableExpenseId, {
          description: formState.description.trim(),
          amount: Number(formState.amount),
          spent_at: formState.date
        });
        setExpenses((items) => items.map((item) => (item.id === editableExpenseId ? updated : item)));
        toast.success('تم تحديث المصروف بنجاح');
      } else {
        const created = await createExpense({
          description: formState.description.trim(),
          amount: Number(formState.amount),
          spent_at: formState.date
        });
        setExpenses((items) => [created, ...items]);
        toast.success('تم إضافة المصروف بنجاح');
      }
      setIsModalOpen(false);
      void refresh();
    } catch (error) {
      console.error(error);
      toast.error('تعذر حفظ المصروف، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('هل تريد حذف هذا المصروف؟');
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await deleteExpense(id);
      setExpenses((items) => items.filter((item) => item.id !== id));
      toast.success('تم حذف المصروف');
      void refresh();
    } catch (error) {
      console.error(error);
      toast.error('تعذر حذف المصروف، حاول مرة أخرى');
    } finally {
      setDeletingId(null);
    }
  };

  const exportToExcel = () => {
    const header = ['الوصف', 'المبلغ', 'التاريخ'];
    const rows = filteredExpenses.map((expense) => [expense.description, egp(expense.amount), formatDate(expense.spent_at)]);
    const csvContent = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'expenses-report.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('تم تصدير المصروفات إلى ملف Excel');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="المصروفات"
        description="سجل مصروفاتك التشغيلية مع متابعة سريعة للاستهلاك الشهري"
        actions={
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-xl bg-brand-gold px-4 py-3 font-semibold text-brand-blue transition hover:bg-brand-gold/90"
            >
              <PlusCircle className="h-4 w-4" />
              إضافة مصروف
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 rounded-xl border border-green-700/50 px-4 py-3 font-semibold text-green-400 transition hover:bg-green-700/10"
            >
              <FileSpreadsheet className="h-4 w-4" />
              تصدير XLSX
            </button>
          </div>
        }
      />

      <section className="grid gap-6 md:grid-cols-3">
        <StatCard title="عدد المصروفات" value={`${filteredExpenses.length} عملية`} icon={<ReceiptText className="h-10 w-10" />} />
        <StatCard
          title="إجمالي المصروفات"
          value={formatCurrency(totalAmount)}
          tone="warning"
          icon={<PiggyBank className="h-10 w-10" />}
        />
        <StatCard
          title="متوسط الصرف"
          value={formatCurrency(filteredExpenses.length ? Math.round(totalAmount / filteredExpenses.length) : 0)}
          icon={<Search className="h-10 w-10" />}
        />
      </section>

      <div className="rounded-2xl border border-white/5 bg-brand-navy/40 p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm">
            <Search className="h-4 w-4 text-brand-secondary" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث بالوصف"
              className="flex-1 bg-transparent text-brand-light focus:outline-none"
            />
          </div>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm text-brand-light focus:border-brand-gold focus:outline-none"
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
                <th className="px-4 py-3">الوصف</th>
                <th className="px-4 py-3">المبلغ</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-brand-secondary">
                    جاري تحميل المصروفات...
                  </td>
                </tr>
              ) : filteredExpenses.length ? (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-white/5 hover:bg-brand-navy/40">
                    <td className="px-4 py-4 text-sm text-brand-light">{expense.description}</td>
                    <td className="px-4 py-4 text-sm text-brand-light">{formatCurrency(expense.amount)}</td>
                    <td className="px-4 py-4 text-sm text-brand-secondary">{formatDate(expense.spent_at)}</td>
                    <td className="px-4 py-4 text-sm text-brand-light">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditModal(expense.id)}
                          className="rounded-lg border border-blue-400/40 px-3 py-1 text-xs font-semibold text-blue-300 transition hover:bg-blue-400/10"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="rounded-lg border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingId === expense.id}
                        >
                          {deletingId === expense.id ? 'جارٍ الحذف' : 'حذف'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-12">
                    <EmptyState title="لا توجد مصروفات" description="أضف مصروفًا جديدًا لبدء المتابعة." />
                  </td>
                </tr>
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-brand-gold/10 text-sm font-semibold text-brand-light">
                  <td className="px-4 py-3">الإجمالي</td>
                  <td className="px-4 py-3">{egp(totalAmount)}</td>
                  <td className="px-4 py-3" colSpan={2}>
                    {filteredExpenses.length} مصروفات مسجلة
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editableExpenseId ? 'تعديل المصروف' : 'إضافة مصروف جديد'}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-brand-secondary transition hover:text-brand-light"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-xl bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-blue transition hover:bg-brand-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'جارٍ الحفظ...' : editableExpenseId ? 'حفظ التعديلات' : 'حفظ المصروف'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-brand-secondary">وصف المصروف</label>
            <input
              value={formState.description}
              onChange={(event) => setFormState((state) => ({ ...state, description: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
              placeholder="مثال: إيجار القاعة"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-brand-secondary">المبلغ (EGP)</label>
              <input
                type="number"
                min={0}
                step={50}
                value={formState.amount}
                onChange={(event) => setFormState((state) => ({ ...state, amount: Number(event.target.value) }))}
                className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-brand-secondary">تاريخ الصرف</label>
              <input
                type="date"
                value={formState.date}
                onChange={(event) => setFormState((state) => ({ ...state, date: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Expenses;
