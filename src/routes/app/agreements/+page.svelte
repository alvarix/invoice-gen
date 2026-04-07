<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import Spinner from '$lib/components/Spinner.svelte';

  let { data }: { data: PageData } = $props();

  const statuses = ['draft', 'sent', 'accepted'];

  /** ID of the agreement pending inline confirmation (drafts) */
  let confirmDeleteId = $state<string | null>(null);

  /** Non-draft agreement pending modal confirmation */
  let confirmDeleteAgreement = $state<(typeof data.agreements)[0] | null>(null);

  let deleting = $state(false);

  /** Badge color by status */
  function badgeClass(status: string) {
    if (status === 'accepted') return 'bg-green-100 text-green-800';
    if (status === 'sent') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  }
</script>

<div class="flex justify-between items-center mb-6">
  <h1 class="text-2xl font-bold text-[#337638]">Agreements</h1>
  <a href="/app/agreements/new"
    class="bg-[#337638] text-white px-4 py-2 rounded text-sm transition-colors hover:bg-[#14145a] active:bg-[#0f0f4a]">
    New Agreement
  </a>
</div>

<!-- Status filter -->
<div class="flex gap-2 mb-6">
  <a href="/app/agreements"
    class="px-3 py-1 rounded text-sm transition-colors {!data.statusFilter ? 'bg-[#337638] text-white' : 'bg-gray-100 hover:bg-gray-200'}">
    All
  </a>
  {#each statuses as s}
    <a href="/app/agreements?status={s}"
      class="px-3 py-1 rounded text-sm capitalize transition-colors {data.statusFilter === s ? 'bg-[#337638] text-white' : 'bg-gray-100 hover:bg-gray-200'}">
      {s}
    </a>
  {/each}
</div>

{#if data.agreements.length === 0}
  <p class="text-gray-400 text-sm">No agreements yet.</p>
{:else}
  <table class="w-full text-sm border-collapse">
    <thead>
      <tr class="text-left text-xs uppercase tracking-wide bg-[#337638] text-white">
        <th class="px-4 py-3 font-semibold">Title</th>
        <th class="px-4 py-3 font-semibold">Client</th>
        <th class="px-4 py-3 font-semibold">Status</th>
        <th class="px-4 py-3 font-semibold">Created</th>
        <th class="px-4 py-3 w-28"></th>
      </tr>
    </thead>
    <tbody>
      {#each data.agreements as a}
        <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors">
          <td class="px-4 py-3 font-medium">{a.title}</td>
          <td class="px-4 py-3 text-gray-500">{a.clients?.name ?? '—'}</td>
          <td class="px-4 py-3">
            <span class="capitalize text-xs px-2 py-1 rounded {badgeClass(a.status)}">{a.status}</span>
          </td>
          <td class="px-4 py-3 text-gray-500">{a.created_at?.slice(0, 10) ?? '—'}</td>
          <td class="px-4 py-3 text-right">
            <div class="flex items-center justify-end gap-3">
              <a href="/app/agreements/{a.id}"
                class="text-[#337638] hover:underline text-xs">View</a>

              {#if confirmDeleteId === a.id}
                {#if a.status === 'draft'}
                  <form method="POST" action="?/deleteAgreement" use:enhance={() => {
                    deleting = true;
                    return async ({ update }) => { deleting = false; confirmDeleteId = null; await update(); };
                  }}>
                    <input type="hidden" name="agreement_id" value={a.id} />
                    <div class="flex items-center gap-1">
                      <button type="submit" disabled={deleting}
                        class="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 inline-flex items-center gap-1">
                        {#if deleting}<Spinner />{/if}Yes
                      </button>
                      <button type="button" onclick={() => (confirmDeleteId = null)}
                        class="text-xs font-semibold text-gray-400 hover:text-gray-600">No</button>
                    </div>
                  </form>
                {:else}
                  <div class="flex items-center gap-1">
                    <button type="button"
                      onclick={() => { confirmDeleteAgreement = a; confirmDeleteId = null; }}
                      class="text-xs font-semibold text-red-600 hover:text-red-800">Yes</button>
                    <button type="button" onclick={() => (confirmDeleteId = null)}
                      class="text-xs font-semibold text-gray-400 hover:text-gray-600">No</button>
                  </div>
                {/if}
              {:else}
                <button type="button" onclick={() => (confirmDeleteId = a.id)}
                  class="text-gray-300 hover:text-red-500 font-bold text-base leading-none transition-colors"
                  aria-label="Delete agreement">x</button>
              {/if}
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

{#if confirmDeleteAgreement}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
    <div class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6 space-y-4">
      <h2 class="text-base font-bold text-red-700">Delete {confirmDeleteAgreement.status} agreement?</h2>
      <dl class="text-sm space-y-1.5 text-gray-700">
        <div class="flex justify-between">
          <dt class="text-gray-500">Title</dt>
          <dd class="font-medium">{confirmDeleteAgreement.title}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-500">Client</dt>
          <dd>{confirmDeleteAgreement.clients?.name ?? '—'}</dd>
        </div>
        <div class="flex justify-between border-t border-gray-100 pt-1.5">
          <dt class="text-gray-500">Status</dt>
          <dd class="capitalize font-semibold">{confirmDeleteAgreement.status}</dd>
        </div>
      </dl>
      <p class="text-xs text-red-600">
        This agreement has been {confirmDeleteAgreement.status}. Deleting it cannot be undone.
      </p>
      <form method="POST" action="?/deleteAgreement"
        use:enhance={() => {
          deleting = true;
          return async ({ update }) => { deleting = false; confirmDeleteAgreement = null; await update(); };
        }}
        class="flex gap-3 justify-end pt-2">
        <input type="hidden" name="agreement_id" value={confirmDeleteAgreement.id} />
        <button type="button" onclick={() => (confirmDeleteAgreement = null)}
          class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={deleting}
          class="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50 inline-flex items-center gap-2">
          {#if deleting}<Spinner />{/if}
          Delete
        </button>
      </form>
    </div>
  </div>
{/if}
