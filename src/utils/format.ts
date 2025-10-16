export const egp = (value: number) =>
  new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP'
  }).format(value || 0);

export const formatCurrency = egp;

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(value));

export const getMonthKey = (value: string) => new Date(value).getMonth() + 1;

export const filterByMonth = <T>(
  items: T[],
  month?: string,
  getDate: (item: T) => string = (item: any) => (item?.date as string) ?? ''
) => {
  if (!month || month === 'all') return items;
  const numericMonth = parseInt(month, 10);
  return items.filter((item) => {
    const dateValue = getDate(item);
    if (!dateValue) return false;
    return getMonthKey(dateValue) === numericMonth;
  });
};
