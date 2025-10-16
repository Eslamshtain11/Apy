import { useMemo } from 'react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingDown, TrendingUp, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { payments, groups, students } from '../data/mockData';
import { egp } from '../utils/format';

const chartColors = ['#D4AF37', '#60A5FA', '#818CF8', '#34D399', '#F87171'];

const Analytics = () => {
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((payment) => {
      const date = new Date(payment.paid_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + payment.amount);
    });
    return Array.from(map.entries()).map(([key, total]) => {
      const [year, month] = key.split('-');
      const label = new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(
        new Date(Number(year), Number(month) - 1, 1)
      );
      return { key, label, total };
    });
  }, []);

  const groupedTotals = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((payment) => {
      const student = students.find((item) => item.id === payment.student_id);
      const group = groups.find((item) => item?.id === student?.group_id);
      if (!group) return;
      map.set(group.name, (map.get(group.name) ?? 0) + payment.amount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, []);

  const highestMonth = monthlyData.length
    ? monthlyData.reduce((prev, current) => (current.total > prev.total ? current : prev))
    : null;
  const lowestMonth = monthlyData.length
    ? monthlyData.reduce((prev, current) => (current.total < prev.total ? current : prev))
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="الإحصاءات المتقدمة"
        description="تحليلات شاملة للدخل حسب الشهور والمجموعات الدراسية"
      />

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="أعلى شهر دخلًا"
          value={highestMonth ? egp(highestMonth.total) : '—'}
          description={highestMonth?.label ?? 'لا توجد بيانات'}
          icon={<TrendingUp className="h-10 w-10" />}
        />
        <StatCard
          title="أقل شهر دخلًا"
          value={lowestMonth ? egp(lowestMonth.total) : '—'}
          description={lowestMonth?.label ?? 'لا توجد بيانات'}
          tone="warning"
          icon={<TrendingDown className="h-10 w-10" />}
        />
        <StatCard
          title="عدد المجموعات"
          value={`${groups.length} مجموعة`}
          icon={<Users className="h-10 w-10" />}
        />
        <StatCard
          title="عدد الدفعات"
          value={`${payments.length} دفعة`}
          icon={<Calendar className="h-10 w-10" />}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/5 bg-brand-navy/50 p-6 shadow-soft lg:col-span-3">
          <h2 className="text-xl font-bold text-brand-light">إجمالي الدخل لكل شهر</h2>
          <p className="mt-2 text-sm text-brand-secondary">رسم بياني يوضح أداء الدخل على مدار العام الحالي.</p>
          <div className="mt-6 h-80">
            {monthlyData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" stroke="#8892B0" tickLine={false} angle={-10} height={60} interval={0} />
                  <YAxis stroke="#8892B0" tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#172A46',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#CCD6F6'
                    }}
                    formatter={(value: number) => egp(value)}
                  />
                  <Bar dataKey="total" radius={[12, 12, 0, 0]} fill="#D4AF37" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="mt-6">
                <EmptyState title="لا توجد بيانات" description="أضف دفعات لتظهر الإحصاءات الشهرية." />
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-brand-navy/50 p-6 shadow-soft lg:col-span-2">
          <h2 className="text-xl font-bold text-brand-light">نسبة مساهمة المجموعات</h2>
          <p className="mt-2 text-sm text-brand-secondary">
            رسم بياني يوضح نسبة مساهمة كل مجموعة في إجمالي الدخل.
          </p>
          <div className="mt-6 h-80">
            {groupedTotals.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={groupedTotals} dataKey="value" nameKey="name" innerRadius={70} outerRadius={120} paddingAngle={4}>
                    {groupedTotals.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#172A46',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#CCD6F6'
                    }}
                    formatter={(value: number, name: string) => [`${egp(value)} `, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="mt-6">
                <EmptyState title="لا توجد بيانات" description="لم يتم تسجيل دفعات للمجموعات الحالية بعد." />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Analytics;
