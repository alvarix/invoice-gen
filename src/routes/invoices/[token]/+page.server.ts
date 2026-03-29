import { supabase } from '$lib/server/supabase';
import { error } from '@sveltejs/kit';
import { marked } from 'marked';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { data: invoice } = await supabase
    .from('invoices').select('*, clients(*)').eq('public_token', params.token).single();
  if (!invoice) error(404);

  const { data: items } = await supabase
    .from('line_items').select('*').eq('invoice_id', invoice.id).order('sort_order');

  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();

  const notesHtml = invoice.notes ? await marked(invoice.notes) : null;

  return {
    invoice,
    client: invoice.clients,
    items: items ?? [],
    settings: settings ?? { id: 1, owner_name: null, address: null, zelle: null, logo_url: null },
    notesHtml,
  };
};
