import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, BellRing, CalendarRange, Download, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { filterByMonth, formatCurrency, egp } from '../utils/format';
import { useAppData } from '../contexts/AppDataContext';
import { getGroupBalance, type GroupBalance } from '../features/payments/api';

const monthNames = new Intl.DateTimeFormat('ar-EG', { month: 'long' });

const Dashboard = () => {
  const navigate = useNavigate();
  const { payments, expenses, students, groups, loading } = useAppData();
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [reminderDays, setReminderDays] = useState(3);
  const [balances, setBalances] = useState<Record<string, GroupBalance>>({});

  useEffect(() => {
    let active = true;
    if (!groups.length) {
      setBalances({});
      return;
    }

    (async () => {
      try {
        const entries = await Promise.all(
          groups.map(async (group) => {
            const balance = await getGroupBalance(group.id);
            return [group.id, balance] as const;
          })
        );
        if (active) {
          setBalances(Object.fromEntries(entries));
        }
      } catch (error) {
        console.error(error);
        if (active) {
          setBalances({});
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [groups]);

  const {
    netIncome,
    totalIncome,
    totalExpenses,
    payingStudents,
    groupsWithDebt,
    latestPayments
  } = useMemo(() => {
    const filteredPayments = filterByMonth(payments, selectedMonth, (payment) => payment.paid_at);
    const filteredExpenses = filterByMonth(expenses, selectedMonth, (expense) => expense.spent_at);

    const totalIncomeValue = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalExpensesValue = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netIncomeValue = totalIncomeValue - totalExpensesValue;

    const payingStudentsSet = new Set(
      filteredPayments
        .map((payment) => payment.student_id)
        .filter((id): id is string => Boolean(id))
    );

    const groupsWithDebtValue = groups
      .map((group) => ({ group, balance: balances[group.id] }))
      .filter(({ balance }) => (balance?.remaining ?? 0) > 0)
      .sort((a, b) => (b.balance?.remaining ?? 0) - (a.balance?.remaining ?? 0))
      .slice(0, 5);

    const latestPaymentsValue = [...filteredPayments]
      .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
      .slice(0, 5);

    return {
      totalIncome: totalIncomeValue,
      totalExpenses: totalExpensesValue,
      netIncome: netIncomeValue,
      payingStudents: payingStudentsSet.size,
      groupsWithDebt: groupsWithDebtValue,
      latestPayments: latestPaymentsValue
    };
  }, [payments, expenses, groups, balances, selectedMonth]);

  const months = useMemo(() => {
    const allMonths = new Set(
      payments
        .map((payment) => new Date(payment.paid_at))
        .map((date) => `${date.getMonth() + 1}`.padStart(2, '0'))
    );
    return ['all', ...Array.from(allMonths)];
  }, [payments]);

  const handleExportDashboard = () => {
    const summary = `ملخص لوحة التحكم\n\nإجمالي الدخل: ${egp(totalIncome)}\nإجمالي المصروفات: ${egp(totalExpenses)}\nصافي الدخل: ${egp(netIncome)}\nعدد الطلاب الدافعين: ${payingStudents}`;
    const blob = new Blob(['\uFEFF' + summary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dashboard-summary.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenPaymentDialog = () => {
    navigate('/payments', { state: { openDialog: true } });
  };

  const handleGoToPayments = () => {
    navigate('/payments');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="لوحة التحكم الرئيسية"
        description="نظرة شاملة على الدخل والمصروفات وحالة الطلاب خلال الفترة المختارة"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-xl border border-white/10 bg-brand-navy/80 px-4 py-3 text-sm text-brand-light focus:border-brand-gold focus:outline-none"
            >
              <option value="all">كل الشهور</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {month === 'all'
                    ? 'كل الشهور'
                    : monthNames.format(new Date(new Date().getFullYear(), Number(month) - 1, 1))}
                </option>
              ))}
            </select>
            <button
              onClick={handleExportDashboard}
              className="flex items-center gap-2 rounded-xl border border-brand-gold/50 px-4 py-3 text-sm font-semibold text-brand-gold transition hover:bg-brand-gold/10"
            >
              <Download className="h-4 w-4" />
              تصدير لوحة التحكم
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="rounded-2xl border border-white/5 bg-brand-navy/40 p-6 text-center text-brand-secondary">
          جاري تحميل البيانات الفعلية من Supabase...
        </div>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="صافي الدخل"
          value={formatCurrency(netIncome)}
          tone="highlight"
          icon={<ArrowUpRight className="h-10 w-10" />}
          description="بعد خصم كافة المصروفات المسجلة"
        />
        <StatCard
          title="إجمالي الدخل"
          value={formatCurrency(totalIncome)}
          icon={<ArrowDownToLine className="h-10 w-10" />}
          description="حاصل كل الدفعات خلال الفترة"
        />
        <StatCard
          title="إجمالي المصروفات"
          value={formatCurrency(totalExpenses)}
          tone="warning"
          icon={<CalendarRange className="h-10 w-10" />}
          description="يشمل المصاريف التشغيلية المتنوعة"
        />
        <StatCard
          title="عدد الطلاب الدافعين"
          value={`${payingStudents} / ${students.length}`}
          icon={<Users className="h-10 w-10" />}
          description="عدد الطلاب الذين أتموا السداد بالكامل"
        />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <StatCard
          title="إضافة دفعة جديدة"
          value=""
          tone="highlight"
          action={
            <button
              onClick={handleOpenPaymentDialog}
              className="w-full rounded-xl bg-brand-gold px-4 py-3 text-sm font-bold text-brand-blue transition hover:bg-brand-gold/90"
            >
              إضافة دفعة جديدة
            </button>
          }
          description="سجل دفعة لطالب أو مجموعة جديدة"
        />
        <StatCard
          title="عرض كشف الحساب"
          value=""
          action={
            <button
              onClick={handleGoToPayments}
              className="w-full rounded-xl border border-brand-gold px-4 py-3 text-sm font-bold text-brand-gold transition hover:bg-brand-gold/10"
            >
              الانتقال إلى كشف الحساب
            </button>
          }
          description="اطلع على الدفعات السابقة وعمليات التصدير"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-brand-navy/60 p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-brand-light">إعدادات التذكير بالدفع</h2>
              <p className="mt-2 text-sm text-brand-secondary">
                حدد عدد الأيام قبل موعد الدفع لإرسال التذكيرات التلقائية للطلاب.
              </p>
            </div>
            <BellRing className="h-10 w-10 text-brand-gold" />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm">
              <span>عدد الأيام</span>
              <input
                type="number"
                min={1}
                max={14}
                value={reminderDays}
                onChange={(event) => setReminderDays(Number(event.target.value))}
                className="w-20 rounded-lg border border-white/10 bg-brand-navy/60 px-3 py-2 text-brand-light focus:border-brand-gold focus:outline-none"
              />
            </div>
            <div className="text-sm text-brand-secondary">
              سيتم إرسال التذكيرات قبل {reminderDays} أيام من موعد الدفع المحدد لكل طالب.
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-red-500/30 bg-red-900/20 p-6 shadow-soft">
            <h3 className="text-lg font-bold text-red-200">مجموعات عليها مستحقات</h3>
            <p className="mt-2 text-sm text-red-200/80">أقسام لم تسدد كامل المبلغ المستهدف حتى الآن.</p>
            <div className="mt-4 space-y-3 text-sm">
              {groupsWithDebt.length ? (
                groupsWithDebt.map(({ group, balance }) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3"
                  >
                    <span>{group.name}</span>
                    <span>{balance ? egp(balance.remaining) : egp(0)}</span>
                  </div>
                ))
              ) : (
                <EmptyState title="لا توجد مستحقات" description="تم سداد جميع المبالغ للمجموعات الحالية." />
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-brand-gold/40 bg-brand-gold/10 p-6 shadow-soft">
            <h3 className="text-lg font-bold text-brand-light">دفعات مسجلة حديثًا</h3>
            <p className="mt-2 text-sm text-brand-secondary">أحدث الدفعات التي تمت إضافتها للنظام.</p>
            <div className="mt-4 space-y-3 text-sm">
              {latestPayments.length ? (
                latestPayments.map((payment) => {
                  const student = payment.student_id
                    ? students.find((item) => item.id === payment.student_id)
                    : null;
                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-xl border border-brand-gold/30 bg-brand-blue/60 px-4 py-3"
                    >
                      <span>{student?.full_name ?? 'دفعة على مستوى المجموعة'}</span>
                      <span>{formatCurrency(payment.amount)}</span>
                    </div>
                  );
                })
              ) : (
                <EmptyState title="لا توجد دفعات" description="سجل دفعة جديدة لعرض آخر العمليات هنا." />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
