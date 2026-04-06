<script lang="ts">
  import type { PageData } from './$types';
  import { formatCurrency, formatDate } from '$lib/utils';
  import { enhance } from '$app/forms';
  import Spinner from '$lib/components/Spinner.svelte';

  let { data }: { data: PageData } = $props();

  /** Invoice pending permanent deletion */
  let confirmPurgeId = $state<string | null>(null);

  /** Whether an action is in progress */
  let acting = $state(false);

  /**
   * Map a status string to a Tailwind badge class.
   * @param status - invoice status value
   */
  function statusClass(status: string): string {
    if (status === 'paid') return 'bg-green-100 text-green-800';
    if (status === 'sent') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  }

  /**
   * Days remaining before an invoice is auto-purged.
   * @param deletedAt - ISO timestamp of deletion
   */
  function daysLeft(deletedAt: string): number {
    const trashed = new Date(deletedAt).getTime();
    const expires = trashed + 90 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000)));
  }
</script>

<div class="max-w-5xl mx-auto space-y-6">
  <h1 class="text-2xl font-bold text-[#337638]">Trash</h1>
  <p class="text-sm text-gray-500">
    Invoices are permanently deleted after 90 days in trash. Restore to move them back to history.
  </p>

  {#if data.invoices.length === 0}
    <p class="text-gray-400 text-sm py-8">Trash is empty.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide bg-gray-400 text-white">
            <th class="px-4 py-3 font-semibold">Invoice #</th>
            <th class="px-4 py-3 font-semibold">Client</th>
            <th class="px-4 py-3 font-semibold">Date</th>
            <th class="px-4 py-3 font-semibold">Status</th>
            <th class="px-4 py-3 font-semibold text-right">Total</th>
            <th class="px-4 py-3 font-semibold">Expires</th>
            <th class="px-4 py-3 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {#each data.invoices as invoice (invoice.id)}
            <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors text-gray-500">
              <td class="px-4 py-3 font-mono text-xs">{invoice.invoice_number}</td>
              <td class="px-4 py-3">{invoice.clients?.name ?? '—'}</td>
              <td class="px-4 py-3">{invoice.invoice_date ? formatDate(invoice.invoice_date) : '—'}</td>
              <td class="px-4 py-3">
                <span class="capitalize text-xs font-medium px-2 py-1 rounded {statusClass(invoice.status)}">
                  {invoice.status}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-medium">{formatCurrency(invoice.total)}</td>
              <td class="px-4 py-3 text-xs">
                {#if invoice.deleted_at}
                  {@const days = daysLeft(invoice.deleted_at)}
                  <span class={days <= 7 ? 'text-red-500 font-semibold' : 'text-gray-400'}>
                    {days}d
                  </span>
                {/if}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <!-- Restore -->
                  <form method="POST" action="?/restore" use:enhance={() => {
                    acting = true;
                    return async ({ update }) => { acting = false; await update(); };
                  }}>
                    <input type="hidden" name="invoice_id" value={invoice.id} />
                    <button
                      type="submit"
                      disabled={acting}
                      class="text-xs font-medium text-[#337638] hover:underline disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </form>

                  <!-- Permanent delete -->
                  {#if confirmPurgeId === invoice.id}
                    <form method="POST" action="?/purge" use:enhance={() => {
                      acting = true;
                      return async ({ update }) => { acting = false; confirmPurgeId = null; await update(); };
                    }}>
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      <div class="flex items-center gap-1">
                        <button
                          type="submit"
                          disabled={acting}
                          class="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {#if acting}<Spinner />{/if}
                          Yes
                        </button>
                        <button
                          type="button"
                          onclick={() => (confirmPurgeId = null)}
                          class="text-xs font-semibold text-gray-400 hover:text-gray-600"
                        >
                          No
                        </button>
                      </div>
                    </form>
                  {:else}
                    <button
                      type="button"
                      onclick={() => (confirmPurgeId = invoice.id)}
                      class="text-gray-300 hover:text-red-500 font-bold text-base leading-none transition-colors"
                      aria-label="Permanently delete"
                    >x</button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
