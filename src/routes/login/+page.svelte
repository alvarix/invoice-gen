<script lang="ts">
  import type { ActionData } from './$types';
  let { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen flex items-center justify-center">
  <form method="POST" class="flex flex-col gap-4 w-80">
    <h1 class="text-2xl font-bold">Invoice Generator</h1>
    {#if form?.error}
      <p class="text-red-500 text-sm">{form.error}</p>
    {/if}
    <input
      type="password"
      name="password"
      placeholder="Password"
      class="border rounded px-3 py-2"
      required
    />
    <button type="submit" class="bg-[#1a1a6e] text-white rounded px-4 py-2">
      Log in
    </button>
  </form>
</div>
