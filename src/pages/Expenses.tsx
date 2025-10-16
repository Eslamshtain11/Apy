import { useMemo, useState } from 'react';
import { FileSpreadsheet, PiggyBank, PlusCircle, ReceiptText, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { expenses as initialExpenses } from '../data/mockData';
import { filterByMonth, formatCurrency, formatDate } from '../utils/format';

const Expenses = () => {
  const [expenseList, setExpenseList] = useState(initialExpenses);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editableExpenseId, setEditableExpenseId] = useState<string | null>(null);
  const [formState, setFormState] = useState({ description: '', amount: 0, date: '' });

  const filteredExpenses = useMemo(() => {
    const monthFiltered = filterByMonth(expenseList, selectedMonth);
    if (!searchTerm) return monthFiltered;
    return monthFiltered.filter((expense) => expense.description.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [expenseList, searchTerm, selectedMonth]);

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const openCreateModal = () => {
    setEditableExpenseId(null);
    setFormState({ description: '', amount: 0, date: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (id: string) => {
    const expense = expenseList.find((item) => item.id === id);
    if (!expense) return;
    setEditableExpenseId(id);
    setFormState({ description: expense.description, amount: expense.amount, date: expense.date });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formState.description || !formState.date || !formState.amount) return;
    if (editableExpenseId) {
      setExpenseList((items) =>
        items.map((item) => (item.id === editableExpenseId ? { ...item, ...formState } : item))
      );
    } else {
      setExpenseList((items) => [
        ...items,
        {
          id: `exp-${Date.now()}`,
          ...formState
        }
      ]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setExpenseList((items) => items.filter((item) => item.id !== id));
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
            <button className="flex items-center gap-2 rounded-xl border border-green-700/50 px-4 py-3 font-semibold text-green-400 transition hover:bg-green-700/10">
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
                <th className="px-4 py-3">الوصف</th>
                <th className="px-4 py-3">المبلغ</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length ? (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-white/5 hover:bg-brand-navy/40">
                    <td className="px-4 py-4 text-sm text-brand-light">{expense.description}</td>
                    <td className="px-4 py-4 text-sm text-brand-light">{formatCurrency(expense.amount)}</td>
                    <td className="px-4 py-4 text-sm text-brand-secondary">{formatDate(expense.date)}</td>
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
                          className="rounded-lg border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-12">
                    <EmptyState title="لا توجد مصروفات" description="لم يتم العثور على مصروفات للفترة المحددة." />
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-brand-gold/10 text-sm font-semibold text-brand-light">
                <td className="px-4 py-3">الإجمالي</td>
                <td className="px-4 py-3">{formatCurrency(totalAmount)}</td>
                <td className="px-4 py-3" colSpan={2}>
                  {filteredExpenses.length} عملية
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Modal
        title={editableExpenseId ? 'تعديل المصروف' : 'إضافة مصروف جديد'}
        description="أدخل تفاصيل المصروف ضمن القالب التالي"
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
          <span>الوصف</span>
          <input
            value={formState.description}
            onChange={(event) => setFormState((state) => ({ ...state, description: event.target.value }))}
            className="rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none"
            placeholder="مثال: إيجار القاعة"
          />
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
      </Modal>
    </div>
  );
};

export default Expenses;
