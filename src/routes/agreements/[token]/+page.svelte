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

</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') showConfirm = false; }} />

<svelte:head>
  <title>{data.agreement.title}</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-6 py-10 font-sans text-[#1a1a6e]">

  <!-- Header -->
  <div class="flex justify-between items-start mb-8">
    <div>
      <h1 class="text-3xl font-bold">{data.agreement.title}</h1>
      <div class="text-sm text-gray-500 mt-1">
        {data.agreement.clients?.name}
        {#if data.agreement.clients?.company} — {data.agreement.clients.company}{/if}
      </div>
      {#if data.settings?.owner_name}
        <div class="text-sm text-gray-500">Prepared by {data.settings.owner_name}</div>
      {/if}
    </div>
  </div>

  <!-- Agreement content: PDF takes precedence if present, markdown shown below if both exist -->
  <div class="border-t border-b border-gray-200 py-8 mb-8 space-y-6">
    {#if data.agreement.pdf_url}
      <div>
        <iframe
          src={data.agreement.pdf_url}
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
      <div class="prose prose-sm max-w-none
        [&_h1]:text-[#1a1a6e] [&_h2]:text-[#1a1a6e] [&_h3]:text-[#1a1a6e]
        [&_a]:text-[#ff3103]">
        {@html data.contentHtml}
      </div>
    {/if}

    {#if !data.agreement.pdf_url && !data.contentHtml}
      <p class="text-gray-400 text-sm">(No content)</p>
    {/if}
  </div>

  <!-- Accepted receipt -->
  {#if isAccepted}
    <div class="bg-green-50 border border-green-200 rounded px-5 py-4 text-sm">
      <div class="font-semibold text-green-800 text-base mb-1">Agreement Accepted</div>
      <div class="text-green-700">
        Accepted on {data.agreement.accepted_at?.slice(0, 10)}
      </div>
      <div class="text-green-700 mt-2">
        {data.agreement.clients?.name}
        {#if data.agreement.clients?.company} — {data.agreement.clients.company}{/if}
      </div>
      {#if data.settings?.owner_name}
        <div class="text-green-700">{data.settings.owner_name}</div>
      {/if}
    </div>
  {/if}

  <!-- Accept flow (sent status only) -->
  {#if isSent}
    {#if form?.error}
      <p class="text-red-500 text-sm mb-4">{form.error}</p>
    {/if}

    {#if !showConfirm}
      <button type="button" onclick={() => showConfirm = true}
        class="bg-[#1a1a6e] text-white px-6 py-3 rounded text-sm font-medium transition-colors hover:bg-[#14145a] active:bg-[#0f0f4a]">
        I Accept This Agreement
      </button>
    {:else}
      <div class="border border-[#1a1a6e] rounded px-5 py-4 max-w-sm">
        <p class="text-sm mb-4">
          By confirming, you agree to the terms of <strong>{data.agreement.title}</strong>.
          This action is recorded with a timestamp.
        </p>
        <form method="POST" action="?/accept"
          use:enhance={() => {
            accepting = true;
            return async ({ update }) => { accepting = false; await update(); };
          }}
          class="flex gap-3">
          <button type="submit" disabled={accepting}
            class="bg-[#1a1a6e] text-white px-4 py-2 rounded text-sm transition-colors hover:bg-[#14145a] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
            {#if accepting}<Spinner />{/if}
            Confirm Acceptance
          </button>
          <button type="button" onclick={() => showConfirm = false}
            class="border border-gray-300 px-4 py-2 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </form>
      </div>
    {/if}
  {/if}

</div>
