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
 * Calculate invoice totals from line items and tax rate.
 * @param items - array of line items with amount set
 * @param taxRate - decimal tax rate e.g. 0.15 for 15%
 * @returns subtotal, tax_amount, total
 */
export function calculateTotals(items: Pick<LineItem, 'amount'>[], taxRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax_amount = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + tax_amount;
  return { subtotal, tax_amount, total };
}
