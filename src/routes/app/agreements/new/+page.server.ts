import { supabase } from '$lib/server/supabase';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company')
    .order('name');

  return { clients: clients ?? [] };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const client_id = data.get('client_id') as string;
    const title = (data.get('title') as string)?.trim();
    const content = (data.get('content') as string) ?? '';

    if (!client_id || !title) return fail(400, { error: 'Client and title are required.' });

    const { data: agreement, error } = await supabase
      .from('agreements')
      .insert({ client_id, title, content })
      .select('id')
      .single();

    if (error) return fail(500, { error: error.message });

    redirect(303, `/app/agreements/${agreement.id}`);
  }
};
