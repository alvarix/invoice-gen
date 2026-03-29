import { supabase } from '$lib/server/supabase';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { data: agreement } = await supabase
    .from('agreements')
    .select('*, clients(id, name, company, email)')
    .eq('id', params.id)
    .single();

  if (!agreement) error(404);

  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();

  return { agreement, settings };
};

export const actions: Actions = {
  /**
   * Save title and content edits (draft only).
   */
  save: async ({ request, params }) => {
    const data = await request.formData();
    const title = (data.get('title') as string)?.trim();
    const content = (data.get('content') as string) ?? '';

    if (!title) return fail(400, { error: 'Title is required.' });

    const { error: err } = await supabase
      .from('agreements')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('status', 'draft');

    if (err) return fail(500, { error: err.message });
  },

  /**
   * Mark as sent — transitions status from draft to sent.
   * Email delivery is deferred; owner copies the public link manually.
   */
  send: async ({ params }) => {
    const { error: err } = await supabase
      .from('agreements')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('status', 'draft');

    if (err) return fail(500, { error: err.message });
  },

  /**
   * Revert a sent agreement back to draft (before acceptance).
   */
  retract: async ({ params }) => {
    const { error: err } = await supabase
      .from('agreements')
      .update({ status: 'draft', sent_at: null })
      .eq('id', params.id)
      .eq('status', 'sent');

    if (err) return fail(500, { error: err.message });
  },

  /**
   * Upload a PDF to Supabase Storage and store the public URL on the agreement.
   * File is stored as agreements/{id}.pdf — uploading again replaces the previous file.
   */
  uploadPdf: async ({ request, params }) => {
    const data = await request.formData();
    const file = data.get('pdf') as File | null;

    if (!file || file.size === 0) return fail(400, { error: 'No file provided.' });
    if (file.type !== 'application/pdf') return fail(400, { error: 'File must be a PDF.' });
    if (file.size > 10 * 1024 * 1024) return fail(400, { error: 'File must be under 10 MB.' });

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('agreements')
      .upload(`${params.id}.pdf`, bytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) return fail(500, { error: uploadError.message });

    const { data: { publicUrl } } = supabase.storage
      .from('agreements')
      .getPublicUrl(`${params.id}.pdf`);

    const { error: updateError } = await supabase
      .from('agreements')
      .update({ pdf_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (updateError) return fail(500, { error: updateError.message });
  },

  /**
   * Remove the uploaded PDF from storage and clear pdf_url on the agreement.
   */
  removePdf: async ({ params }) => {
    await supabase.storage.from('agreements').remove([`${params.id}.pdf`]);

    const { error: err } = await supabase
      .from('agreements')
      .update({ pdf_url: null, updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (err) return fail(500, { error: err.message });
  }
};
