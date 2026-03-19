import { supabase } from '$lib/server/supabase';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const clientId = url.searchParams.get('client');
  const status = url.searchParams.get('status');

  let query = supabase
    .from('invoices')
    .select('*, clients(name, slug)')
    .order('created_at', { ascending: false });

  if (clientId) query = query.eq('client_id', clientId);
  if (status) query = query.eq('status', status);

  const { data: invoices, error: invoicesError } = await query;
  if (invoicesError) console.error('Failed to load invoices:', invoicesError);

  const { data: clients, error: clientsError } = await supabase.from('clients').select('id, name').order('name');
  if (clientsError) console.error('Failed to load clients:', clientsError);

  return {
    invoices: invoices ?? [],
    clients: clients ?? [],
    activeClient: clientId ?? '',
    activeStatus: status ?? ''
  };
};

export const actions: Actions = {
  /**
   * Delete an invoice and its line items.
   * @param request - form data containing invoice_id
   */
  deleteInvoice: async ({ request }) => {
    const data = await request.formData();
    const invoiceId = data.get('invoice_id') as string;
    if (!invoiceId) return fail(400, { error: 'Missing invoice ID' });

    // Delete line items first (FK constraint)
    const { error: itemsError } = await supabase
      .from('line_items').delete().eq('invoice_id', invoiceId);
    if (itemsError) {
      console.error('Failed to delete line items:', itemsError);
      return fail(500, { error: 'Failed to delete line items' });
    }

    const { error: invoiceError } = await supabase
      .from('invoices').delete().eq('id', invoiceId);
    if (invoiceError) {
      console.error('Failed to delete invoice:', invoiceError);
      return fail(500, { error: 'Failed to delete invoice' });
    }
  }
};
