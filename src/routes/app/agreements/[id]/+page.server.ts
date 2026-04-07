import { supabase } from '$lib/server/supabase';
import { sendAgreementEmail } from '$lib/server/brevo';
import { env } from '$env/dynamic/private';
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

    const requireSignature = data.get('require_signature') === 'on';

    const { error: err } = await supabase
      .from('agreements')
      .update({ title, content, require_signature: requireSignature, updated_at: new Date().toISOString() })
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
   * File is stored as agreements/{id}/{ownerName} - {title}.pdf for a friendly download name.
   * Uploading again replaces the previous file.
   */
  uploadPdf: async ({ request, params }) => {
    const data = await request.formData();
    const file = data.get('pdf') as File | null;

    if (!file || file.size === 0) return fail(400, { error: 'No file provided.' });
    if (file.type !== 'application/pdf') return fail(400, { error: 'File must be a PDF.' });
    if (file.size > 10 * 1024 * 1024) return fail(400, { error: 'File must be under 10 MB.' });

    const { data: agreement } = await supabase
      .from('agreements').select('title').eq('id', params.id).single();
    if (!agreement) return fail(404, { error: 'Agreement not found.' });

    const { data: settings } = await supabase.from('settings').select('owner_name').eq('id', 1).single();
    const ownerName = settings?.owner_name ?? 'Alvar Sirlin';

    // Sanitize title for use in a filename
    const safeTitle = agreement.title.replace(/[^\w\s\-]/g, '').replace(/\s+/g, ' ').trim();
    const storagePath = `${params.id}/${ownerName} - ${safeTitle}.pdf`;

    // Remove any previously stored file for this agreement before uploading
    const { data: existing } = await supabase.storage.from('agreements').list(params.id);
    if (existing && existing.length > 0) {
      await supabase.storage.from('agreements').remove(existing.map((f) => `${params.id}/${f.name}`));
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('agreements')
      .upload(storagePath, bytes, { contentType: 'application/pdf' });

    if (uploadError) return fail(500, { error: uploadError.message });

    const { data: { publicUrl } } = supabase.storage.from('agreements').getPublicUrl(storagePath);

    const { error: updateError } = await supabase
      .from('agreements')
      .update({ pdf_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (updateError) return fail(500, { error: updateError.message });
  },

  /**
   * Email the agreement link to the client via Brevo.
   * Agreement must be in 'sent' status and client must have an email address.
   */
  sendEmail: async ({ params, url }) => {
    const { data: agreement } = await supabase
      .from('agreements')
      .select('*, clients(name, email)')
      .eq('id', params.id)
      .single();

    if (!agreement?.clients?.email) return fail(400, { error: 'Client has no email address.' });
    if (agreement.status !== 'sent') return fail(400, { error: 'Agreement must be sent before emailing.' });

    const baseUrl = env.PUBLIC_BASE_URL;
    if (!baseUrl) return fail(400, { error: 'PUBLIC_BASE_URL not set — cannot send emails with localhost links' });

    const { data: settings } = await supabase.from('settings').select('owner_name').eq('id', 1).single();
    const publicUrl = `${baseUrl}/agreements/${agreement.public_token}`;

    try {
      await sendAgreementEmail(
        agreement.clients.email,
        agreement.clients.name,
        agreement.title,
        publicUrl,
        settings?.owner_name ?? 'Alvar Sirlin'
      );
    } catch (err) {
      console.error('sendEmail error:', err);
      return fail(500, { error: `Email failed: ${err instanceof Error ? err.message : err}` });
    }
  },

  /**
   * Remove the uploaded PDF from storage and clear pdf_url on the agreement.
   * Derives the storage path from the stored pdf_url to handle any filename.
   */
  removePdf: async ({ params }) => {
    const { data: agreement } = await supabase
      .from('agreements').select('pdf_url').eq('id', params.id).single();

    if (agreement?.pdf_url) {
      const match = agreement.pdf_url.match(/\/object\/public\/agreements\/(.+)$/);
      if (match) {
        await supabase.storage.from('agreements').remove([decodeURIComponent(match[1])]);
      }
    }

    const { error: err } = await supabase
      .from('agreements')
      .update({ pdf_url: null, updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (err) return fail(500, { error: err.message });
  }
};
