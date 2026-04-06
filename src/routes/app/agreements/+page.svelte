<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const statuses = ['draft', 'sent', 'accepted'];

  /** Badge color by status */
  function badgeClass(status: string) {
    if (status === 'accepted') return 'bg-green-100 text-green-800';
    if (status === 'sent') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  }
</script>

<div class="flex justify-between items-center mb-6">
  <h1 class="text-2xl font-bold text-[#337638]">Agreements</h1>
  <a href="/app/agreements/new"
    class="bg-[#337638] text-white px-4 py-2 rounded text-sm transition-colors hover:bg-[#14145a] active:bg-[#0f0f4a]">
    New Agreement
  </a>
</div>

<!-- Status filter -->
<div class="flex gap-2 mb-6">
  <a href="/app/agreements"
    class="px-3 py-1 rounded text-sm transition-colors {!data.statusFilter ? 'bg-[#337638] text-white' : 'bg-gray-100 hover:bg-gray-200'}">
    All
  </a>
  {#each statuses as s}
    <a href="/app/agreements?status={s}"
      class="px-3 py-1 rounded text-sm capitalize transition-colors {data.statusFilter === s ? 'bg-[#337638] text-white' : 'bg-gray-100 hover:bg-gray-200'}">
      {s}
    </a>
  {/each}
</div>

{#if data.agreements.length === 0}
  <p class="text-gray-400 text-sm">No agreements yet.</p>
{:else}
  <table class="w-full text-sm">
    <thead>
      <tr class="text-left border-b text-[#337638] uppercase text-xs">
        <th class="pb-2">Title</th>
        <th class="pb-2">Client</th>
        <th class="pb-2">Status</th>
        <th class="pb-2">Created</th>
        <th class="pb-2"></th>
      </tr>
    </thead>
    <tbody>
      {#each data.agreements as a}
        <tr class="border-b hover:bg-gray-50 transition-colors">
          <td class="py-3 font-medium">{a.title}</td>
          <td class="py-3 text-gray-500">{a.clients?.name ?? '—'}</td>
          <td class="py-3">
            <span class="capitalize text-xs px-2 py-1 rounded {badgeClass(a.status)}">{a.status}</span>
          </td>
          <td class="py-3 text-gray-500">{a.created_at?.slice(0, 10) ?? '—'}</td>
          <td class="py-3 text-right">
            <a href="/app/agreements/{a.id}"
              class="text-[#337638] hover:underline text-xs">View</a>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
