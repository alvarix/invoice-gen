import { supabase } from '$lib/server/supabase';
import { parseTogglPaste, parseTogglCSV } from '$lib/server/toggl';
import { generateInvoiceNumber, calculateTotals } from '$lib/server/invoice';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const { data: clients } = await supabase.from('clients').select('*').order('name');
  return { clients: clients ?? [] };
};

export const actions: Actions = {
  /** Parse Toggl paste and return line items for review */
  parseToggl: async ({ request }) => {
    const data = await request.formData();
    const text = data.get('toggl_text') as string;
    const clientId = data.get('client_id') as string;
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    if (!client) return fail(400, { error: 'Client not found' });
    const entries = parseTogglPaste(text);
    const items = entries.map((e, i) => ({
      type: 'time' as const,
      description: e.description,
      duration_raw: e.duration_raw,
      duration_rounded: e.duration_rounded,
      rate: client.hourly_rate,
      amount: Math.round(e.hours_rounded * client.hourly_rate * 100) / 100,
      sort_order: i,
    }));
    return { parsed: items, client_id: clientId };
  },

  /** Parse Toggl CSV upload */
  parseCSV: async ({ request }) => {
    const data = await request.formData();
    const file = data.get('csv_file') as File;
    const text = await file.text();
    const clientId = data.get('client_id') as string;
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    if (!client) return fail(400, { error: 'Client not found' });
    const entries = parseTogglCSV(text);
    const items = entries.map((e, i) => ({
      type: 'time' as const,
      description: e.description,
      duration_raw: e.duration_raw,
      duration_rounded: e.duration_rounded,
      rate: client.hourly_rate,
      amount: Math.round(e.hours_rounded * client.hourly_rate * 100) / 100,
      sort_order: i,
    }));
    return { parsed: items, client_id: clientId };
  },

  /** Generate invoice from confirmed line items */
  generate: async ({ request }) => {
    const data = await request.formData();
    const clientId = data.get('client_id') as string;
    const invoiceDate = data.get('invoice_date') as string;
    const dueDate = data.get('due_date') as string;
    const itemsJson = data.get('items') as string;
    const items = JSON.parse(itemsJson);

    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    if (!client) return fail(400, { error: 'Client not found' });

    // Increment seq
    const seq = client.invoice_seq + 1;
    await supabase.from('clients').update({ invoice_seq: seq }).eq('id', clientId);

    const invoiceNumber = generateInvoiceNumber(client.slug, seq);
    const totals = calculateTotals(items, client.tax_rate);

    const { data: invoice } = await supabase.from('invoices').insert({
      client_id: clientId,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      tax_rate: client.tax_rate,
      ...totals,
    }).select().single();
    if (!invoice) return fail(500, { error: 'Failed to create invoice' });

    await supabase.from('line_items').insert(
      items.map((item: Record<string, unknown>, i: number) => ({ ...item, invoice_id: invoice.id, sort_order: i }))
    );

    redirect(303, `/app/invoices/${invoice.id}`);
  }
};
