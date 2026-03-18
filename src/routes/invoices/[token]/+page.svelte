<script lang="ts">
  import InvoiceView from '$lib/components/InvoiceView.svelte';
  let { data } = $props();
</script>

<InvoiceView invoice={data.invoice} items={data.items} client={data.client} settings={data.settings} />
