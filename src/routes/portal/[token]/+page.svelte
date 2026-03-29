<script lang="ts">
  import type { PageData } from './$types';
  import { formatCurrency, formatDate } from '$lib/utils';

  let { data }: { data: PageData } = $props();

  /** Badge color by invoice/agreement status */
  function badgeClass(status: string) {
    if (status === 'paid' || status === 'accepted') return 'bg-green-100 text-green-800';
    if (status === 'sent') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  }
</script>

<svelte:head>
  <title>Portal — {data.client.name}</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-6 py-10 font-sans text-[#1a1a6e]">

  <!-- Header -->
  <div class="flex justify-between items-start mb-10">
    <div>
      <h1 class="text-3xl font-bold">{data.client.name}</h1>
      {#if data.client.company}
        <div class="text-gray-500">{data.client.company}</div>
      {/if}
    </div>
    {#if data.settings?.owner_name}
      <div class="text-right text-sm text-gray-500">
        <div class="font-medium text-[#1a1a6e]">{data.settings.owner_name}</div>
        {#if data.settings.email}<div>{data.settings.email}</div>{/if}
      </div>
    {/if}
  </div>

  <!-- Invoices -->
  <section class="mb-10">
    <h2 class="text-lg font-semibold mb-3 border-b border-gray-200 pb-2">Invoices</h2>
    {#if data.invoices.length === 0}
      <p class="text-gray-400 text-sm">No invoices yet.</p>
    {:else}
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase text-gray-400 border-b">
            <th class="pb-2">Invoice</th>
            <th class="pb-2">Date</th>
            <th class="pb-2">Status</th>
            <th class="pb-2 text-right">Total</th>
            <th class="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {#each data.invoices as inv}
            <tr class="border-b hover:bg-gray-50 transition-colors">
              <td class="py-3 font-medium">#{inv.invoice_number}</td>
              <td class="py-3 text-gray-500">{formatDate(inv.invoice_date)}</td>
              <td class="py-3">
                <span class="capitalize text-xs px-2 py-1 rounded {badgeClass(inv.status)}">{inv.status}</span>
              </td>
              <td class="py-3 text-right">{formatCurrency(inv.total, inv.currency)}</td>
              <td class="py-3 text-right">
                <a href="/invoices/{inv.public_token}"
                  class="text-[#1a1a6e] hover:underline text-xs">View</a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>

  <!-- Agreements -->
  <section>
    <h2 class="text-lg font-semibold mb-3 border-b border-gray-200 pb-2">Agreements</h2>
    {#if data.agreements.length === 0}
      <p class="text-gray-400 text-sm">No agreements yet.</p>
    {:else}
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase text-gray-400 border-b">
            <th class="pb-2">Title</th>
            <th class="pb-2">Status</th>
            <th class="pb-2">Date</th>
            <th class="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {#each data.agreements as ag}
            <tr class="border-b hover:bg-gray-50 transition-colors">
              <td class="py-3 font-medium">{ag.title}</td>
              <td class="py-3">
                <span class="capitalize text-xs px-2 py-1 rounded {badgeClass(ag.status)}">{ag.status}</span>
              </td>
              <td class="py-3 text-gray-500">
                {ag.accepted_at ? formatDate(ag.accepted_at.slice(0, 10)) : ag.sent_at ? formatDate(ag.sent_at.slice(0, 10)) : '—'}
              </td>
              <td class="py-3 text-right">
                <a href="/agreements/{ag.public_token}"
                  class="text-[#1a1a6e] hover:underline text-xs">View</a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>

</div>
