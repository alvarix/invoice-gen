import { supabase } from '$lib/server/supabase';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const PURGE_DAYS = 90;

export const load: PageServerLoad = async () => {
  // Purge invoices trashed more than 90 days ago
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PURGE_DAYS);

  const { data: expired } = await supabase
    .from('invoices')
    .select('id')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff.toISOString());

  if (expired && expired.length > 0) {
    const ids = expired.map((r) => r.id);
    await supabase.from('line_items').delete().in('invoice_id', ids);
    await supabase.from('invoices').delete().in('id', ids);
  }

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*, clients(name, slug)')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) console.error('Failed to load trash:', error);

  return { invoices: invoices ?? [] };
};

export const actions: Actions = {
  /**
   * Restore an invoice from trash by clearing deleted_at.
   * @param request - form data containing invoice_id
   */
  restore: async ({ request }) => {
    const data = await request.formData();
    const invoiceId = data.get('invoice_id') as string;
    if (!invoiceId) return fail(400, { error: 'Missing invoice ID' });

    const { error } = await supabase
      .from('invoices')
      .update({ deleted_at: null })
      .eq('id', invoiceId);
    if (error) return fail(500, { error: 'Failed to restore invoice' });
  },

  /**
   * Permanently delete an invoice and its line items from trash.
   * @param request - form data containing invoice_id
   */
  purge: async ({ request }) => {
    const data = await request.formData();
    const invoiceId = data.get('invoice_id') as string;
    if (!invoiceId) return fail(400, { error: 'Missing invoice ID' });

    await supabase.from('line_items').delete().eq('invoice_id', invoiceId);
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
    if (error) return fail(500, { error: 'Failed to delete invoice' });
  }
};
