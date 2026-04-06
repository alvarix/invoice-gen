<script lang="ts">
  import type { Invoice, LineItem, Client, Settings } from '$lib/types';
  import { formatCurrency, formatDate } from '$lib/utils';

  let { invoice, items, client, settings, notesHtml = null }: {
    invoice: Invoice;
    items: LineItem[];
    client: Client;
    settings: Settings;
    /** Pre-rendered markdown HTML for optional invoice notes */
    notesHtml?: string | null;
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

<!-- Bake header string directly into @page content — var() not supported in margin boxes -->
<svelte:head>
  {@html `<style>@page { @top-center { content: "${settings.owner_name ?? 'Alvar Sirlin'} | Invoice | ${formatDate(invoice.invoice_date)}"; font-size: 10px; color: #337638; padding-bottom: 4px; } }</style>`}
</svelte:head>

<div class="max-w-3xl mx-auto p-10 font-sans text-[#337638]">

  <!-- Header row -->
  <div class="flex justify-between items-start mb-8">
    <div>
      <h1 class="text-4xl font-bold ">Invoice</h1>
      <h2 class="text-xl mb-4"><a class='text-[#ff3103]' href='https://alvarsirlin.dev' target='_blank'>alvarsirlin.dev</a></h2>
      <div class="text-sm space-y-1">
        <div><span class="font-bold">Invoice ID:</span> #{invoice.invoice_number}</div>
        <div>{settings.owner_name ?? 'Alvar Sirlin'} | Invoice | {formatDate(invoice.invoice_date)}</div>
        {#if invoice.due_date}
          <div><span class="font-bold">Due date:</span> {formatDate(invoice.due_date)}</div>
        {/if}
      </div>
    </div>
    <!-- Logo: orange circle with crosshair -->
    <svg width="20%" height="20%" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 180 180">
  <defs>
    <style>
      .cls-1 {
        fill: #ff3103;
      }
    </style>
  </defs>
  <g>
    <g id="Layer_1">
      <g id="Layer_1-2" data-name="Layer_1">
        <path class="cls-1" d="M0,168V11h11V0h157v11h12v157h-12v12H11v-12H0ZM44.9,135v-11.9h-11.7v11.8h11.8v10.8h32.9v-10.7h23.1v10.8h33.9v-10.8h10.9v-11.7h-10.8v11.8h-34.1v-34.1h10.8v-10.8h-44.7v11h11v33.9h-33.1,0ZM33.1,67.2v10.7h12.2v-10.8h10.6v-11.2h-11v-10.6h-12.2v10.7h-10.5v11.2s10.9,0,10.9,0ZM146,45.3h-11.4v10.8h-11.5v11.2h11.7v10.6h11.4v-10.8h10.5v-11.2h-10.8v-10.5h.1Z"/>
      </g>
    </g>
  </g>
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
      {#if settings.owner_name}<div>{settings.owner_name}</div>{/if}
      {#if settings.address}
        {#each settings.address.split('\n') as line}
          <div>{line}</div>
        {/each}
      {/if}
      {#if settings.email}
        <div class="mt-1">{settings.email}</div>
      {/if}
      {#if settings.phone}
        <div>{settings.phone}</div>
      {/if}
      {#if settings.zelle}
        <div class="mt-1">Zelle (preferred): {settings.zelle}</div>
      {/if}
    </div>
  </div>

  <!-- Total due — always visible on page 1 -->
  <div class="flex justify-between items-center rounded px-4 py-3 mb-6" style="background:#337638;">
    <span class="text-white text-sm font-semibold uppercase tracking-wide">Total Due</span>
    <span class="text-white text-2xl font-bold">{formatCurrency(invoice.total, client.currency)}</span>
  </div>

  <!-- Expenses (if any) -->
  {#if items.some(i => i.type === 'expense')}
    <table class="w-full text-sm mb-4">
      <thead>
        <tr class="border-t border-b border-[#337638] uppercase text-xs">
          <th class="text-left py-2 font-semibold">Expenses</th>
          <th class="text-right py-2 font-semibold"></th>
        </tr>
      </thead>
      <tbody>
        {#each items.filter(i => i.type === 'expense') as item}
          <tr class="border-b border-gray-200">
            <td class="py-2">{item.description}</td>
            <td class="py-2 text-right">{formatCurrency(item.amount, client.currency)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <!-- Time entries -->
  {#if items.some(i => i.type === 'time')}
    <table class="w-full text-sm mb-0">
      <thead>
        <tr class="border-t border-b border-[#337638] uppercase text-xs">
          <th class="text-left py-2 font-semibold">Description</th>
          <th class="text-left py-2 font-semibold text-gray-400 w-24">Date</th>
          <th class="text-right py-2 font-semibold text-[#ff3103]">Quantity</th>
          <th class="text-right py-2 font-semibold"></th>
        </tr>
      </thead>
      <tbody>
        {#each items.filter(i => i.type === 'time') as item}
          <tr class="border-b border-gray-200">
            <td class="py-2">{item.description}</td>
            <td class="py-2 text-gray-400 text-xs">{item.date ? formatDate(item.date) : ''}</td>
            <td class="py-2 text-right text-[#ff3103]">
              {item.duration_rounded ?? '—'}
            </td>
            <td class="py-2 text-right">{formatCurrency(item.amount, client.currency)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <!-- Subtotal row -->
  <div class="flex justify-between items-center border-t border-b border-[#337638] py-2 mt-0 text-sm">
    <span class="font-semibold text-[#ff3103] uppercase">Subtotal</span>
    <div class="flex gap-12">
      <span class="text-[#ff3103]">
        {items.filter(i => i.type === 'time').reduce((s, i) => s + parseHours(i.duration_rounded), 0).toFixed(2)}h
      </span>
      <span>{formatCurrency(invoice.subtotal, client.currency)}</span>
    </div>
  </div>

  <!-- Service agreement debit (only if debit_hours > 0) -->
  {#if invoice.debit_hours > 0}
    <div class="flex justify-between items-center border-b border-gray-200 py-2 text-sm">
      <span class="text-gray-600">Service agreement debit</span>
      <div class="flex gap-12">
        <span class="text-gray-500">{invoice.debit_hours}h</span>
        <span class="text-gray-600">−{formatCurrency(invoice.debit_amount, client.currency)}</span>
      </div>
    </div>
  {/if}

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
      <div class="text-xs uppercase tracking-wide text-[#337638] mb-1">Total</div>
      <div class="text-3xl font-bold">{formatCurrency(invoice.total, client.currency)}</div>
    </div>
  </div>

  <!-- Notes (optional markdown) -->
  {#if notesHtml}
    <div class="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-700
      [&_h1]:text-[#337638] [&_h2]:text-[#337638] [&_h3]:text-[#337638] [&_a]:text-[#ff3103]
      prose prose-sm max-w-none">
      {@html notesHtml}
    </div>
  {/if}

</div>
