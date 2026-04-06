import { supabase } from '$lib/server/supabase';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Fetch clients with their most recent invoice date and status
  const { data: clients } = await supabase
    .from('clients')
    .select('*, invoices(invoice_date, status, invoice_number, deleted_at)')
    .order('name');

  // Flatten to include only the latest invoice per client
  const clientsWithLatest = (clients ?? []).map((c: any) => {
    const sorted = (c.invoices ?? []).filter((inv: any) => !inv.deleted_at).sort(
      (a: any, b: any) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
    );
    return { ...c, latest_invoice: sorted[0] ?? null, invoices: undefined };
  });

  return { clients: clientsWithLatest };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const { error } = await supabase.from('clients').insert({
      slug: data.get('slug'),
      name: data.get('name'),
      company: data.get('company'),
      project: data.get('project'),
      email: data.get('email'),
      hourly_rate: Number(data.get('hourly_rate')),
      currency: data.get('currency') || 'USD',
      tax_rate: Number(data.get('tax_rate')) / 100, // input as percentage
    });
    if (error) return fail(500, { error: error.message });
  },

  update: async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id') as string;
    const { error } = await supabase.from('clients').update({
      name: data.get('name'),
      company: data.get('company'),
      project: data.get('project'),
      email: data.get('email'),
      hourly_rate: Number(data.get('hourly_rate')),
      currency: data.get('currency'),
      tax_rate: Number(data.get('tax_rate')) / 100,
    }).eq('id', id);
    if (error) return fail(500, { error: error.message });
  },

  delete: async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id') as string;
    // Cascades to invoices and line_items via FK constraint
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) return fail(500, { error: error.message });
  },

  /**
   * Regenerate portal_token for a client, invalidating the old portal URL.
   */
  resetPortalToken: async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id') as string;
    const { error } = await supabase
      .from('clients')
      .update({ portal_token: crypto.randomUUID() })
      .eq('id', id);
    if (error) return fail(500, { error: error.message });
  }
};
