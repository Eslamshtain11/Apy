import { useMemo, useState } from 'react';
import { LogOut, School, Search } from 'lucide-react';
import { payments } from '../data/mockData';
import { filterByMonth, formatCurrency, formatDate } from '../utils/format';

const GuestView = () => {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const filteredPayments = useMemo(
    () => filterByMonth(payments, selectedMonth, (payment) => payment.paid_at),
    [selectedMonth]
  );
  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="min-h-screen bg-brand-blue text-brand-light">
      <header className="border-b border-white/5 bg-brand-navy/80 px-6 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-gold/50 bg-brand-blue/80 text-brand-gold">
              <School className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm text-brand-secondary">واجهة الضيوف</p>
              <h1 className="text-2xl font-black text-brand-gold">المحاسب الشخصي</h1>
            </div>
          </div>
          <button className="flex items-center justify-center gap-2 rounded-xl border border-red-500/40 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10">
            <LogOut className="h-4 w-4" />
            خروج
          </button>
        </div>
      </header>
      <main className="px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="rounded-2xl border border-white/5 bg-brand-navy/50 p-6 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-brand-light">إجمالي دخل الشهر المحدد</h2>
                <p className="mt-2 text-sm text-brand-secondary">
                  بيانات للعرض فقط بدون صلاحيات للتعديل أو التصدير.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="rounded-xl border border-white/10 bg-brand-blue/60 px-4 py-3 text-sm text-brand-light focus:border-brand-gold focus:outline-none"
                >
                  <option value="all">كل الشهور</option>
                  {Array.from({ length: 12 }).map((_, index) => (
                    <option key={index} value={String(index + 1).padStart(2, '0')}>
                      {new Intl.DateTimeFormat('ar-EG', { month: 'long' }).format(
                        new Date(new Date().getFullYear(), index, 1)
                      )}
                    </option>
                  ))}
                </select>
                <div className="rounded-xl border border-brand-gold/40 bg-brand-gold/10 px-5 py-3 text-lg font-bold text-brand-gold">
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-brand-navy/40 p-6 shadow-soft">
            <div className="mb-4 flex items-center gap-3 text-sm text-brand-secondary">
              <Search className="h-4 w-4" />
              البيانات التالية تعرض أرقامًا إجمالية دون كشف أسماء الطلاب.
            </div>
            <table className="min-w-full text-right">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-brand-secondary">
                  <th className="px-4 py-3">الطالب</th>
                  <th className="px-4 py-3">المبلغ</th>
                  <th className="px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment, index) => (
                  <tr key={payment.id} className="border-b border-white/5 hover:bg-brand-navy/40">
                    <td className="px-4 py-4 text-sm text-brand-light">طالب {index + 1}</td>
                    <td className="px-4 py-4 text-sm text-brand-light">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-4 text-sm text-brand-secondary">{formatDate(payment.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-brand-gold/10 text-sm font-semibold text-brand-light">
                  <td className="px-4 py-3">الإجمالي</td>
                  <td className="px-4 py-3">{formatCurrency(totalAmount)}</td>
                  <td className="px-4 py-3">{filteredPayments.length} دفعات</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GuestView;
