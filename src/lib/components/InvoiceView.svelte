<script lang="ts">
  import type { Invoice, LineItem, Client, Settings } from '$lib/types';
  import { formatCurrency, formatDate } from '$lib/utils';

  let { invoice, items, client, settings }: {
    invoice: Invoice;
    items: LineItem[];
    client: Client;
    settings: Settings;
  } = $props();

  /**
   * Parse a duration string "H:MM" into decimal hours.
   * @param dur - duration string or null
   * @returns decimal hours
   */
  function parseHours(dur: string | null): number {
    if (!dur) return 0;
    const [h, m] = dur.split(':').map(Number);
    return h + (m || 0) / 60;
  }
</script>

<div class="max-w-3xl mx-auto p-10 font-sans text-[#1a1a6e]">

  <!-- Header row -->
  <div class="flex justify-between items-start mb-8">
    <div>
      <h1 class="text-4xl font-bold mb-4">Invoice</h1>
      <div class="text-sm space-y-1">
        <div><span class="font-bold">Invoice ID:</span> #{invoice.invoice_number}</div>
        <div><span class="font-bold">Invoice Date:</span> {formatDate(invoice.invoice_date)}</div>
        {#if invoice.due_date}
          <div><span class="font-bold">Due date:</span> {formatDate(invoice.due_date)}</div>
        {/if}
      </div>
    </div>
    <!-- Logo: orange circle with crosshair -->
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="32" fill="#e8501a"/>
      <line x1="32" y1="8" x2="32" y2="56" stroke="white" stroke-width="3"/>
      <line x1="8" y1="32" x2="56" y2="32" stroke="white" stroke-width="3"/>
      <circle cx="32" cy="32" r="10" fill="none" stroke="white" stroke-width="3"/>
    </svg>
  </div>

  <!-- Billing info -->
  <div class="grid grid-cols-2 gap-8 mb-8 text-sm">
    <div>
      <div class="font-bold mb-1">Billed to:</div>
      <div>{client.name}</div>
      {#if client.company}<div>{client.company}</div>{/if}
      {#if client.project}<div>{client.project}</div>{/if}
    </div>
    <div>
      <div class="font-bold mb-1">Pay to:</div>
      <div>{settings.owner_name}</div>
      {#if settings.address}
        {#each settings.address.split('\n') as line}
          <div>{line}</div>
        {/each}
      {/if}
      {#if settings.zelle}
        <div class="mt-1">Zelle (preferred): {settings.zelle}</div>
      {/if}
    </div>
  </div>

  <!-- Line items -->
  <table class="w-full text-sm mb-0">
    <thead>
      <tr class="border-t border-b border-[#1a1a6e] uppercase text-xs">
        <th class="text-left py-2 font-semibold">Description</th>
        <th class="text-right py-2 font-semibold text-[#e8501a]">Quantity</th>
        <th class="text-right py-2 font-semibold"></th>
      </tr>
    </thead>
    <tbody>
      {#each items as item}
        <tr class="border-b border-gray-200">
          <td class="py-2">{item.description}</td>
          <td class="py-2 text-right text-[#e8501a]">
            {item.duration_rounded ?? '—'}
          </td>
          <td class="py-2 text-right">{formatCurrency(item.amount, client.currency)}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <!-- Subtotal row -->
  <div class="flex justify-between items-center border-t border-b border-[#1a1a6e] py-2 mt-0 text-sm">
    <span class="font-semibold text-[#e8501a] uppercase">Subtotal</span>
    <div class="flex gap-12">
      <span class="text-[#e8501a]">
        {items.filter(i => i.type === 'time').reduce((s, i) => s + parseHours(i.duration_rounded), 0).toFixed(2)}h
      </span>
      <span>{formatCurrency(invoice.subtotal, client.currency)}</span>
    </div>
  </div>

  <!-- Tax row (only if tax_rate > 0) -->
  {#if invoice.tax_rate > 0}
    <div class="flex justify-end gap-12 text-sm py-2 border-b border-gray-200">
      <span>Tax ({(invoice.tax_rate * 100).toFixed(0)}%)</span>
      <span>{formatCurrency(invoice.tax_amount, client.currency)}</span>
    </div>
  {/if}

  <!-- Total -->
  <div class="flex justify-end mt-4">
    <div class="text-right">
      <div class="text-xs uppercase tracking-wide text-[#1a1a6e] mb-1">Total</div>
      <div class="text-3xl font-bold">{formatCurrency(invoice.total, client.currency)}</div>
    </div>
  </div>

</div>
