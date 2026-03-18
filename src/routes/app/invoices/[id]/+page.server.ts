import { supabase } from '$lib/server/supabase';
import { sendInvoiceEmail } from '$lib/server/brevo';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { data: invoice } = await supabase
    .from('invoices').select('*, clients(*)').eq('id', params.id).single();
  if (!invoice) error(404);

  const { data: items } = await supabase
    .from('line_items').select('*').eq('invoice_id', params.id).order('sort_order');

  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();

  return { invoice, items: items ?? [], settings };
};

export const actions: Actions = {
  /**
   * Update invoice status (draft -> sent -> paid).
   * Automatically sets paid_date when marking as paid.
   */
  updateStatus: async ({ request, params }) => {
    const data = await request.formData();
    const status = data.get('status') as string;
    const update: Record<string, string> = { status };
    if (status === 'paid') update.paid_date = new Date().toISOString().split('T')[0];
    await supabase.from('invoices').update(update).eq('id', params.id);
  },

  /**
   * Replace all line items for a draft invoice and recalculate totals.
   * Only allowed while status is 'draft'.
   */
  updateLineItems: async ({ request, params }) => {
    const { data: invoice } = await supabase
      .from('invoices').select('status').eq('id', params.id).single();
    if (invoice?.status !== 'draft') return fail(400, { error: 'Can only edit draft invoices' });

    const data = await request.formData();
    const itemsJson = data.get('items') as string;
    const items = JSON.parse(itemsJson);

    await supabase.from('line_items').delete().eq('invoice_id', params.id);
    await supabase.from('line_items').insert(
      items.map((item: Record<string, unknown>, i: number) => ({ ...item, invoice_id: params.id, sort_order: i }))
    );

    const { calculateTotals } = await import('$lib/server/invoice');
    const { data: inv } = await supabase.from('invoices').select('tax_rate').eq('id', params.id).single();
    if (!inv) return fail(500, { error: 'Invoice not found' });
    const totals = calculateTotals(items, inv.tax_rate);
    await supabase.from('invoices').update(totals).eq('id', params.id);
  },

  /**
   * Send invoice email to client via Brevo and mark invoice as sent.
   * Requires client to have an email address on record.
   */
  sendEmail: async ({ params, url }) => {
    const { data: invoice } = await supabase
      .from('invoices').select('*, clients(*)').eq('id', params.id).single();
    if (!invoice?.clients?.email) return fail(400, { error: 'Client has no email' });

    const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
    const publicUrl = `${url.origin}/invoices/${invoice.public_token}`;

    await sendInvoiceEmail(
      invoice.clients.email,
      invoice.clients.name,
      invoice.invoice_number,
      publicUrl,
      settings?.owner_name ?? 'Alvar Sirlin'
    );

    await supabase.from('invoices').update({ status: 'sent' }).eq('id', params.id);
  }
};
