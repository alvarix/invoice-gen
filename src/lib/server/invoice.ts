import type { LineItem } from '$lib/types';

/**
 * Generate invoice number from client slug and sequence.
 * @param slug - client slug e.g. "wmw"
 * @param seq - invoice sequence number
 * @returns invoice number e.g. "wmw-2026-2"
 */
export function generateInvoiceNumber(slug: string, seq: number): string {
  const year = new Date().getFullYear();
  return `${slug}-${year}-${seq}`;
}

/**
 * Calculate invoice totals from line items, tax rate, and optional service debit.
 * Debit is subtracted from subtotal before tax is applied.
 * @param items - array of line items with amount set
 * @param taxRate - decimal tax rate e.g. 0.15 for 15%
 * @param debitAmount - dollar amount to deduct before tax (default 0)
 * @returns subtotal, tax_amount, total
 */
export function calculateTotals(
  items: Pick<LineItem, 'amount'>[],
  taxRate: number,
  debitAmount = 0
) {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxable = Math.max(0, subtotal - debitAmount);
  const tax_amount = Math.round(taxable * taxRate * 100) / 100;
  const total = taxable + tax_amount;
  return { subtotal, tax_amount, total };
}
