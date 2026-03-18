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
