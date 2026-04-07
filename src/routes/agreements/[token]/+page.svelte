<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import Spinner from '$lib/components/Spinner.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let accepting = $state(false);
  /** Controls confirmation modal before submitting acceptance */
  let showConfirm = $state(false);

  const isSent = $derived(data.agreement.status === 'sent');
  const isAccepted = $derived(data.agreement.status === 'accepted');

  /**
   * Format an ISO timestamp into a readable date and time string.
   * @param iso - ISO 8601 timestamp string
   */
  function formatAcceptedAt(iso: string): { date: string; time: string } {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
    return { date, time };
  }

</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') showConfirm = false; }} />

<style>
  @media print {
    :global(body *) { visibility: hidden; }
    :global(#agreement-document) { visibility: visible; position: absolute; top: 0; left: 0; width: 100%; }
    :global(#agreement-document *) { visibility: visible; }
    :global(.no-print) { display: none !important; }
  }
</style>

<svelte:head>
  <title>{data.agreement.title}</title>
</svelte:head>

<div id="agreement-document" class="max-w-3xl mx-auto px-6 py-10 font-sans text-gray-900">

  <!-- Header -->
  <div class="flex justify-between items-start mb-8">
    <div class="space-y-1">
      <h1 class="text-3xl font-bold text-gray-900">{data.agreement.title}</h1>
      <div class="text-sm text-gray-600">
        {data.agreement.clients?.name}
        {#if data.agreement.clients?.company} — {data.agreement.clients.company}{/if}
      </div>
      <div class="text-sm text-gray-500">
        {new Date(data.agreement.sent_at ?? data.agreement.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
    {#if data.settings?.owner_name}
      <div class="text-right text-sm text-gray-600 space-y-0.5">
        <div class="font-medium">{data.settings.owner_name}</div>
        <div class="text-gray-500">Web Development</div>
        {#if data.settings.email}
          <div><a href="mailto:{data.settings.email}" class="text-[#ff3103] hover:underline">{data.settings.email}</a></div>
        {/if}
        <div><a href="https://alvarsirlin.dev" target="_blank" rel="noopener" class="text-[#ff3103] hover:underline">alvarsirlin.dev</a></div>
      </div>
    {/if}
  </div>

  <!-- Agreement content: PDF takes precedence if present, markdown shown below if both exist -->
  <div class="border-t border-b border-gray-200 py-8 mb-8 space-y-6">
    {#if data.agreement.pdf_url}
      <div>
        <iframe
          src="https://docs.google.com/viewer?url={encodeURIComponent(data.agreement.pdf_url)}&embedded=true"
          title={data.agreement.title}
          class="w-full rounded border"
          style="height: 70vh; min-height: 400px;"
        ></iframe>
        <a href={data.agreement.pdf_url} target="_blank" rel="noopener"
          class="text-sm text-[#ff3103] hover:underline mt-2 inline-block">
          Open PDF in new tab
        </a>
      </div>
    {/if}

    {#if data.contentHtml}
      <div class="markdown text-gray-900">
        {@html data.contentHtml}
      </div>
    {/if}

  </div>

  <!-- Acceptance receipt -->
  {#if isAccepted && data.agreement.accepted_at}
    {@const { date, time } = formatAcceptedAt(data.agreement.accepted_at)}
    <div id="acceptance-receipt" class="border-2 border-[#337638] rounded-lg p-8 space-y-6 print:border-black">

      <div class="flex items-start justify-between">
        <div>
          <div class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Electronic Acceptance Receipt</div>
          <h2 class="text-xl font-bold text-[#337638] print:text-black">{data.agreement.title}</h2>
        </div>
        <button
          type="button"
          onclick={() => window.print()}
          class="text-xs border border-gray-300 rounded px-3 py-1.5 text-gray-500 hover:bg-gray-50 transition-colors print:hidden"
        >
          Print / Save PDF
        </button>
      </div>

      <div class="grid grid-cols-2 gap-6 text-sm border-t border-gray-200 pt-6">
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-wide text-gray-400 font-semibold">Prepared by</div>
          <div class="font-medium">{data.settings?.owner_name ?? '—'}</div>
        </div>
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-wide text-gray-400 font-semibold">Accepted by</div>
          <div class="font-medium">{data.agreement.clients?.name ?? '—'}</div>
          {#if data.agreement.clients?.company}
            <div class="text-gray-500">{data.agreement.clients.company}</div>
          {/if}
        </div>
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-wide text-gray-400 font-semibold">Date</div>
          <div class="font-medium">{date}</div>
        </div>
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-wide text-gray-400 font-semibold">Time</div>
          <div class="font-medium">{time}</div>
        </div>
        {#if data.agreement.accepted_name}
          <div class="space-y-1 col-span-2">
            <div class="text-xs uppercase tracking-wide text-gray-400 font-semibold">Signature</div>
            <div class="font-medium italic text-lg">{data.agreement.accepted_name}</div>
          </div>
        {/if}
        {#if data.agreement.accepted_ip}
          <div class="space-y-1 col-span-2">
            <div class="text-xs uppercase tracking-wide text-gray-400 font-semibold">IP Address</div>
            <div class="font-mono text-sm">{data.agreement.accepted_ip}</div>
          </div>
        {/if}
      </div>

      <div class="border-t border-gray-200 pt-5 text-xs text-gray-500 leading-relaxed">
        By clicking "Confirm Acceptance," the accepting party indicated agreement to the terms of this document.
        This receipt serves as a record of that electronic acceptance, including the date, time, and IP address
        at which the acceptance was recorded.
      </div>
    </div>
  {/if}

  <!-- Accept flow (sent status only) -->
  {#if isSent}
    {#if form?.error}
      <p class="text-red-500 text-sm mb-4">{form.error}</p>
    {/if}

    {#if !showConfirm}
      <button type="button" onclick={() => showConfirm = true}
        class="bg-[#337638] text-white px-6 py-3 rounded text-sm font-medium transition-colors hover:bg-[#14145a] active:bg-[#0f0f4a]">
        I Accept This Agreement
      </button>
    {:else}
      <div class="border border-[#337638] rounded px-5 py-4 max-w-sm">
        <p class="text-sm mb-4">
          By confirming, you agree to the terms of <strong>{data.agreement.title}</strong>.
          This action is recorded with a timestamp.
        </p>
        <form method="POST" action="?/accept"
          use:enhance={() => {
            accepting = true;
            return async ({ update }) => { accepting = false; await update(); };
          }}
          class="flex flex-col gap-3">
          {#if true || data.agreement.require_signature}
            <label class="flex flex-col gap-1 text-sm">
              <span>Type your full name to sign</span>
              <input name="accepted_name" required autocomplete="name"
                class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#337638]" />
            </label>
          {/if}
          <div class="flex gap-3">
          <button type="submit" disabled={accepting}
            class="bg-[#337638] text-white px-4 py-2 rounded text-sm transition-colors hover:bg-[#14145a] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
            {#if accepting}<Spinner />{/if}
            Confirm Acceptance
          </button>
          <button type="button" onclick={() => showConfirm = false}
            class="border border-gray-300 px-4 py-2 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          </div>
        </form>
      </div>
    {/if}
  {/if}

</div>
