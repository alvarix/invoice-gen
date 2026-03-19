<script lang="ts">
  import InvoiceView from '$lib/components/InvoiceView.svelte';
  let { data } = $props();
</script>

<svelte:head>
  <title>Invoice {data.invoice.invoice_number}</title>
</svelte:head>

<div class="print-area">
  <InvoiceView invoice={data.invoice} items={data.items} client={data.client} settings={data.settings} />
</div>

<div class="flex justify-center py-4 print:hidden">
  <button
    onclick={() => window.print()}
    class="px-5 py-2 rounded text-white text-sm font-medium transition-colors bg-[#1a1a6e] hover:bg-[#14145a] active:bg-[#0f0f4a]"
  >
    Print / Save PDF
  </button>
</div>
