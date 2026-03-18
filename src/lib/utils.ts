/**
 * Format a number as a currency string.
 * @param amount - numeric amount
 * @param currency - ISO currency code, e.g. "USD"
 * @returns formatted string e.g. "$50.00"
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

/**
 * Format a date string "YYYY-MM-DD" as "MM/DD/YYYY".
 * @param date - ISO date string
 * @returns formatted date
 */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${m}/${d}/${y}`;
}
