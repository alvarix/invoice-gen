<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import Spinner from '$lib/components/Spinner.svelte';
  import { marked } from 'marked';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let saving = $state(false);
  let requireSignature = $state(data.agreement.require_signature ?? false);
  let sending = $state(false);
  let emailing = $state(false);
  let retracting = $state(false);
  let uploadingPdf = $state(false);
  let removingPdf = $state(false);

  /** Current editor tab */
  let tab = $state<'edit' | 'preview'>('edit');

  /** Editable copy of content for preview toggling */
  let content = $state(data.agreement.content ?? '');
  let title = $state(data.agreement.title);

  const isDraft = $derived(data.agreement.status === 'draft');
  const isSent = $derived(data.agreement.status === 'sent');
  const isAccepted = $derived(data.agreement.status === 'accepted');

  /** Slugified title for readable URLs */
  const titleSlug = $derived(
    data.agreement.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  );

  /** Public URL using slug--token format for readable sharing links */
  const publicUrl = $derived(
    `${window?.location?.origin ?? ''}/agreements/${titleSlug}--${data.agreement.public_token}`
  );

  /** Copy public URL to clipboard */
  async function copyUrl() {
    await navigator.clipboard.writeText(publicUrl);
  }

  /** Badge color by status */
  function badgeClass(status: string) {
    if (status === 'accepted') return 'bg-green-100 text-green-800';
    if (status === 'sent') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  }
</script>

