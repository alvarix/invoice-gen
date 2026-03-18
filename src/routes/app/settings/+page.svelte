<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<h1 class="text-2xl font-bold text-[#1a1a6e] mb-6">Settings</h1>

<form method="POST" class="flex flex-col gap-4 max-w-md">
  <label class="flex flex-col gap-1 text-sm">
    Owner Name
    <input name="owner_name" value={data.settings?.owner_name ?? ''}
      class="border rounded px-3 py-2" />
  </label>

  <label class="flex flex-col gap-1 text-sm">
    Address
    <textarea name="address" rows="3"
      class="border rounded px-3 py-2">{data.settings?.address ?? ''}</textarea>
  </label>

  <label class="flex flex-col gap-1 text-sm">
    Zelle Email
    <input name="zelle" type="email" value={data.settings?.zelle ?? ''}
      class="border rounded px-3 py-2" />
  </label>

  <!-- TODO: logo upload — requires Supabase Storage setup, deferred to future iteration -->

  <button type="submit" class="bg-[#1a1a6e] text-white px-4 py-2 rounded text-sm self-start">
    Save
  </button>
</form>
