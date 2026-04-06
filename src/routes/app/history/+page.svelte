<script lang="ts">
  import type { PageData } from './$types';
  import { formatCurrency, formatDate } from '$lib/utils';
  import { enhance } from '$app/forms';
  import Spinner from '$lib/components/Spinner.svelte';

  let { data }: { data: PageData } = $props();

  /** ID of the invoice pending deletion (shows inline confirmation, drafts only) */
  let confirmDeleteId = $state<string | null>(null);

  /** Non-draft invoice pending deletion (shows modal) */
  let confirmDeleteInvoice = $state<(typeof data.invoices)[0] | null>(null);

  /** Whether a delete is in progress */
  let deleting = $state(false);

  /**
   * Map a status string to a Tailwind badge class.
   * @param status - invoice status value
   * @returns Tailwind class string
   */
  function statusClass(status: string): string {
    if (status === 'paid') return 'bg-green-100 text-green-800';
    if (status === 'sent') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  }
</script>

<div class="max-w-5xl mx-auto space-y-6">
  <h1 class="text-2xl font-bold text-[#337638]">Invoice History</h1>

  <!-- Filters — GET form so params appear in URL and trigger server reload -->
  <form method="GET" class="flex gap-4 items-end">
    <div class="flex flex-col gap-1 text-sm">
      <label for="client-filter" class="font-semibold text-gray-700">Client</label>
      <select
        id="client-filter"
        name="client"
        value={data.activeClient}
        class="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#337638]"
      >
        <option value="">All clients</option>
        {#each data.clients as client (client.id)}
          <option value={client.id}>{client.name}</option>
        {/each}
      </select>
    </div>

    <div class="flex flex-col gap-1 text-sm">
      <label for="status-filter" class="font-semibold text-gray-700">Status</label>
      <select
        id="status-filter"
        name="status"
        value={data.activeStatus}
        class="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#337638]"
      >
        <option value="">All</option>
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="paid">Paid</option>
      </select>
    </div>

    <button
      type="submit"
      class="px-4 py-2 rounded text-white text-sm font-medium bg-[#337638] hover:bg-[#14145a] active:bg-[#0f0f4a] transition-colors"
    >
      Filter
    </button>
  </form>

  <!-- Invoice table -->
  {#if data.invoices.length === 0}
    <p class="text-gray-500 text-sm py-8">No invoices found.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide bg-[#337638] text-white">
            <th class="px-4 py-3 font-semibold">Invoice #</th>
            <th class="px-4 py-3 font-semibold">Client</th>
            <th class="px-4 py-3 font-semibold">Date</th>
            <th class="px-4 py-3 font-semibold">Status</th>
            <th class="px-4 py-3 font-semibold text-right">Total</th>
            <th class="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {#each data.invoices as invoice (invoice.id)}
            <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3">
                <a
                  href="/app/invoices/{invoice.id}"
                  class="font-medium text-[#337638] hover:underline"
                >
                  {invoice.invoice_number}
                </a>
              </td>
              <td class="px-4 py-3 text-gray-700">
                {invoice.clients?.name ?? '—'}
              </td>
              <td class="px-4 py-3 text-gray-500">
                {invoice.invoice_date ? formatDate(invoice.invoice_date) : '—'}
              </td>
              <td class="px-4 py-3">
                <span class="capitalize text-xs font-medium px-2 py-1 rounded {statusClass(invoice.status)}">
                  {invoice.status}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-medium">
                {formatCurrency(invoice.total)}
              </td>
              <td class="px-4 py-3 text-center">
                {#if confirmDeleteId === invoice.id}
                  {#if invoice.status === 'draft'}
                    <form method="POST" action="?/deleteInvoice" use:enhance={() => {
                      deleting = true;
                      return async ({ update }) => {
                        deleting = false;
                        confirmDeleteId = null;
                        await update();
                      };
                    }}>
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      <div class="flex items-center gap-1">
                        <button
                          type="submit"
                          disabled={deleting}
                          class="text-xs font-semibold text-red-600 hover:text-red-800 active:text-red-900 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {#if deleting}<Spinner />{/if}
                          Yes
                        </button>
                        <button
                          type="button"
                          onclick={() => (confirmDeleteId = null)}
                          class="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    </form>
                  {:else}
                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        onclick={() => { confirmDeleteInvoice = invoice; confirmDeleteId = null; }}
                        class="text-xs font-semibold text-red-600 hover:text-red-800 active:text-red-900 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onclick={() => (confirmDeleteId = null)}
                        class="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  {/if}
                {:else}
                  <button
                    type="button"
                    onclick={() => (confirmDeleteId = invoice.id)}
                    class="text-gray-400 hover:text-red-500 active:text-red-700 font-bold text-base leading-none transition-colors"
                    aria-label="Delete invoice"
                  >x</button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

{#if confirmDeleteInvoice}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-modal-title"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6 space-y-4">
      <h2 id="delete-modal-title" class="text-base font-bold text-red-700">
        Delete {confirmDeleteInvoice.status} invoice?
      </h2>
      <dl class="text-sm space-y-1.5 text-gray-700">
        <div class="flex justify-between">
          <dt class="text-gray-500">Invoice</dt>
          <dd class="font-medium font-mono">{confirmDeleteInvoice.invoice_number}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-500">Client</dt>
          <dd>{confirmDeleteInvoice.clients?.name ?? '—'}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-500">Date</dt>
          <dd>{confirmDeleteInvoice.invoice_date ? formatDate(confirmDeleteInvoice.invoice_date) : '—'}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-500">Status</dt>
          <dd class="capitalize font-semibold">{confirmDeleteInvoice.status}</dd>
        </div>
        <div class="flex justify-between border-t border-gray-100 pt-1.5">
          <dt class="text-gray-500">Total</dt>
          <dd class="font-bold">{formatCurrency(confirmDeleteInvoice.total)}</dd>
        </div>
      </dl>
      <p class="text-xs text-red-600">
        This invoice has been {confirmDeleteInvoice.status}. Deleting it cannot be undone.
      </p>
      <form
        method="POST"
        action="?/deleteInvoice"
        use:enhance={() => {
          deleting = true;
          return async ({ update }) => {
            deleting = false;
            confirmDeleteInvoice = null;
            await update();
          };
        }}
        class="flex gap-3 justify-end pt-2"
      >
        <input type="hidden" name="invoice_id" value={confirmDeleteInvoice.id} />
        <button
          type="button"
          onclick={() => (confirmDeleteInvoice = null)}
          class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={deleting}
          class="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          {#if deleting}<Spinner />{/if}
          Delete
        </button>
      </form>
    </div>
  </div>
{/if}
