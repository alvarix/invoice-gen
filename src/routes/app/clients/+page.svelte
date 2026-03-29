<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import Spinner from '$lib/components/Spinner.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showForm = $state(false);
  let editing = $state<any>(null);
  let submitting = $state(false);
  let deleting = $state<string | null>(null);
  let resetting = $state<string | null>(null);

  /**
   * Copy the client's portal URL to clipboard.
   * @param token - the client's portal_token
   */
  async function copyPortalUrl(token: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/portal/${token}`);
  }

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
    class="bg-[#1a1a6e] text-white px-4 py-2 rounded text-sm transition-colors hover:bg-[#14145a] active:bg-[#0f0f4a]">
    Add Client
  </button>
</div>

{#if form?.error}
  <p class="text-red-500 text-sm mb-4">{form.error}</p>
{/if}

{#if showForm}
  <form method="POST" action={editing ? '?/update' : '?/create'}
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => { submitting = false; showForm = false; editing = null; await update(); };
    }}
    class="bg-gray-50 p-6 rounded mb-8 grid grid-cols-2 gap-4">
    {#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
    <label class="flex flex-col gap-1 text-sm">
      Slug
      <input name="slug" value={editing?.slug ?? ''} required
        class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="wmw" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Name
      <input name="name" value={editing?.name ?? ''} required
        class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Company
      <input name="company" value={editing?.company ?? ''}
        class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Project
      <input name="project" value={editing?.project ?? ''}
        class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Email
      <input name="email" type="email" value={editing?.email ?? ''}
        class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Hourly Rate
      <input name="hourly_rate" type="number" step="0.01"
        value={editing?.hourly_rate ?? ''} required class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Currency
      <input name="currency" value={editing?.currency ?? 'USD'}
        class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Tax Rate %
      <input name="tax_rate" type="number" step="0.01"
        value={editing ? editing.tax_rate * 100 : 0} class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
    </label>
    <div class="col-span-2 flex gap-3">
      <button type="submit" disabled={submitting}
        class="bg-[#1a1a6e] text-white px-4 py-2 rounded text-sm transition-colors hover:bg-[#14145a] active:bg-[#0f0f4a] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
        {#if submitting}<Spinner />{/if}
        {editing ? 'Save' : 'Create'}
      </button>
      <button type="button" onclick={cancelForm}
        class="border border-gray-300 px-4 py-2 rounded text-sm transition-colors text-gray-700 hover:bg-gray-100 active:bg-gray-200">Cancel</button>
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
      <th class="pb-2">Portal</th>
      <th class="pb-2"></th>
    </tr>
  </thead>
  <tbody>
    {#each data.clients as client}
      <tr class="border-b hover:bg-gray-50 transition-colors">
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
        <!-- Portal link + reset -->
        <td class="py-3">
          {#if client.portal_token}
            <div class="flex items-center gap-1">
              <button type="button" onclick={() => copyPortalUrl(client.portal_token)}
                class="text-xs text-[#1a1a6e] hover:underline transition-colors">Copy link</button>
              <form method="POST" action="?/resetPortalToken"
                use:enhance={() => {
                  resetting = client.id;
                  return async ({ update }) => { resetting = null; await update(); };
                }}
                onsubmit={(e) => { if (!confirm('Reset portal link? The old URL will stop working.')) e.preventDefault(); }}>
                <input type="hidden" name="id" value={client.id} />
                <button type="submit" disabled={resetting === client.id}
                  class="text-xs text-gray-400 hover:text-gray-600 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1">
                  {#if resetting === client.id}<Spinner />{/if}
                  Reset
                </button>
              </form>
            </div>
          {/if}
        </td>
        <td class="py-3 flex gap-2 justify-end">
          <button onclick={() => startEdit(client)}
            class="text-[#1a1a6e] hover:underline active:text-[#14145a] text-xs transition-colors">Edit</button>
          <form method="POST" action="?/delete"
            use:enhance={() => {
              deleting = client.id;
              return async ({ update }) => { deleting = null; await update(); };
            }}
            onsubmit={(e) => { if (!confirm('Delete client and all invoices?')) e.preventDefault(); }}>
            <input type="hidden" name="id" value={client.id} />
            <button type="submit" disabled={deleting === client.id}
              class="text-red-500 hover:underline active:text-red-700 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1">
              {#if deleting === client.id}<Spinner />{/if}
              Delete
            </button>
          </form>
        </td>
      </tr>
    {/each}
  </tbody>
</table>
