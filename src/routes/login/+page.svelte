<script lang="ts">
  import type { ActionData } from './$types';
  import { enhance } from '$app/forms';
  import Spinner from '$lib/components/Spinner.svelte';

  let { form }: { form: ActionData } = $props();

  let submitting = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center">
  <form method="POST" use:enhance={() => {
    submitting = true;
    return async ({ update }) => { submitting = false; await update(); };
  }} class="flex flex-col gap-4 w-80">
    <h1 class="text-2xl font-bold">Invoice Generator</h1>
    {#if form?.error}
      <p class="text-red-500 text-sm">{form.error}</p>
    {/if}
    <input
      type="password"
      name="password"
      placeholder="Password"
      class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
      required
    />
    <button type="submit" disabled={submitting}
      class="bg-[#1a1a6e] text-white rounded px-4 py-2 transition-colors hover:bg-[#14145a] active:bg-[#0f0f4a] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
      {#if submitting}<Spinner />{/if}
      Log in
    </button>
  </form>
</div>
