import { supabase } from '$lib/server/supabase';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

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

export const actions: Actions = {
  /**
   * Permanently delete an agreement and its PDF from storage.
   * @param request - form data containing agreement_id
   */
  deleteAgreement: async ({ request }) => {
    const data = await request.formData();
    const agreementId = data.get('agreement_id') as string;
    if (!agreementId) return fail(400, { error: 'Missing agreement ID' });

    // Remove PDF from storage if present
    const { data: agreement } = await supabase
      .from('agreements').select('pdf_url').eq('id', agreementId).single();

    if (agreement?.pdf_url) {
      const match = agreement.pdf_url.match(/\/object\/public\/agreements\/(.+)$/);
      if (match) {
        await supabase.storage.from('agreements').remove([decodeURIComponent(match[1])]);
      }
    }

    const { error } = await supabase.from('agreements').delete().eq('id', agreementId);
    if (error) return fail(500, { error: 'Failed to delete agreement' });
  }
};
