import { supabase } from '$lib/server/supabase';
import { sendInvoiceEmail } from '$lib/server/brevo';
import { env } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';
import { marked } from 'marked';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { data: invoice } = await supabase
    .from('invoices').select('*, clients(*)').eq('id', params.id).is('deleted_at', null).single();
  if (!invoice) error(404);

  const { data: items } = await supabase
    .from('line_items').select('*').eq('invoice_id', params.id).order('sort_order');

  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
  const notesHtml = invoice.notes ? marked.parse(invoice.notes) as string : null;

  return { invoice, items: items ?? [], settings: settings ?? { id: 1, owner_name: null, address: null, zelle: null, logo_url: null }, notesHtml };
};

export const actions: Actions = {
  /**
   * Update invoice status (draft -> sent -> paid).
   * Automatically sets paid_date when marking as paid.
   */
  updateStatus: async ({ request, params }) => {
    const data = await request.formData();
    const status = data.get('status') as string;
    const allowed = ['draft', 'sent', 'paid'];
    if (!allowed.includes(status)) return fail(400, { error: 'Invalid status' });
    const update: Record<string, string> = { status };
    if (status === 'paid') update.paid_date = new Date().toISOString().split('T')[0];
    const { error: updateError } = await supabase.from('invoices').update(update).eq('id', params.id);
    if (updateError) return fail(500, { error: 'Failed to update status' });
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
    if (!itemsJson) return fail(400, { error: 'No items provided' });
    const items = JSON.parse(itemsJson);

    // delete is fire-and-forget; insert result is checked below
    await supabase.from('line_items').delete().eq('invoice_id', params.id);
    const { error: insertError } = await supabase.from('line_items').insert(
      items.map((item: Record<string, unknown>, i: number) => ({ ...item, invoice_id: params.id, sort_order: i }))
    );
    if (insertError) return fail(500, { error: 'Failed to save line items' });

    const { calculateTotals } = await import('$lib/server/invoice');
    const { data: inv } = await supabase.from('invoices').select('tax_rate').eq('id', params.id).single();
    if (!inv) return fail(500, { error: 'Invoice not found' });
    const totals = calculateTotals(items, inv.tax_rate);
    await supabase.from('invoices').update(totals).eq('id', params.id);
  },

  /**
   * Update the invoice number field.
   * @param request - form data containing invoice_number
   * @param params - route params with invoice id
   */
  updateInvoiceNumber: async ({ request, params }) => {
    const data = await request.formData();
    const invoice_number = (data.get('invoice_number') as string)?.trim();
    if (!invoice_number) return fail(400, { error: 'Invoice number required' });
    const { error: updateError } = await supabase
      .from('invoices').update({ invoice_number }).eq('id', params.id);
    if (updateError) return fail(500, { error: 'Failed to update invoice number' });
  },

  /**
   * Save service agreement debit hours and recalculate totals.
   * debit_amount = debit_hours × client hourly_rate
   * Tax is applied to (subtotal - debit_amount).
   */
  updateDebit: async ({ request, params }) => {
    const data = await request.formData();
    const debit_hours = Math.max(0, Number(data.get('debit_hours')) || 0);

    const { data: invoice } = await supabase
      .from('invoices')
      .select('subtotal, tax_rate, client_id')
      .eq('id', params.id)
      .single();
    if (!invoice) return fail(404, { error: 'Invoice not found' });

    const { data: client } = await supabase
      .from('clients')
      .select('hourly_rate')
      .eq('id', invoice.client_id)
      .single();
    if (!client) return fail(404, { error: 'Client not found' });

    const debit_amount = Math.round(debit_hours * client.hourly_rate * 100) / 100;
    const taxable = Math.max(0, invoice.subtotal - debit_amount);
    const tax_amount = Math.round(taxable * invoice.tax_rate * 100) / 100;
    const total = taxable + tax_amount;

    const { error: err } = await supabase
      .from('invoices')
      .update({ debit_hours, debit_amount, tax_amount, total })
      .eq('id', params.id);
    if (err) return fail(500, { error: err.message });
  },

  /**
   * Save optional markdown notes on a draft invoice.
   */
  updateNotes: async ({ request, params }) => {
    const data = await request.formData();
    const notes = (data.get('notes') as string) || null;
    const { error: updateError } = await supabase
      .from('invoices').update({ notes }).eq('id', params.id);
    if (updateError) return fail(500, { error: 'Failed to save notes' });
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

    // Use PUBLIC_BASE_URL env var for email links; block sending if not set
    const baseUrl = env.PUBLIC_BASE_URL;
    if (!baseUrl) return fail(400, { error: 'PUBLIC_BASE_URL not set — cannot send emails with localhost links' });
    const publicUrl = `${baseUrl}/invoices/${invoice.public_token}`;

    try {
      await sendInvoiceEmail(
        invoice.clients.email,
        invoice.clients.name,
        invoice.invoice_number,
        publicUrl,
        settings?.owner_name ?? 'Alvar Sirlin'
      );
    } catch (err) {
      console.error('sendEmail error:', err);
      return fail(500, { error: `Email failed: ${err instanceof Error ? err.message : err}` });
    }

    await supabase.from('invoices').update({ status: 'sent' }).eq('id', params.id);
  }
};
