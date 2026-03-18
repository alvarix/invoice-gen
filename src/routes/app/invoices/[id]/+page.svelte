<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import type { LineItem } from '$lib/types';
  import { formatCurrency, formatDate } from '$lib/utils';
  import { enhance } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  /** Editable copy of line items — only used in draft mode */
  let editItems = $state<LineItem[]>(data.items.map((i) => ({ ...i })));

  /** Whether there are unsaved edits relative to the server state */
  let isDraft = $derived(data.invoice.status === 'draft');

  /** Subtotal computed from editable items */
  let editSubtotal = $derived(editItems.reduce((s, i) => s + Number(i.amount), 0));

  /** Tax amount from invoice tax_rate */
  let editTaxAmount = $derived(Math.round(editSubtotal * data.invoice.tax_rate * 100) / 100);

  /** Total including tax */
  let editTotal = $derived(editSubtotal + editTaxAmount);

  /** Total hours from time items for the preview section */
  let totalHours = $derived(
    data.items
      .filter((i) => i.type === 'time' && i.duration_rounded)
      .map((i) => i.duration_rounded ?? '')
      .join(', ')
  );

  /**
   * Remove an editable line item by index.
   * @param index - position in editItems to remove
   */
  function deleteRow(index: number) {
    editItems = editItems.filter((_, i) => i !== index);
  }

  /**
   * Append a blank expense row for manual entry.
   */
  function addExpense() {
    editItems = [
      ...editItems,
      {
        id: '',
        invoice_id: data.invoice.id,
        type: 'expense',
        description: '',
        duration_raw: null,
        duration_rounded: null,
        rate: null,
        amount: 0,
        sort_order: editItems.length,
      },
    ];
  }

  /**
   * Before the save-items form submits, serialize editItems into the hidden input.
   * @param e - the submit event
   */
  function onSaveSubmit(e: SubmitEvent) {
    const f = e.currentTarget as HTMLFormElement;
    const hidden = f.querySelector('input[name="items"]') as HTMLInputElement;
    hidden.value = JSON.stringify(editItems);
  }

  /**
   * Copy the public invoice link to clipboard.
   */
  async function copyLink() {
    const url = `${window.location.origin}/invoices/${data.invoice.public_token}`;
    await navigator.clipboard.writeText(url);
  }

  /** Status badge colors */
  const statusStyle: Record<string, string> = {
    draft: 'background:#6b7280; color:#fff;',
    sent: 'background:#2563eb; color:#fff;',
    paid: 'background:#16a34a; color:#fff;',
  };
</script>

