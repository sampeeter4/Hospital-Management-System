/**
 * Formats a numeric value into INR currency string.
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '₹0.00'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Standard date formatter for hospital records.
 */
export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

