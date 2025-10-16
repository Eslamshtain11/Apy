export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0
  }).format(value);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(value));

export const getMonthKey = (value: string) => new Date(value).getMonth() + 1;

export const filterByMonth = <T extends { date: string }>(items: T[], month?: string) => {
  if (!month || month === 'all') return items;
  const numericMonth = parseInt(month, 10);
  return items.filter((item) => getMonthKey(item.date) === numericMonth);
};
