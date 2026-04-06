<script lang="ts">
  import { page } from '$app/stores';
  let { children } = $props();

  const nav = [
    { href: '/app/invoices/new', label: 'New Invoice' },
    { href: '/app/history', label: 'History' },
    { href: '/app/agreements', label: 'Agreements' },
    { href: '/app/clients', label: 'Clients' },
    { href: '/app/settings', label: 'Settings' },
    { href: '/app/trash', label: 'Trash' },
  ];
</script>

<div class="flex min-h-screen">
  <aside class="w-48 bg-[#337638] text-white flex flex-col p-4 gap-2">

    <div class="text-lg font-bold ">Client Portal</div>
    <div class="font-bold mb-6"><a href='https://alvarsirlin.dev' target='_blank'>AlvarSirlin.dev</a></div>
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
        <button type="submit" class="text-sm text-white/60 hover:text-white active:text-white/80 transition-colors">Log out</button>
      </form>
    </div>
  </aside>
  <main class="flex-1 p-8">
    {@render children()}
  </main>
</div>
