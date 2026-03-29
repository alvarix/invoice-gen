import { supabase } from '$lib/server/supabase';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('portal_token', params.token)
    .single();

  if (!client) error(404);

  const [{ data: invoices }, { data: agreements }, { data: settings }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, invoice_date, status, total, public_token, currency')
      .eq('client_id', client.id)
      .neq('status', 'draft')
      .order('invoice_date', { ascending: false }),

    supabase
      .from('agreements')
      .select('id, title, status, public_token, sent_at, accepted_at')
      .eq('client_id', client.id)
      .neq('status', 'draft')
      .order('created_at', { ascending: false }),

    supabase.from('settings').select('*').eq('id', 1).single(),
  ]);

  return {
    client,
    invoices: invoices ?? [],
    agreements: agreements ?? [],
    settings,
  };
};
