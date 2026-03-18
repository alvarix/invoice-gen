<script lang="ts">
  import { page } from '$app/stores';
  let { children } = $props();

  const nav = [
    { href: '/app/invoices/new', label: 'New Invoice' },
    { href: '/app/history', label: 'History' },
    { href: '/app/clients', label: 'Clients' },
    { href: '/app/settings', label: 'Settings' },
  ];
</script>

<div class="flex min-h-screen">
  <aside class="w-48 bg-[#1a1a6e] text-white flex flex-col p-4 gap-2">
    <div class="text-lg font-bold mb-6">Invoices</div>
    {#each nav as item}
      <a
        href={item.href}
        class="px-3 py-2 rounded text-sm hover:bg-white/10 transition
          {$page.url.pathname.startsWith(item.href) ? 'bg-white/20' : ''}"
      >
        {item.label}
      </a>
    {/each}
    <div class="mt-auto">
      <form method="POST" action="/logout">
        <button type="submit" class="text-sm text-white/60 hover:text-white">Log out</button>
      </form>
    </div>
  </aside>
  <main class="flex-1 p-8">
    {@render children()}
  </main>
</div>