<div class="max-w-4xl mx-auto p-6 space-y-8">

  <!-- Header -->
  <div class="flex items-center gap-4 flex-wrap">
    <h1 class="text-2xl font-bold" style="color: #1a1a6e;">
      Invoice {data.invoice.invoice_number}
    </h1>

    <span
      class="px-3 py-1 rounded-full text-sm font-semibold capitalize"
      style={statusStyle[data.invoice.status] ?? statusStyle.draft}
    >
      {data.invoice.status}
    </span>

    <button
      type="button"
      onclick={copyLink}
      class="ml-auto px-4 py-1.5 rounded border text-sm font-medium transition-colors"
      style="border-color:#1a1a6e; color:#1a1a6e;"
    >
      Copy Link
    </button>
  </div>

  <!-- Status actions -->
  <div class="flex items-center gap-4 flex-wrap">
    {#if data.invoice.status === 'draft'}
      <form method="POST" action="?/updateStatus" use:enhance>
        <input type="hidden" name="status" value="sent" />
        <button
          type="submit"
          class="px-5 py-2 rounded text-white text-sm font-medium"
          style="background:#2563eb;"
        >
          Mark Sent
        </button>
      </form>
    {:else if data.invoice.status === 'sent'}
      <form method="POST" action="?/updateStatus" use:enhance>
        <input type="hidden" name="status" value="paid" />
        <button
          type="submit"
          class="px-5 py-2 rounded text-white text-sm font-medium"
          style="background:#16a34a;"
        >
          Mark Paid
        </button>
      </form>
    {:else if data.invoice.status === 'paid' && data.invoice.paid_date}
      <p class="text-sm text-gray-600">
        Paid on <span class="font-semibold">{formatDate(data.invoice.paid_date)}</span>
      </p>
    {/if}

    <!-- Send Email -->
    <form method="POST" action="?/sendEmail" use:enhance>
      <button
        type="submit"
        class="px-5 py-2 rounded text-white text-sm font-medium"
        style="background:#e8501a;"
      >
        Send Email
      </button>
    </form>

    {#if form?.error}
      <p class="text-sm text-red-600">{form.error}</p>
    {/if}
  </div>

  <!-- Editable line items (draft only) -->
  {#if isDraft}
    <section class="space-y-3">
      <h2 class="text-lg font-semibold" style="color: #1a1a6e;">Edit Line Items</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="text-left" style="background:#1a1a6e; color:#fff;">
              <th class="px-3 py-2 font-semibold">Description</th>
              <th class="px-3 py-2 font-semibold w-28" style="color:#e8501a;">Rounded</th>
              <th class="px-3 py-2 font-semibold w-28 text-right">Amount</th>
              <th class="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {#each editItems as item, i (i)}
              <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-3 py-1.5">
                  <input
                    type="text"
                    bind:value={item.description}
                    class="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-orange-400 rounded px-1"
                  />
                </td>
                <td class="px-3 py-1.5" style="color:#e8501a;">
                  {#if item.type === 'time'}
                    <input
                      type="text"
                      bind:value={item.duration_rounded}
                      class="w-full border-0 bg-transparent font-mono text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 rounded px-1"
                    />
                  {:else}
                    <span class="text-gray-400 text-xs">—</span>
                  {/if}
                </td>
                <td class="px-3 py-1.5 text-right">
                  <input
                    type="number"
                    step="0.01"
                    bind:value={item.amount}
                    class="w-full text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-orange-400 rounded px-1"
                  />
                </td>
                <td class="px-3 py-1.5 text-center">
                  <button
                    type="button"
                    onclick={() => deleteRow(i)}
                    class="text-gray-400 hover:text-red-500 font-bold text-base leading-none"
                    aria-label="Delete row"
                  >
                    x
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onclick={addExpense}
        class="text-sm font-medium underline"
        style="color:#e8501a;"
      >
        + Add expense row
      </button>

      <!-- Edit totals preview -->
      <div class="ml-auto w-64 space-y-1 text-sm text-right pt-2">
        <div class="flex justify-between">
          <span class="text-gray-600">Subtotal</span>
          <span class="font-medium">{formatCurrency(editSubtotal, data.invoice.clients.currency)}</span>
        </div>
        {#if data.invoice.tax_rate > 0}
          <div class="flex justify-between text-gray-600">
            <span>Tax ({(data.invoice.tax_rate * 100).toFixed(0)}%)</span>
            <span>{formatCurrency(editTaxAmount, data.invoice.clients.currency)}</span>
          </div>
        {/if}
        <div class="flex justify-between font-bold border-t border-gray-300 pt-1" style="color:#1a1a6e;">
          <span>Total</span>
          <span>{formatCurrency(editTotal, data.invoice.clients.currency)}</span>
        </div>
      </div>

      <form method="POST" action="?/updateLineItems" onsubmit={onSaveSubmit}>
        <input type="hidden" name="items" />
        <button
          type="submit"
          class="px-6 py-2.5 rounded text-white font-semibold text-sm"
          style="background:#1a1a6e;"
        >
          Save Changes
        </button>
      </form>
    </section>
  {/if}

  <!-- Invoice preview -->
  <section class="border border-gray-200 rounded-lg p-8 bg-white space-y-6 text-sm">
    <!-- Preview header -->
    <div class="flex justify-between items-start">
      <div>
        <h2 class="text-xl font-bold" style="color:#1a1a6e;">INVOICE</h2>
        <p class="font-mono text-base mt-1" style="color:#e8501a;">{data.invoice.invoice_number}</p>
      </div>
      <div class="text-right text-gray-600 space-y-0.5">
        <p><span class="font-semibold text-gray-700">Date:</span> {formatDate(data.invoice.invoice_date)}</p>
        {#if data.invoice.due_date}
          <p><span class="font-semibold text-gray-700">Due:</span> {formatDate(data.invoice.due_date)}</p>
        {/if}
      </div>
    </div>

    <!-- Bill to / Pay to -->
    <div class="grid grid-cols-2 gap-8">
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wide mb-1" style="color:#1a1a6e;">Billed To</h3>
        <p class="font-semibold">{data.invoice.clients.name}</p>
        {#if data.invoice.clients.company}
          <p class="text-gray-600">{data.invoice.clients.company}</p>
        {/if}
        {#if data.invoice.clients.project}
          <p class="text-gray-500 italic">{data.invoice.clients.project}</p>
        {/if}
      </div>
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wide mb-1" style="color:#1a1a6e;">Pay To</h3>
        {#if data.settings?.owner_name}
          <p class="font-semibold">{data.settings.owner_name}</p>
        {/if}
        {#if data.settings?.address}
          {#each data.settings.address.split('\n') as line}
            <p class="text-gray-600">{line}</p>
          {/each}
        {/if}
        {#if data.settings?.zelle}
          <p class="text-gray-600 mt-1">Zelle: <span class="font-medium">{data.settings.zelle}</span></p>
        {/if}
      </div>
    </div>

    <!-- Line items table -->
    <table class="w-full border-collapse">
      <thead>
        <tr style="background:#1a1a6e; color:#fff;">
          <th class="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide">Description</th>
          <th class="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wide w-24">Hours</th>
          <th class="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wide w-28">Amount</th>
        </tr>
      </thead>
      <tbody>
        {#each data.items as item (item.id)}
          <tr class="border-b border-gray-100">
            <td class="px-3 py-2 text-gray-800">{item.description}</td>
            <td class="px-3 py-2 text-right font-mono text-xs" style="color:#e8501a;">
              {item.duration_rounded ?? '—'}
            </td>
            <td class="px-3 py-2 text-right">
              {formatCurrency(item.amount, data.invoice.clients.currency)}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="ml-auto w-64 space-y-1 text-sm">
      <div class="flex justify-between text-gray-600">
        <span>Subtotal</span>
        <span>{formatCurrency(data.invoice.subtotal, data.invoice.clients.currency)}</span>
      </div>
      {#if data.invoice.tax_rate > 0}
        <div class="flex justify-between text-gray-600">
          <span>Tax ({(data.invoice.tax_rate * 100).toFixed(0)}%)</span>
          <span>{formatCurrency(data.invoice.tax_amount, data.invoice.clients.currency)}</span>
        </div>
      {/if}
      <div class="flex justify-between font-bold text-lg border-t border-gray-300 pt-2" style="color:#1a1a6e;">
        <span>Total</span>
        <span>{formatCurrency(data.invoice.total, data.invoice.clients.currency)}</span>
      </div>
    </div>
  </section>

</div>
