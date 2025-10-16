import { useMemo } from 'react';
import type { Expense } from '../../types/db';
import type { PaymentEntity } from '../payments/api';
import { formatCurrency } from '../../utils/format';

type Insight = {
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'info';
};

const toneByDifference = (difference: number): Insight['tone'] => {
  if (difference > 0.1) return 'success';
  if (difference < -0.05) return 'warning';
  return 'info';
};

export const useSmartInsights = (payments: Pick<PaymentEntity, 'amount' | 'paid_at'>[], expenses: Expense[]) => {
  return useMemo<Insight[]>(() => {
    if (!payments.length) {
      return [
        {
          title: 'لا توجد بيانات كافية',
          description: 'أضف بعض الدفعات أولًا للحصول على تحليلات ذكية.',
          tone: 'info'
        }
      ];
    }

    const currentMonth = new Date().getMonth() + 1;
    const monthlyIncome = payments
      .filter((payment) => new Date(payment.paid_at).getMonth() + 1 === currentMonth)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const previousIncome = payments
      .filter((payment) => new Date(payment.paid_at).getMonth() + 1 === currentMonth - 1)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const expensesTotal = expenses
      .filter((expense) => new Date(expense.spent_at).getMonth() + 1 === currentMonth)
      .reduce((sum, expense) => sum + expense.amount, 0);

    const difference = previousIncome
      ? (monthlyIncome - previousIncome) / previousIncome
      : 0;

    return [
      {
        title: 'تحليل الدخل الشهري',
        description:
          previousIncome === 0
            ? `دخل هذا الشهر بلغ ${formatCurrency(monthlyIncome)}. تابع جمع البيانات للشهور السابقة لتحليل أعمق.`
            : `دخل هذا الشهر بلغ ${formatCurrency(monthlyIncome)} بزيادة ${Math.round(
                difference * 100
              )}% مقارنة بالشهر السابق.`,
        tone: toneByDifference(difference)
      },
      {
        title: 'نقطة التعادل',
        description:
          expensesTotal === 0
            ? 'لا توجد مصروفات مسجلة لهذا الشهر. تأكد من تسجيل مصروفات التشغيل لتحليل أكثر دقة.'
            : `صافي الدخل بعد خصم المصروفات هو ${formatCurrency(
                monthlyIncome - expensesTotal
              )}. حاول الحفاظ على فارق إيجابي لا يقل عن 35%.`,
        tone: monthlyIncome > expensesTotal ? 'success' : 'warning'
      },
      {
        title: 'اقتراح تحسين',
        description:
          difference < 0
            ? 'انخفاض في الدخل مقارنة بالشهر الماضي. راجع حضور الطلاب وذكّر المتأخرين بالدفع.'
            : 'استمر في الاستفادة من التذكير التلقائي للدفع لتعزيز انتظام التحصيل.',
        tone: difference < 0 ? 'warning' : 'info'
      }
    ];
  }, [expenses, payments]);
};
