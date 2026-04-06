<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import Spinner from '$lib/components/Spinner.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let submitting = $state(false);

  /** Current tab in the content editor */
  let tab = $state<'edit' | 'preview'>('edit');

  /** Live content for client-side preview toggle */
  let content = $state('');
</script>

<div class="mb-6">
  <a href="/app/agreements" class="text-sm text-gray-400 hover:text-gray-600 transition-colors">
    &larr; Agreements
  </a>
  <h1 class="text-2xl font-bold text-[#337638] mt-1">New Agreement</h1>
</div>

{#if form?.error}
  <p class="text-red-500 text-sm mb-4">{form.error}</p>
{/if}

<form method="POST"
  use:enhance={() => {
    submitting = true;
    return async ({ update }) => { submitting = false; await update(); };
  }}
  class="max-w-2xl space-y-5">

  <label class="flex flex-col gap-1 text-sm">
    Client
    <select name="client_id" required
      class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400">
      <option value="">Select a client...</option>
      {#each data.clients as c}
        <option value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
      {/each}
    </select>
  </label>

  <label class="flex flex-col gap-1 text-sm">
    Title
    <input name="title" required placeholder="e.g. Managed Hosting and Support Agreement"
      class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
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
        placeholder="Write the agreement in Markdown..."
        class="border rounded px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y">
      </textarea>
    {:else}
      <!-- Hidden textarea keeps the value in the form -->
      <textarea name="content" class="hidden" value={content}></textarea>
      <div class="border rounded px-4 py-3 min-h-[20rem] prose prose-sm max-w-none bg-gray-50">
        {#if content.trim()}
          <p class="text-gray-400 text-xs mb-2 font-sans not-prose">Preview (markdown will render on the public page)</p>
          <pre class="whitespace-pre-wrap font-sans text-sm">{content}</pre>
        {:else}
          <p class="text-gray-400 text-sm">Nothing to preview yet.</p>
        {/if}
      </div>
    {/if}
  </div>

  <button type="submit" disabled={submitting}
    class="bg-[#337638] text-white px-5 py-2 rounded text-sm transition-colors hover:bg-[#14145a] active:bg-[#0f0f4a] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
    {#if submitting}<Spinner />{/if}
    Create Agreement
  </button>
</form>
