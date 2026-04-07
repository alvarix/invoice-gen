import { supabase } from '$lib/server/supabase';
import { error, fail } from '@sveltejs/kit';
import { marked } from 'marked';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { data: agreement } = await supabase
    .from('agreements')
    .select('*, clients(name, company)')
    .eq('public_token', params.token)
    .single();

  if (!agreement) error(404);

  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();

  /** Render markdown content to HTML for safe server-side display */
  const contentHtml = agreement.content ? marked.parse(agreement.content) : '';

  return { agreement, settings, contentHtml };
};

export const actions: Actions = {
  /**
   * Record client acceptance of the agreement.
   * Captures timestamp and IP address.
   */
  accept: async ({ params, request, getClientAddress }) => {
    const { data: agreement } = await supabase
      .from('agreements')
      .select('id, status')
      .eq('public_token', params.token)
      .single();

    if (!agreement) return fail(404, { error: 'Agreement not found.' });
    if (agreement.status !== 'sent') return fail(400, { error: 'This agreement is not open for acceptance.' });

    const ip = getClientAddress();

    const { error: err } = await supabase
      .from('agreements')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_ip: ip,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agreement.id);

    if (err) return fail(500, { error: err.message });
  }
};