<div class="mb-6">
  <a href="/app/agreements" class="text-sm text-gray-400 hover:text-gray-600 transition-colors">
    &larr; Agreements
  </a>
  <div class="flex items-center gap-3 mt-1">
    <h1 class="text-2xl font-bold text-[#337638]">{data.agreement.title}</h1>
    <span class="capitalize text-xs px-2 py-1 rounded {badgeClass(data.agreement.status)}">
      {data.agreement.status}
    </span>
  </div>
  <div class="text-sm text-gray-500 mt-1">
    {data.agreement.clients?.name}
    {#if data.agreement.clients?.company} — {data.agreement.clients.company}{/if}
  </div>
</div>

{#if form?.error}
  <p class="text-red-500 text-sm mb-4">{form.error}</p>
{/if}

<!-- Accepted receipt -->
{#if isAccepted}
  <div class="bg-green-50 border border-green-200 rounded px-4 py-3 text-sm mb-6">
    <div class="font-semibold text-green-800 mb-1">Accepted</div>
    <div class="text-green-700">
      Accepted on {data.agreement.accepted_at?.slice(0, 10)}
      {#if data.agreement.accepted_ip}
        &nbsp;from {data.agreement.accepted_ip}
      {/if}
    </div>
  </div>
{/if}

<!-- Public link — always visible as a preview; copy only available when sent/accepted -->
<div class="flex items-center gap-2 mb-4 flex-wrap">
  <span class="text-sm text-gray-500 truncate">{publicUrl}</span>
  {#if isSent || isAccepted}
    <button type="button" onclick={copyUrl}
      class="text-xs border rounded px-2 py-1 hover:bg-gray-50 transition-colors shrink-0">
      Copy link
    </button>
  {/if}
  <a href={publicUrl} target="_blank"
    class="text-xs text-[#337638] hover:underline shrink-0">Open</a>
</div>

<!-- Live preview of client-facing page -->
<div class="mb-6">
  <div class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Client Preview</div>
  <iframe
    src={publicUrl}
    title="Agreement preview"
    class="w-full rounded border bg-white"
    style="height: 60vh; min-height: 400px;"
  ></iframe>
</div>

{#if isSent && data.agreement.clients?.email}
  <form method="POST" action="?/sendEmail"
    use:enhance={() => {
      emailing = true;
      return async ({ update }) => { emailing = false; await update(); };
    }}
    class="mb-6">
    <button type="submit" disabled={emailing}
      class="bg-[#337638] text-white px-5 py-2 rounded text-sm transition-colors hover:bg-[#14145a] active:bg-[#0f0f4a] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
      {#if emailing}<Spinner />{/if}
      Email Agreement to Client
    </button>
    <p class="text-xs text-gray-400 mt-1">Sends to {data.agreement.clients.email}</p>
  </form>
{:else if isSent}
  <p class="text-xs text-gray-400 mb-6">No email on file for this client — share the link manually.</p>
{/if}

<!-- Send / Retract actions -->
{#if isDraft}
  <form method="POST" action="?/send"
    use:enhance={() => {
      sending = true;
      return async ({ update }) => { sending = false; await update(); };
    }}
    class="mb-6">
    <button type="submit" disabled={sending}
      class="bg-[#337638] text-white px-5 py-2 rounded text-sm transition-colors hover:bg-[#14145a] active:bg-[#0f0f4a] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
      {#if sending}<Spinner />{/if}
      Mark as Sent
    </button>
    <p class="text-xs text-gray-400 mt-1">Copy the public link and send it to the client manually.</p>
  </form>
{:else if isSent}
  <form method="POST" action="?/retract"
    use:enhance={() => {
      retracting = true;
      return async ({ update }) => { retracting = false; await update(); };
    }}
    onsubmit={(e) => { if (!confirm('Retract this agreement and return it to draft?')) e.preventDefault(); }}
    class="mb-6">
    <button type="submit" disabled={retracting}
      class="border border-gray-300 px-4 py-2 rounded text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
      {#if retracting}<Spinner />{/if}
      Retract to Draft
    </button>
  </form>
{/if}

<!-- Editor (draft only) or read-only content -->
{#if isDraft}
  <form method="POST" action="?/save"
    use:enhance={() => {
      saving = true;
      return async ({ update }) => { saving = false; await update(); };
    }}
    class="max-w-2xl space-y-4">

    <label class="flex flex-col gap-1 text-sm">
      Title
      <input name="title" bind:value={title} required
        class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
    </label>

    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" name="require_signature" bind:checked={requireSignature} class="rounded" />
      Require typed name to accept
    </label>

    <div class="flex flex-col gap-1 text-sm">
      <div class="flex justify-between items-center">
        <span>Content (Markdown)</span>
        <div class="flex gap-1">
          <button type="button" onclick={() => tab = 'edit'}
            class="px-3 py-1 rounded text-xs transition-colors {tab === 'edit' ? 'bg-[#337638] text-white' : 'bg-gray-100 hover:bg-gray-200'}">
            Edit
          </button>
          <button type="button" onclick={() => tab = 'preview'}
            class="px-3 py-1 rounded text-xs transition-colors {tab === 'preview' ? 'bg-[#337638] text-white' : 'bg-gray-100 hover:bg-gray-200'}">
            Preview
          </button>
        </div>
      </div>

      {#if tab === 'edit'}
        <textarea name="content" rows="18" bind:value={content}
          class="border rounded px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y">
        </textarea>
      {:else}
        <textarea name="content" class="hidden" value={content}></textarea>
        <div class="border rounded px-4 py-3 min-h-[20rem] bg-gray-50 markdown text-gray-800">
          {#if content}
            {@html marked.parse(content)}
          {:else}
            <p class="text-gray-400">Nothing to preview.</p>
          {/if}
        </div>
      {/if}
    </div>

    <button type="submit" disabled={saving}
      class="bg-[#ff3103] text-white px-5 py-2 rounded text-sm transition-colors hover:bg-[#e02c02] active:bg-[#c02601] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
      {#if saving}<Spinner />{/if}
      Save
    </button>
  </form>
{:else}
  <!-- Read-only content display -->
  {#if data.agreement.content}
    <div class="max-w-2xl border rounded px-4 py-3 bg-gray-50 markdown text-gray-800">
      {@html marked.parse(data.agreement.content)}
    </div>
  {/if}
{/if}

<!-- PDF attachment -->
<div class="max-w-2xl mt-8 pt-6 border-t border-gray-200 space-y-3">
  <h2 class="text-base font-semibold text-[#337638]">PDF Attachment</h2>

  {#if data.agreement.pdf_url}
    <div class="flex items-center gap-3 text-sm mb-3">
      <a href={data.agreement.pdf_url} target="_blank" rel="noopener"
        class="text-[#337638] hover:underline">Open PDF</a>
      {#if !isAccepted}
        <span class="text-gray-300">|</span>
        <form method="POST" action="?/removePdf"
          use:enhance={() => {
            removingPdf = true;
            return async ({ update }) => { removingPdf = false; await update(); };
          }}
          onsubmit={(e) => { if (!confirm('Remove this PDF?')) e.preventDefault(); }}>
          <button type="submit" disabled={removingPdf}
            class="text-red-500 hover:underline text-xs disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1">
            {#if removingPdf}<Spinner />{/if}
            Remove
          </button>
        </form>
      {/if}
    </div>
    <iframe
      src="https://docs.google.com/viewer?url={encodeURIComponent(data.agreement.pdf_url)}&embedded=true"
      title={data.agreement.title}
      class="w-full rounded border"
      style="height: 70vh; min-height: 400px;"
    ></iframe>
  {:else}
    <p class="text-sm text-gray-400">No PDF attached.</p>
  {/if}

  {#if !isAccepted}
    <form method="POST" action="?/uploadPdf" enctype="multipart/form-data"
      use:enhance={() => {
        uploadingPdf = true;
        return async ({ update }) => { uploadingPdf = false; await update(); };
      }}>
      <div class="flex items-center gap-3">
        <input type="file" name="pdf" accept="application/pdf" required
          class="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:transition-colors" />
        <button type="submit" disabled={uploadingPdf}
          class="bg-[#337638] text-white px-4 py-1.5 rounded text-sm transition-colors hover:bg-[#14145a] active:bg-[#0f0f4a] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shrink-0">
          {#if uploadingPdf}<Spinner />{/if}
          {data.agreement.pdf_url ? 'Replace PDF' : 'Upload PDF'}
        </button>
      </div>
      <p class="text-xs text-gray-400 mt-1">PDF only, max 10 MB. Replaces any existing file.</p>
    </form>
  {/if}
</div>
