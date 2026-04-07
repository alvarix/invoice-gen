import { supabase } from '$lib/server/supabase';
import { error, fail } from '@sveltejs/kit';
import { marked } from 'marked';
import type { Actions, PageServerLoad } from './$types';

/**
 * Extract the UUID token from a path segment that may be prefixed with a slug.
 * Supports both bare UUIDs and "title-slug--uuid" format.
 * @param raw - the full [token] path param
 */
function extractToken(raw: string): string {
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const match = raw.match(uuidPattern);
  return match ? match[0] : raw;
}

export const load: PageServerLoad = async ({ params }) => {
  const token = extractToken(params.token);

  const { data: agreement } = await supabase
    .from('agreements')
    .select('*, clients(name, company)')
    .eq('public_token', token)
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
    const token = extractToken(params.token);
    const { data: agreement } = await supabase
      .from('agreements')
      .select('id, status, require_signature')
      .eq('public_token', token)
      .single();

    if (!agreement) return fail(404, { error: 'Agreement not found.' });
    if (agreement.status !== 'sent') return fail(400, { error: 'This agreement is not open for acceptance.' });

    const formData = await request.formData();
    const acceptedName = (formData.get('accepted_name') as string)?.trim() || null;

    if (agreement.require_signature && !acceptedName) {
      return fail(400, { error: 'Please type your full name to sign.' });
    }

    const ip = getClientAddress();

    const { error: err } = await supabase
      .from('agreements')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_ip: ip,
        accepted_name: acceptedName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agreement.id);

    if (err) return fail(500, { error: err.message });
  }
};
