<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import Spinner from '$lib/components/Spinner.svelte';

  let { data }: { data: PageData } = $props();

  let saving = $state(false);
  let saved = $state(false);
</script>

<h1 class="text-2xl font-bold text-[#1a1a6e] mb-6">Settings</h1>

<form method="POST" use:enhance={() => {
  saving = true;
  saved = false;
  return async ({ update }) => {
    saving = false;
    saved = true;
    setTimeout(() => (saved = false), 2000);
    await update({ reset: false });
  };
}} class="flex flex-col gap-4 max-w-md">
  <label class="flex flex-col gap-1 text-sm">
    Owner Name
    <input name="owner_name" value={data.settings?.owner_name ?? ''}
      class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
  </label>

  <label class="flex flex-col gap-1 text-sm">
    Address
    <textarea name="address" rows="3"
      class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400">{data.settings?.address ?? ''}</textarea>
  </label>

  <label class="flex flex-col gap-1 text-sm">
    Email
    <input name="email" type="email" value={data.settings?.email ?? ''}
      class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
  </label>

  <label class="flex flex-col gap-1 text-sm">
    Phone
    <input name="phone" type="tel" value={data.settings?.phone ?? ''}
      class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
  </label>

  <label class="flex flex-col gap-1 text-sm">
    Zelle Handle
    <input name="zelle" value={data.settings?.zelle ?? ''}
      class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
  </label>

  <!-- TODO: logo upload — requires Supabase Storage setup, deferred to future iteration -->

  <div class="flex items-center gap-3">
    <button type="submit" disabled={saving}
      class="bg-[#1a1a6e] text-white px-4 py-2 rounded text-sm self-start transition-colors hover:bg-[#14145a] active:bg-[#0f0f4a] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
      {#if saving}<Spinner />{/if}
      Save
    </button>
    {#if saved}
      <span class="text-sm text-green-600 font-medium">Saved</span>
    {/if}
  </div>
</form>
