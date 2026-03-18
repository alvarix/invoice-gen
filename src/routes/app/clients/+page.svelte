<script lang="ts">
  import type { PageData, ActionData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showForm = $state(false);
  let editing = $state<any>(null);

  function startEdit(client: any) {
    editing = client;
    showForm = true;
  }
  function cancelForm() {
    showForm = false;
    editing = null;
  }
</script>

<div class="flex justify-between items-center mb-6">
  <h1 class="text-2xl font-bold text-[#1a1a6e]">Clients</h1>
  <button onclick={() => { editing = null; showForm = true; }}
    class="bg-[#1a1a6e] text-white px-4 py-2 rounded text-sm">
    Add Client
  </button>
</div>

{#if form?.error}
  <p class="text-red-500 text-sm mb-4">{form.error}</p>
{/if}

{#if showForm}
  <form method="POST" action={editing ? '?/update' : '?/create'}
    class="bg-gray-50 p-6 rounded mb-8 grid grid-cols-2 gap-4">
    {#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
    <label class="flex flex-col gap-1 text-sm">
      Slug
      <input name="slug" value={editing?.slug ?? ''} required
        class="border rounded px-3 py-2" placeholder="wmw" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Name
      <input name="name" value={editing?.name ?? ''} required
        class="border rounded px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Company
      <input name="company" value={editing?.company ?? ''}
        class="border rounded px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Project
      <input name="project" value={editing?.project ?? ''}
        class="border rounded px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Email
      <input name="email" type="email" value={editing?.email ?? ''}
        class="border rounded px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Hourly Rate
      <input name="hourly_rate" type="number" step="0.01"
        value={editing?.hourly_rate ?? ''} required class="border rounded px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Currency
      <input name="currency" value={editing?.currency ?? 'USD'}
        class="border rounded px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Tax Rate %
      <input name="tax_rate" type="number" step="0.01"
        value={editing ? editing.tax_rate * 100 : 0} class="border rounded px-3 py-2" />
    </label>
    <div class="col-span-2 flex gap-3">
      <button type="submit" class="bg-[#1a1a6e] text-white px-4 py-2 rounded text-sm">
        {editing ? 'Save' : 'Create'}
      </button>
      <button type="button" onclick={cancelForm}
        class="border px-4 py-2 rounded text-sm">Cancel</button>
    </div>
  </form>
{/if}

<table class="w-full text-sm">
  <thead>
    <tr class="text-left border-b text-[#1a1a6e] uppercase text-xs">
      <th class="pb-2">Name</th>
      <th class="pb-2">Company</th>
      <th class="pb-2">Rate</th>
      <th class="pb-2">Last Invoice</th>
      <th class="pb-2">Status</th>
      <th class="pb-2"></th>
    </tr>
  </thead>
  <tbody>
    {#each data.clients as client}
      <tr class="border-b hover:bg-gray-50">
        <td class="py-3 font-medium">{client.name}</td>
        <td class="py-3 text-gray-500">{client.company ?? '—'}</td>
        <td class="py-3">${client.hourly_rate}/hr</td>
        <td class="py-3 text-gray-500">
          {client.latest_invoice?.invoice_date ?? '—'}
        </td>
        <td class="py-3">
          {#if client.latest_invoice}
            <span class="capitalize text-xs px-2 py-1 rounded bg-gray-100">
              {client.latest_invoice.status}
            </span>
          {/if}
        </td>
        <td class="py-3 flex gap-2 justify-end">
          <button onclick={() => startEdit(client)}
            class="text-[#1a1a6e] hover:underline text-xs">Edit</button>
          <form method="POST" action="?/delete"
            onsubmit={(e) => { if (!confirm('Delete client and all invoices?')) e.preventDefault(); }}>
            <input type="hidden" name="id" value={client.id} />
            <button type="submit" class="text-red-500 hover:underline text-xs">Delete</button>
          </form>
        </td>
      </tr>
    {/each}
  </tbody>
</table>
