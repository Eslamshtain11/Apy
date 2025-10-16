import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import { formatCurrency, formatDate } from '../utils/format';
import { useAppData } from '../contexts/AppDataContext';

const StudentSearch = () => {
  const { students, payments, groups, loading } = useAppData();
  const [query, setQuery] = useState('');

  const matchedStudent = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return students[0];
    return students.find((student) => student.full_name.toLowerCase().includes(normalizedQuery));
  }, [query, students]);

  const studentPayments = useMemo(() => {
    if (!matchedStudent) return [];
    return payments.filter((payment) => payment.student_id === matchedStudent.id);
  }, [matchedStudent, payments]);

  const totalAmount = studentPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const groupId = matchedStudent?.group_id ?? null;
  const group = groupId ? groups.find((item) => item.id === groupId) : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="بحث الطالب"
        description="اعثر على سجل الدفع لأي طالب واستعرض تفاصيل الدفعات شهرًا بشهر"
      />

      <div className="rounded-2xl border border-white/5 bg-brand-navy/50 p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <Search className="h-6 w-6 text-brand-gold" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="اكتب اسم الطالب..."
            className="flex-1 rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-4 text-lg text-brand-light focus:border-brand-gold focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/5 bg-brand-navy/40 p-6 text-center text-brand-secondary">
          جاري تحميل بيانات الطلاب من Supabase...
        </div>
      ) : matchedStudent ? (
        <div className="space-y-6">
          <section className="grid gap-6 md:grid-cols-3">
            <StatCard
              title="الطالب"
              value={matchedStudent.full_name}
              description={group?.name ?? '—'}
            />
            <StatCard
              title="عدد الدفعات"
              value={`${studentPayments.length} دفعة`}
            />
            <StatCard
              title="إجمالي المبلغ"
              value={formatCurrency(totalAmount)}
              tone="highlight"
            />
          </section>

          <div className="rounded-2xl border border-white/5 bg-brand-navy/40 p-6 shadow-soft">
            <table className="min-w-full text-right">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-brand-secondary">
                  <th className="px-4 py-3">الشهر</th>
                  <th className="px-4 py-3">المبلغ</th>
                  <th className="px-4 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {studentPayments.length ? (
                  studentPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-white/5 hover:bg-brand-navy/40">
                      <td className="px-4 py-4 text-sm text-brand-secondary">{formatDate(payment.paid_at)}</td>
                      <td className="px-4 py-4 text-sm text-brand-light">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-4 text-sm text-brand-light">
                        <span className="rounded-full bg-green-900/40 px-3 py-1 text-xs font-semibold text-green-200">مدفوع</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-12">
                      <EmptyState title="لا توجد دفعات" description="لم يتم تسجيل أي دفعة لهذا الطالب بعد." />
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-brand-gold/10 text-sm font-semibold text-brand-light">
                  <td className="px-4 py-3">الإجمالي</td>
                  <td className="px-4 py-3">{formatCurrency(totalAmount)}</td>
                  <td className="px-4 py-3">{studentPayments.length} دفعات</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="لم يتم العثور على الطالب"
          description="حاول كتابة الاسم الكامل أو جزء منه للبحث ضمن السجلات."
        />
      )}
    </div>
  );
};

export default StudentSearch;
