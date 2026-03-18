<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { formatCurrency } from '$lib/utils';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  /** Currently selected input mode for Toggl data */
  let inputMode = $state<'paste' | 'csv'>('paste');

  /** ID of the selected client */
  let selectedClientId = $state<string>(data.clients[0]?.id ?? '');

  /** Editable line items populated after a parse action */
  let items = $state<{
    type: 'time' | 'expense';
    description: string;
    duration_raw: string | null;
    duration_rounded: string | null;
    rate: number | null;
    amount: number;
    sort_order: number;
  }[]>([]);

  // When an action returns parsed items, replace the current list
  $effect(() => {
    if (form?.parsed) {
      items = form.parsed;
    }
    // Keep client selector in sync when action echoes back client_id
    if (form?.client_id) {
      selectedClientId = form.client_id;
    }
  });

  /**
   * Remove a line item by index.
   * @param index - position in items array to remove
   */
  function deleteRow(index: number) {
    items = items.filter((_, i) => i !== index);
  }

  /**
   * Append a blank expense row for manual entry.
   */
  function addExpense() {
    items = [
      ...items,
      {
        type: 'expense',
        description: '',
        duration_raw: null,
        duration_rounded: null,
        rate: null,
        amount: 0,
        sort_order: items.length,
      },
    ];
  }

  /** Sum of all item amounts */
  let subtotal = $derived(items.reduce((s, item) => s + Number(item.amount), 0));

  /** Selected client record */
  let selectedClient = $derived(data.clients.find((c) => c.id === selectedClientId));

  /** Tax amount based on client tax rate */
  let taxAmount = $derived(
    selectedClient ? Math.round(subtotal * selectedClient.tax_rate * 100) / 100 : 0
  );

  /** Invoice total */
  let total = $derived(subtotal + taxAmount);

  /**
   * Before the generate form submits, serialize items into the hidden input.
   * @param e - the submit event from the generate form
   */
  function onGenerateSubmit(e: SubmitEvent) {
    const f = e.currentTarget as HTMLFormElement;
    const hidden = f.querySelector('input[name="items"]') as HTMLInputElement;
    hidden.value = JSON.stringify(items);
  }

</script>

<div class="max-w-4xl mx-auto p-6 space-y-8">
  <h1 class="text-2xl font-bold" style="color: #1a1a6e;">New Invoice</h1>

  <!-- Client selector -->
  <section class="space-y-2">
    <label class="block text-sm font-semibold text-gray-700" for="client-select">Client</label>
    <select
      id="client-select"
      bind:value={selectedClientId}
      class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2"
      style="--tw-ring-color: #e8501a;"
    >
      {#each data.clients as client (client.id)}
        <option value={client.id}>{client.name}{client.project ? ` — ${client.project}` : ''}</option>
      {/each}
    </select>
  </section>

  <!-- Input mode toggle -->
  <section class="space-y-4">
    <div class="flex gap-2">
      <button
        type="button"
        onclick={() => (inputMode = 'paste')}
        class="px-4 py-2 rounded font-medium text-sm border transition-colors"
        style={inputMode === 'paste'
          ? 'background:#1a1a6e; color:#fff; border-color:#1a1a6e;'
          : 'background:#fff; color:#1a1a6e; border-color:#1a1a6e;'}
      >
        Paste
      </button>
      <button
        type="button"
        onclick={() => (inputMode = 'csv')}
        class="px-4 py-2 rounded font-medium text-sm border transition-colors"
        style={inputMode === 'csv'
          ? 'background:#1a1a6e; color:#fff; border-color:#1a1a6e;'
          : 'background:#fff; color:#1a1a6e; border-color:#1a1a6e;'}
      >
        CSV
      </button>
    </div>

    {#if inputMode === 'paste'}
      <form method="POST" action="?/parseToggl" class="space-y-3">
        <input type="hidden" name="client_id" value={selectedClientId} />
        <label class="block text-sm font-semibold text-gray-700" for="toggl-paste">
          Paste Toggl entries
        </label>
        <textarea
          id="toggl-paste"
          name="toggl_text"
          rows="8"
          placeholder="description&#10;h:mm:ss&#10;description&#10;h:mm:ss"
          class="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        ></textarea>
        <button
          type="submit"
          class="px-5 py-2 rounded text-white font-medium text-sm"
          style="background:#e8501a;"
        >
          Parse
        </button>
      </form>
    {:else}
      <form method="POST" action="?/parseCSV" enctype="multipart/form-data" class="space-y-3">
        <input type="hidden" name="client_id" value={selectedClientId} />
        <label class="block text-sm font-semibold text-gray-700" for="csv-file">
          Upload Toggl CSV
        </label>
        <input
          id="csv-file"
          type="file"
          name="csv_file"
          accept=".csv"
          class="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:text-white file:bg-[#e8501a] file:cursor-pointer"
        />
        <button
          type="submit"
          class="px-5 py-2 rounded text-white font-medium text-sm"
          style="background:#e8501a;"
        >
          Parse
        </button>
      </form>
    {/if}
  </section>

  <!-- Line items table (shown after parse) -->
  {#if items.length > 0}
    <section class="space-y-3">
      <h2 class="text-lg font-semibold" style="color: #1a1a6e;">Line Items</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="text-left" style="background:#1a1a6e; color:#fff;">
              <th class="px-3 py-2 font-semibold">Description</th>
              <th class="px-3 py-2 font-semibold w-24">Raw</th>
              <th class="px-3 py-2 font-semibold w-24">Rounded</th>
              <th class="px-3 py-2 font-semibold w-28 text-right">Amount</th>
              <th class="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {#each items as item, i (i)}
              <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-3 py-1.5">
                  <input
                    type="text"
                    bind:value={item.description}
                    class="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-orange-400 rounded px-1"
                  />
                </td>
                <td class="px-3 py-1.5 text-gray-500 font-mono text-xs">
                  {item.duration_raw ?? '—'}
                </td>
                <td class="px-3 py-1.5">
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

      <!-- Totals preview -->
      <div class="ml-auto w-64 space-y-1 text-sm text-right pt-2">
        <div class="flex justify-between">
          <span class="text-gray-600">Subtotal</span>
          <span class="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        {#if selectedClient && selectedClient.tax_rate > 0}
          <div class="flex justify-between text-gray-600">
            <span>Tax ({(selectedClient.tax_rate * 100).toFixed(0)}%)</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
        {/if}
        <div class="flex justify-between font-bold border-t border-gray-300 pt-1" style="color:#1a1a6e;">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <!-- Generate invoice form -->
      <form
        method="POST"
        action="?/generate"
        onsubmit={onGenerateSubmit}
        class="space-y-4 pt-2"
      >
        <input type="hidden" name="items" />
        <input type="hidden" name="client_id" value={selectedClientId} />

        <div class="flex gap-4">
          <div class="space-y-1">
            <label class="block text-sm font-semibold text-gray-700" for="invoice-date">
              Invoice Date
            </label>
            <input
              id="invoice-date"
              name="invoice_date"
              type="date"
              required
              class="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-semibold text-gray-700" for="due-date">
              Due Date
            </label>
            <input
              id="due-date"
              name="due_date"
              type="date"
              class="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        <button
          type="submit"
          class="px-6 py-2.5 rounded text-white font-semibold text-sm"
          style="background:#1a1a6e;"
        >
          Generate Invoice
        </button>
      </form>
    </section>
  {/if}
</div>
