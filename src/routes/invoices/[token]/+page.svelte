<script lang="ts">
  import InvoiceView from '$lib/components/InvoiceView.svelte';
  let { data } = $props();
</script>

<svelte:head>
  <title>Invoice {data.invoice.invoice_number}</title>
</svelte:head>

<InvoiceView invoice={data.invoice} items={data.items} client={data.client} settings={data.settings} />
