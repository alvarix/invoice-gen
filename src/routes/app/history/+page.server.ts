import { supabase } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const clientId = url.searchParams.get('client');
  const status = url.searchParams.get('status');

  let query = supabase
    .from('invoices')
    .select('*, clients(name, slug)')
    .order('created_at', { ascending: false });

  if (clientId) query = query.eq('client_id', clientId);
  if (status) query = query.eq('status', status);

  const { data: invoices } = await query;
  const { data: clients } = await supabase.from('clients').select('id, name').order('name');

  return { invoices: invoices ?? [], clients: clients ?? [] };
};
