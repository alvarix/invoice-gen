import { supabase } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const statusFilter = url.searchParams.get('status');

  let query = supabase
    .from('agreements')
    .select('*, clients(id, name, company)')
    .order('created_at', { ascending: false });

  if (statusFilter) query = query.eq('status', statusFilter);

  const { data: agreements } = await query;

  return { agreements: agreements ?? [], statusFilter };
};
