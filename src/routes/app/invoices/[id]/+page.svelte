<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import type { LineItem } from '$lib/types';
  import { formatCurrency, formatDate } from '$lib/utils';
  import { enhance } from '$app/forms';
  import InvoiceView from '$lib/components/InvoiceView.svelte';
  import Spinner from '$lib/components/Spinner.svelte';

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

  /** Form submission states — prevents double clicks */
  let statusSubmitting = $state(false);
  let savingItems = $state(false);
  let sending = $state(false);

  /** Controls the email confirmation modal */
  let showEmailModal = $state(false);

  /**
   * Remove an editable line item by index.
   * @param index - position in editItems to remove
   */
  function deleteRow(index: number) {
    editItems = editItems.filter((_, i) => i !== index);
  }

  /**
   * Add a blank expense row at the start (expenses group).
   */
  function addExpense() {
    editItems = [
      {
        id: '',
        invoice_id: data.invoice.id,
        type: 'expense',
        description: '',
        duration_raw: null,
        duration_rounded: null,
        rate: null,
        amount: 0,
        sort_order: 0,
      },
      ...editItems,
    ];
  }

  /**
   * Round a duration string "h:mm:ss" or "h:mm" up to the nearest 15 minutes.
   * @param raw - raw duration string
   * @returns "h:mm" format
   */
  function roundDuration(raw: string): string {
    const parts = raw.trim().split(':').map(Number);
    let totalSeconds = 0;
    if (parts.length === 3) totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) totalSeconds = parts[0] * 3600 + parts[1] * 60;
    if (totalSeconds <= 0) return '0:15';
    const fifteenMin = 15 * 60;
    const rounded = Math.ceil(totalSeconds / fifteenMin) * fifteenMin;
    const h = Math.floor(rounded / 3600);
    const m = Math.floor((rounded % 3600) / 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Recalculate rounded duration and amount when raw duration changes.
   * @param index - position in editItems array
   * @param rawValue - new raw duration string
   */
  function onRawDurationChange(index: number, rawValue: string) {
    editItems[index].duration_raw = rawValue;
    editItems[index].duration_rounded = roundDuration(rawValue);
    const rate = editItems[index].rate ?? 0;
    const parts = editItems[index].duration_rounded!.split(':').map(Number);
    const hours = parts[0] + (parts[1] || 0) / 60;
    editItems[index].amount = Math.round(hours * rate * 100) / 100;
  }

  /**
   * Add a blank time entry row at the end (time group).
   */
  function addTimeEntry() {
    editItems = [
      ...editItems,
      {
        id: '',
        invoice_id: data.invoice.id,
        type: 'time',
        description: '',
        duration_raw: '0:15:00',
        duration_rounded: '0:15',
        rate: data.invoice.clients?.hourly_rate ?? 0,
        amount: 0,
        sort_order: editItems.length,
      },
    ];
  }

  /** Expense items (shown first) */
  let editExpenses = $derived(editItems.filter(i => i.type === 'expense'));

  /** Time items (shown after separator) */
  let editTimeItems = $derived(editItems.filter(i => i.type === 'time'));

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
  let copied = $state(false);
  async function copyLink() {
    const url = `${window.location.origin}/invoices/${data.invoice.public_token}`;
    await navigator.clipboard.writeText(url);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  /** Status badge colors */
  const statusStyle: Record<string, string> = {
    draft: 'background:#6b7280; color:#fff;',
    sent: 'background:#2563eb; color:#fff;',
    paid: 'background:#16a34a; color:#fff;',
  };

  /** Owner name for email preview */
  let ownerName = $derived(data.settings?.owner_name ?? 'Alvar Sirlin');

  /** Client record from joined invoice data */
  let client = $derived(data.invoice.clients);

  /** Whether running on localhost — email sending is disabled */
  let isLocalhost = $derived(
    typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  );
</script>

<div class="max-w-4xl mx-auto p-6 space-y-8">

  <!-- Header -->
  <div class="flex items-center gap-4 flex-wrap">
    <form
      method="POST"
      action="?/updateInvoiceNumber"
      use:enhance
      id="invoice-number-form"
    >
      <input
        type="text"
        name="invoice_number"
        value={data.invoice.invoice_number}
        onblur={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()}
        class="text-2xl font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-orange-400 focus:outline-none px-1"
        style="color: #1a1a6e;"
        aria-label="Invoice number"
      />
    </form>

    <span
      class="px-3 py-1 rounded-full text-sm font-semibold capitalize"
      style={statusStyle[data.invoice.status] ?? statusStyle.draft}
    >
      {data.invoice.status}
    </span>

    <button
      type="button"
      onclick={copyLink}
      class="ml-auto px-4 py-1.5 rounded border text-sm font-medium transition-colors hover:bg-[#1a1a6e] hover:text-white active:bg-[#14145a] active:text-white"
      style="border-color:#1a1a6e; color:{copied ? '#fff' : '#1a1a6e'}; background:{copied ? '#16a34a' : 'transparent'};"
    >
      {copied ? 'Copied' : 'Copy Link'}
    </button>
  </div>

  <!-- Status actions -->
  <div class="flex items-center gap-4 flex-wrap">
    {#if data.invoice.status === 'draft'}
      <form method="POST" action="?/updateStatus" use:enhance={() => {
        statusSubmitting = true;
        return async ({ update }) => { statusSubmitting = false; await update(); };
      }}>
        <input type="hidden" name="status" value="sent" />
        <button
          type="submit"
          disabled={statusSubmitting}
          class="px-5 py-2 rounded text-white text-sm font-medium transition-colors bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {#if statusSubmitting}<Spinner />{/if}
          Mark Sent
        </button>
      </form>
    {:else if data.invoice.status === 'sent'}
      <form method="POST" action="?/updateStatus" use:enhance={() => {
        statusSubmitting = true;
        return async ({ update }) => { statusSubmitting = false; await update(); };
      }}>
        <input type="hidden" name="status" value="paid" />
        <button
          type="submit"
          disabled={statusSubmitting}
          class="px-5 py-2 rounded text-white text-sm font-medium transition-colors bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {#if statusSubmitting}<Spinner />{/if}
          Mark Paid
        </button>
      </form>
    {:else if data.invoice.status === 'paid' && data.invoice.paid_date}
      <p class="text-sm text-gray-600">
        Paid on <span class="font-semibold">{formatDate(data.invoice.paid_date)}</span>
      </p>
    {/if}

    <!-- Preview Email — always available; Send inside modal is disabled on localhost -->
    <button
      type="button"
      onclick={() => (showEmailModal = true)}
      class="px-5 py-2 rounded text-white text-sm font-medium transition-colors bg-[#ff3103] hover:bg-[#d04516] active:bg-[#b83d13]"
    >
      Preview Email
    </button>

    <!-- Open printable invoice in new tab -->
    <a
      href="/invoices/{data.invoice.public_token}"
      target="_blank"
      class="px-4 py-1.5 rounded border text-sm font-medium transition-colors border-[#1a1a6e] text-[#1a1a6e] hover:bg-[#1a1a6e] hover:text-white active:bg-[#14145a]"
    >
      Print / PDF
    </a>

    {#if form?.error}
      <p class="text-sm text-red-600">{form.error}</p>
    {/if}
  </div>

  <!-- Email confirmation modal -->
  {#if showEmailModal}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => { if (e.target === e.currentTarget) showEmailModal = false; }}
      onkeydown={(e) => { if (e.key === 'Escape') showEmailModal = false; }}
    >
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 space-y-4">
        <h2 class="text-lg font-bold" style="color: #1a1a6e;">Send Invoice Email</h2>

        <div class="text-sm space-y-2 border rounded p-4 bg-gray-50">
          <div>
            <span class="font-semibold text-gray-600">To:</span>
            {client?.name ?? '—'}
            {#if client?.email}
              &lt;{client.email}&gt;
            {:else}
              <span class="text-red-500">No email on file</span>
            {/if}
          </div>
          <div>
            <span class="font-semibold text-gray-600">Subject:</span>
            Invoice {data.invoice.invoice_number} from {ownerName}
          </div>
          <hr class="my-2" />
          <div class="text-gray-700">
            <p>Hi {client?.name ?? ''},</p>
            <p class="mt-1">Please find your invoice <strong>{data.invoice.invoice_number}</strong> at the link below.</p>
            <p class="mt-1 text-[#2563eb] underline break-all">[public link]</p>
            <p class="mt-1">{ownerName}</p>
          </div>
        </div>

        <p class="text-xs text-gray-500">A copy will be sent to your sender email.</p>

        {#if isLocalhost}
          <p class="text-sm text-amber-600 font-medium">Sending is disabled on localhost. Preview only.</p>
        {/if}

        <div class="flex gap-3 pt-2">
          <form method="POST" action="?/sendEmail" use:enhance={() => {
            sending = true;
            return async ({ update, result }) => {
              sending = false;
              if (result.type !== 'failure') showEmailModal = false;
              await update();
            };
          }}>
            <button
              type="submit"
              disabled={sending || !client?.email || isLocalhost}
              class="px-5 py-2 rounded text-white text-sm font-semibold transition-colors bg-[#ff3103] hover:bg-[#d04516] active:bg-[#b83d13] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {#if sending}<Spinner />{/if}
              Confirm & Send
            </button>
          </form>
          <button
            type="button"
            onclick={() => (showEmailModal = false)}
            disabled={sending}
            class="px-5 py-2 rounded border text-sm font-medium transition-colors border-gray-300 text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Editable line items (draft only) -->
  {#if isDraft}
    <section class="space-y-3">
      <h2 class="text-lg font-semibold" style="color: #1a1a6e;">Edit Line Items</h2>
      <!-- Expenses table -->
      {#if editExpenses.length > 0}
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left" style="background:#1a1a6e; color:#fff;">
                <th class="px-3 py-2 font-semibold">Expense</th>
                <th class="px-3 py-2 font-semibold w-28 text-right">Amount</th>
                <th class="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {#each editItems as item, i (i)}
                {#if item.type === 'expense'}
                  <tr class="border-b border-gray-200 hover:bg-gray-50 bg-amber-50/50">
                    <td class="px-3 py-1.5">
                      <input
                        type="text"
                        bind:value={item.description}
                        placeholder="Expense description"
                        class="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-orange-400 rounded px-1"
                      />
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
                      <button type="button" onclick={() => deleteRow(i)}
                        class="text-gray-400 hover:text-red-500 active:text-red-700 font-bold text-base leading-none transition-colors"
                        aria-label="Delete row">x</button>
                    </td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <!-- Time entries table -->
      {#if editTimeItems.length > 0}
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left" style="background:#1a1a6e; color:#fff;">
                <th class="px-3 py-2 font-semibold">Description</th>
                <th class="px-3 py-2 font-semibold w-24">Raw</th>
                <th class="px-3 py-2 font-semibold w-24" style="color:#ff3103;">Rounded</th>
                <th class="px-3 py-2 font-semibold w-28 text-right">Amount</th>
                <th class="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {#each editItems as item, i (i)}
                {#if item.type === 'time'}
                  <tr class="border-b border-gray-200 hover:bg-gray-50">
                    <td class="px-3 py-1.5">
                      <input
                        type="text"
                        bind:value={item.description}
                        class="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-orange-400 rounded px-1"
                      />
                    </td>
                    <td class="px-3 py-1.5">
                      <input
                        type="text"
                        value={item.duration_raw ?? ''}
                        oninput={(e) => onRawDurationChange(i, (e.currentTarget as HTMLInputElement).value)}
                        placeholder="h:mm:ss"
                        class="w-full border-0 bg-transparent font-mono text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 rounded px-1"
                      />
                    </td>
                    <td class="px-3 py-1.5 font-mono text-xs" style="color:#ff3103;">
                      {item.duration_rounded ?? '—'}
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
                      <button type="button" onclick={() => deleteRow(i)}
                        class="text-gray-400 hover:text-red-500 active:text-red-700 font-bold text-base leading-none transition-colors"
                        aria-label="Delete row">x</button>
                    </td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <div class="flex gap-4">
        <button
          type="button"
          onclick={addExpense}
          class="text-sm font-medium underline transition-colors hover:text-[#b83d13] active:text-[#8a2e0e]"
          style="color:#ff3103;"
        >
          + Add expense
        </button>
        <button
          type="button"
          onclick={addTimeEntry}
          class="text-sm font-medium underline transition-colors text-[#1a1a6e] hover:text-[#14145a] active:text-[#0f0f4a]"
        >
          + Add time entry
        </button>
      </div>

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

      <form method="POST" action="?/updateLineItems" onsubmit={onSaveSubmit} use:enhance={() => {
        savingItems = true;
        return async ({ update }) => { savingItems = false; await update(); };
      }}>
        <input type="hidden" name="items" />
        <button
          type="submit"
          disabled={savingItems}
          class="px-6 py-2.5 rounded text-white font-semibold text-sm transition-colors bg-[#1a1a6e] hover:bg-[#14145a] active:bg-[#0f0f4a] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {#if savingItems}<Spinner />{/if}
          Save Changes
        </button>
      </form>
    </section>
  {/if}

  <!-- Invoice preview -->
  <InvoiceView invoice={data.invoice} items={data.items} client={data.invoice.clients} settings={data.settings} />

</div>
