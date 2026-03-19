# Invoice Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a SvelteKit invoice generator with Supabase persistence, Brevo email, and a public client-facing invoice view.

**Architecture:** SvelteKit app with server-side routes for auth and API calls. Supabase stores clients, invoices, and line items. Brevo sends invoice emails. Public invoice pages use a random token — no client login required.

**Tech Stack:** SvelteKit, Supabase JS client, Brevo API, Vercel deployment, TailwindCSS

---

## File Structure

```
src/
  lib/
    server/
      auth.ts           # session helpers (read/validate APP_PASSWORD cookie)
      supabase.ts       # server-side supabase client (service role)
      brevo.ts          # email sending via Brevo REST API
      toggl.ts          # Toggl paste and CSV parse + 15min rounding logic
      invoice.ts        # invoice number generation, totals calculation
    types.ts            # shared TypeScript types (Client, Invoice, LineItem, Settings)
    utils.ts            # currency formatting, date helpers
  routes/
    login/
      +page.svelte      # password login form
      +page.server.ts   # validate password, set cookie
    logout/
      +server.ts        # clear session cookie
    app/
      +layout.svelte    # sidebar nav
      +layout.server.ts # session guard — redirect to /login if not authed
      invoices/
        new/
          +page.svelte      # new invoice form (client select, toggl paste/csv, line items)
          +page.server.ts   # load clients; actions: parse toggl, parse csv, generate invoice
        [id]/
          +page.svelte      # invoice detail, status actions, send email
          +page.server.ts   # load invoice+line items; actions: send email, update status
      clients/
        +page.svelte        # client list + add/edit form
        +page.server.ts     # load clients; actions: create, update client
      history/
        +page.svelte        # invoice history with filters
        +page.server.ts     # load invoices with optional client/status filter
      settings/
        +page.svelte        # owner settings form
        +page.server.ts     # load/save settings row
    invoices/
      [token]/
        +page.svelte        # public read-only invoice view
        +page.server.ts     # load invoice by public_token (no auth)
  app.css                   # global styles, Tailwind base
  app.html                  # html shell

static/
  logo.svg                  # orange circle crosshair logo

supabase/
  migrations/
    001_init.sql            # all table definitions

.env.local                  # APP_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_KEY, PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, BREVO_API_KEY, BREVO_SENDER_EMAIL
._-/                        # test files and done logs (gitignored)
```

---

## Task 1: Project Init and Environment

**Files:**
- Create: `package.json` (via SvelteKit init)
- Create: `.env.local`
- Create: `.gitignore`

- [ ] **Step 1: Init SvelteKit project**

```bash
cd ~/Sites/apps/invoice-gen
npx sv create . --template minimal --types ts --no-add-ons
```

Select: SvelteKit minimal, TypeScript, no additional add-ons.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Configure Tailwind**

Add to `vite.config.ts`:
```ts
import tailwindcss from '@tailwindcss/vite';
// add to plugins array
plugins: [tailwindcss(), sveltekit()]
```

Add to `src/app.css`:
```css
@import "tailwindcss";
```

Import in `src/app.html` or root layout.

- [ ] **Step 4: Create `.env.local`**

```
APP_PASSWORD=your-chosen-password
PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=alvarix@gmail.com
```

Also add `._-/` to `.gitignore` so test files are not committed:
```
._-/
.env.local
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts at `localhost:5173`, blank page loads.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: init sveltekit project with tailwind and supabase deps"
```

---

## Task 2: Supabase Schema

**Files:**
- Create: `supabase/migrations/001_init.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  company text,
  project text,
  email text,
  hourly_rate numeric not null default 0,
  currency text not null default 'USD',
  tax_rate numeric not null default 0,
  invoice_seq integer not null default 0,
  created_at timestamptz default now()
);

-- settings (single row, id always 1)
create table settings (
  id integer primary key default 1,
  owner_name text,
  address text,
  zelle text,
  logo_url text
);
insert into settings (id) values (1);

-- invoices
create table invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  invoice_number text unique not null,
  invoice_date date not null default current_date,
  due_date date,
  status text not null default 'draft' check (status in ('draft','sent','paid')),
  paid_date date,
  tax_rate numeric not null default 0,
  subtotal numeric not null default 0,
  tax_amount numeric not null default 0,
  total numeric not null default 0,
  public_token text unique not null default gen_random_uuid()::text,
  created_at timestamptz default now()
);

-- line_items
create table line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  type text not null check (type in ('time','expense')),
  description text not null default 'misc',
  duration_raw text,
  duration_rounded text,
  rate numeric,
  amount numeric not null default 0,
  sort_order integer not null default 0
);

-- RLS: enabled on all tables.
-- The server uses the service_role key which bypasses RLS entirely.
-- No policies are needed for this app — the anon key is never used server-side.
-- If you add a public-facing Supabase query later, add a policy then.
alter table clients enable row level security;
alter table invoices enable row level security;
alter table line_items enable row level security;
alter table settings enable row level security;
```

- [ ] **Step 2: Run migration in Supabase dashboard**

Paste SQL into Supabase → SQL Editor → Run.

- [ ] **Step 3: Verify tables exist**

In Supabase Table Editor, confirm all 4 tables appear.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add supabase schema migration"
```

---

## Task 3: Server Utilities

**Files:**
- Create: `src/lib/server/auth.ts`
- Create: `src/lib/server/supabase.ts`
- Create: `src/lib/server/brevo.ts`
- Create: `src/lib/server/toggl.ts`
- Create: `src/lib/server/invoice.ts`
- Create: `src/lib/types.ts`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Write `types.ts`**

```ts
export interface Client {
  id: string;
  slug: string;
  name: string;
  company: string | null;
  project: string | null;
  email: string | null;
  hourly_rate: number;
  currency: string;
  tax_rate: number;
  invoice_seq: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: 'draft' | 'sent' | 'paid';
  paid_date: string | null;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  public_token: string;
  created_at: string;
}

export interface LineItem {
  id: string;
  invoice_id: string;
  type: 'time' | 'expense';
  description: string;
  duration_raw: string | null;
  duration_rounded: string | null;
  rate: number | null;
  amount: number;
  sort_order: number;
}

export interface Settings {
  id: number;
  owner_name: string | null;
  address: string | null;
  zelle: string | null;
  logo_url: string | null;
}
```

- [ ] **Step 2: Write `auth.ts`**

```ts
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

/** Check if the current request has a valid session cookie */
export function isAuthenticated(event: RequestEvent): boolean {
  const session = event.cookies.get('session');
  return session === env.APP_PASSWORD;
}

/** Set session cookie on login */
export function setSession(event: RequestEvent): void {
  event.cookies.set('session', env.APP_PASSWORD, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });
}

/** Clear session cookie on logout */
export function clearSession(event: RequestEvent): void {
  event.cookies.delete('session', { path: '/' });
}
```

- [ ] **Step 3: Write `supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

/** Server-side Supabase client using service role key — bypasses RLS */
export const supabase = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
```

- [ ] **Step 4: Write `toggl.ts`**

```ts
/**
 * Round a duration in seconds up to the nearest 15 minutes.
 * @param totalSeconds - raw duration in seconds
 * @returns rounded duration in seconds
 */
function roundUp15(totalSeconds: number): number {
  const fifteenMin = 15 * 60;
  return Math.ceil(totalSeconds / fifteenMin) * fifteenMin;
}

/**
 * Parse a duration string "h:mm:ss" or "h:mm" into total seconds.
 * @param raw - duration string from Toggl
 * @returns total seconds
 */
function parseDuration(raw: string): number {
  const parts = raw.trim().split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  return 0;
}

/**
 * Format seconds as "h:mm".
 * @param totalSeconds - duration in seconds
 * @returns formatted string
 */
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export interface ParsedEntry {
  description: string;
  duration_raw: string;
  duration_rounded: string;
  hours_rounded: number;
}

/**
 * Parse Toggl copy/paste text into time entries.
 * Format alternates: description line, duration line, repeat.
 * Keeps prefixes (e.g. "2: design") as-is.
 * @param text - raw pasted text from Toggl
 * @returns array of parsed entries
 */
export function parseTogglPaste(text: string): ParsedEntry[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const entries: ParsedEntry[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Check if this line looks like a duration (h:mm:ss or h:mm)
    const isDuration = /^\d+:\d{2}(:\d{2})?$/.test(line);

    if (!isDuration && lines[i + 1] && /^\d+:\d{2}(:\d{2})?$/.test(lines[i + 1])) {
      // description + duration pair
      const description = line || 'misc';
      const duration_raw = lines[i + 1];
      const rawSeconds = parseDuration(duration_raw);
      const roundedSeconds = roundUp15(rawSeconds);
      entries.push({
        description,
        duration_raw,
        duration_rounded: formatDuration(roundedSeconds),
        hours_rounded: roundedSeconds / 3600
      });
      i += 2;
    } else if (isDuration) {
      // duration with no preceding description
      const rawSeconds = parseDuration(line);
      const roundedSeconds = roundUp15(rawSeconds);
      entries.push({
        description: 'misc',
        duration_raw: line,
        duration_rounded: formatDuration(roundedSeconds),
        hours_rounded: roundedSeconds / 3600
      });
      i += 1;
    } else {
      i += 1; // skip orphaned line
    }
  }

  return entries;
}

/**
 * Split a single CSV line respecting double-quoted fields that may contain commas.
 * e.g. `"deploy, staging","1:00:00"` → ["deploy, staging", "1:00:00"]
 * @param line - raw CSV line
 * @returns array of field values with quotes stripped
 */
function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse Toggl CSV export text into time entries.
 * Expects columns: Description, Duration (h:mm:ss).
 * Handles quoted fields containing commas.
 * @param csvText - raw CSV string
 * @returns array of parsed entries
 */
export function parseTogglCSV(csvText: string): ParsedEntry[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const header = splitCSVLine(lines[0]).map(h => h.toLowerCase());
  const descIdx = header.findIndex(h => h === 'description');
  const durIdx = header.findIndex(h => h === 'duration');

  if (descIdx === -1 || durIdx === -1) return [];

  return lines.slice(1).map(line => {
    const cols = splitCSVLine(line);
    const description = cols[descIdx] || 'misc';
    const duration_raw = cols[durIdx] || '0:00:00';
    const rawSeconds = parseDuration(duration_raw);
    const roundedSeconds = roundUp15(rawSeconds);
    return {
      description,
      duration_raw,
      duration_rounded: formatDuration(roundedSeconds),
      hours_rounded: roundedSeconds / 3600
    };
  }).filter(e => e.hours_rounded > 0);
}
```

- [ ] **Step 5: Write tests for `toggl.ts`**

Create `._-/test-1-toggl.ts`:
```ts
import { parseTogglPaste, parseTogglCSV } from '../src/lib/server/toggl';

// --- paste tests ---
const paste = `2: deploy
1:00:05
2: design
1:52:26
status call
1:04:34`;

const result = parseTogglPaste(paste);
console.assert(result[0].description === '2: deploy', 'prefix preserved');
console.assert(result[0].duration_rounded === '1:15', '1:00:05 rounds to 1:15');
console.assert(result[1].duration_rounded === '2:00', '1:52:26 rounds to 2:00');
console.assert(result[2].description === 'status call', 'no-prefix entry works');
console.assert(result[2].duration_rounded === '1:15', '1:04:34 rounds to 1:15');
console.log('Paste tests passed');

// --- CSV tests ---
const csv = `"Description","Duration"
"deploy","1:00:05"
"deploy, staging","1:52:26"
"","0:08:02"`;

const csvResult = parseTogglCSV(csv);
console.assert(csvResult[0].description === 'deploy', 'simple csv description');
console.assert(csvResult[0].duration_rounded === '1:15', 'csv 1:00:05 rounds to 1:15');
console.assert(csvResult[1].description === 'deploy, staging', 'quoted field with comma preserved');
console.assert(csvResult[1].duration_rounded === '2:00', 'csv 1:52:26 rounds to 2:00');
console.assert(csvResult[2].description === 'misc', 'empty description becomes misc');
console.assert(csvResult[2].duration_rounded === '0:15', '0:08:02 rounds to 0:15');
console.log('CSV tests passed');
```

Run: `npx tsx ._-/test-1-toggl.ts`

- [ ] **Step 6: Write `invoice.ts`**

```ts
import type { LineItem } from '$lib/types';

/**
 * Generate invoice number from client slug and sequence.
 * @param slug - client slug e.g. "wmw"
 * @param seq - invoice sequence number
 * @returns invoice number e.g. "wmw-2026-2"
 */
export function generateInvoiceNumber(slug: string, seq: number): string {
  const year = new Date().getFullYear();
  return `${slug}-${year}-${seq}`;
}

/**
 * Calculate invoice totals from line items and tax rate.
 * @param items - array of line items with amount set
 * @param taxRate - decimal tax rate e.g. 0.15 for 15%
 * @returns subtotal, tax_amount, total
 */
export function calculateTotals(items: Pick<LineItem, 'amount'>[], taxRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax_amount = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + tax_amount;
  return { subtotal, tax_amount, total };
}
```

- [ ] **Step 7: Write `brevo.ts`**

```ts
import { env } from '$env/dynamic/private';

/**
 * Send invoice email to client via Brevo transactional API.
 * @param to - recipient email address
 * @param toName - recipient name
 * @param invoiceNumber - e.g. "wmw-2026-2"
 * @param publicUrl - full URL to public invoice page
 * @param ownerName - sender display name
 */
export async function sendInvoiceEmail(
  to: string,
  toName: string,
  invoiceNumber: string,
  publicUrl: string,
  ownerName: string
): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: ownerName, email: env.BREVO_SENDER_EMAIL },
      to: [{ email: to, name: toName }],
      subject: `Invoice ${invoiceNumber} from ${ownerName}`,
      htmlContent: `
        <p>Hi ${toName},</p>
        <p>Please find your invoice <strong>${invoiceNumber}</strong> at the link below.</p>
        <p><a href="${publicUrl}">${publicUrl}</a></p>
        <p>${ownerName}</p>
      `
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo send failed: ${err}`);
  }
}
```

- [ ] **Step 8: Write `utils.ts`**

```ts
/**
 * Format a number as a currency string.
 * @param amount - numeric amount
 * @param currency - ISO currency code, e.g. "USD"
 * @returns formatted string e.g. "$50.00"
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

/**
 * Format a date string "YYYY-MM-DD" as "MM/DD/YYYY".
 * @param date - ISO date string
 * @returns formatted date
 */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${m}/${d}/${y}`;
}
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/
git commit -m "feat: add server utilities, types, toggl parser, invoice helpers"
```

---

## Task 4: Auth Routes

**Files:**
- Create: `src/routes/login/+page.svelte`
- Create: `src/routes/login/+page.server.ts`
- Create: `src/routes/logout/+server.ts`
- Create: `src/routes/app/+layout.server.ts`

- [ ] **Step 1: Write login page**

`src/routes/login/+page.svelte`:
```svelte
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
```

- [ ] **Step 2: Write login action**

`src/routes/login/+page.server.ts`:
```ts
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { setSession } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async (event) => {
    const data = await event.request.formData();
    const password = data.get('password') as string;

    if (password !== env.APP_PASSWORD) {
      return fail(401, { error: 'Incorrect password' });
    }

    setSession(event);
    redirect(303, '/app/invoices/new');
  }
};
```

- [ ] **Step 3: Write logout handler**

`src/routes/logout/+server.ts`:
```ts
import { redirect } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  clearSession(event);
  redirect(303, '/login');
};
```

- [ ] **Step 4: Write app layout guard**

`src/routes/app/+layout.server.ts`:
```ts
import { redirect } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  if (!isAuthenticated(event)) {
    redirect(303, '/login');
  }
};
```

- [ ] **Step 5: Test login manually**

Start `npm run dev`, go to `localhost:5173/app/invoices/new`, confirm redirect to `/login`. Enter wrong password, confirm error. Enter correct password, confirm redirect to new invoice page (404 is fine at this stage, redirect is what matters).

- [ ] **Step 6: Commit**

```bash
git add src/routes/login src/routes/logout src/routes/app
git commit -m "feat: add password auth, session cookie, app route guard"
```

---

## Task 5: App Layout + Sidebar

**Files:**
- Create: `src/routes/app/+layout.svelte`

- [ ] **Step 1: Write layout with sidebar**

```svelte
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
```

- [ ] **Step 2: Verify layout renders**

Visit any `/app/*` route, confirm sidebar appears with correct active states.

- [ ] **Step 3: Commit**

```bash
git add src/routes/app/+layout.svelte
git commit -m "feat: add app layout with sidebar nav"
```

---

## Task 6: Clients CRUD

**Files:**
- Create: `src/routes/app/clients/+page.svelte`
- Create: `src/routes/app/clients/+page.server.ts`

- [ ] **Step 1: Write clients server**

```ts
import { supabase } from '$lib/server/supabase';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Fetch clients with their most recent invoice date and status
  const { data: clients } = await supabase
    .from('clients')
    .select('*, invoices(invoice_date, status, invoice_number)')
    .order('name');

  // Flatten to include only the latest invoice per client
  const clientsWithLatest = (clients ?? []).map((c: any) => {
    const sorted = (c.invoices ?? []).sort(
      (a: any, b: any) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
    );
    return { ...c, latest_invoice: sorted[0] ?? null, invoices: undefined };
  });

  return { clients: clientsWithLatest };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const { error } = await supabase.from('clients').insert({
      slug: data.get('slug'),
      name: data.get('name'),
      company: data.get('company'),
      project: data.get('project'),
      email: data.get('email'),
      hourly_rate: Number(data.get('hourly_rate')),
      currency: data.get('currency') || 'USD',
      tax_rate: Number(data.get('tax_rate')) / 100, // input as percentage
    });
    if (error) return fail(500, { error: error.message });
  },

  update: async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id') as string;
    const { error } = await supabase.from('clients').update({
      name: data.get('name'),
      company: data.get('company'),
      project: data.get('project'),
      email: data.get('email'),
      hourly_rate: Number(data.get('hourly_rate')),
      currency: data.get('currency'),
      tax_rate: Number(data.get('tax_rate')) / 100,
    }).eq('id', id);
    if (error) return fail(500, { error: error.message });
  },

  delete: async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id') as string;
    // Cascades to invoices and line_items via FK constraint
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) return fail(500, { error: error.message });
  }
};
```

- [ ] **Step 2: Write clients page**

`src/routes/app/clients/+page.svelte`:
```svelte
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showForm = $state(false);
  let editing = $state<any>(null);

  function startEdit(client: any) {
    editing = client;
    showForm = true;
  }
  function cancelForm() {
    showForm = false;
    editing = null;
  }
</script>

<div class="flex justify-between items-center mb-6">
  <h1 class="text-2xl font-bold text-[#1a1a6e]">Clients</h1>
  <button onclick={() => { editing = null; showForm = true; }}
    class="bg-[#1a1a6e] text-white px-4 py-2 rounded text-sm">
    Add Client
  </button>
</div>

{#if form?.error}
  <p class="text-red-500 text-sm mb-4">{form.error}</p>
{/if}

{#if showForm}
  <form method="POST" action={editing ? '?/update' : '?/create'}
    class="bg-gray-50 p-6 rounded mb-8 grid grid-cols-2 gap-4">
    {#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
    <label class="flex flex-col gap-1 text-sm">
      Slug
      <input name="slug" value={editing?.slug ?? ''} required
        class="border rounded px-3 py-2" placeholder="wmw" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Name
      <input name="name" value={editing?.name ?? ''} required
        class="border rounded px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Company
      <input name="company" value={editing?.company ?? ''}
        class="border rounded px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Project
      <input name="project" value={editing?.project ?? ''}
        class="border rounded px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Email
      <input name="email" type="email" value={editing?.email ?? ''}
        class="border rounded px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Hourly Rate
      <input name="hourly_rate" type="number" step="0.01"
        value={editing?.hourly_rate ?? ''} required class="border rounded px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Currency
      <input name="currency" value={editing?.currency ?? 'USD'}
        class="border rounded px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Tax Rate %
      <input name="tax_rate" type="number" step="0.01"
        value={editing ? editing.tax_rate * 100 : 0} class="border rounded px-3 py-2" />
    </label>
    <div class="col-span-2 flex gap-3">
      <button type="submit" class="bg-[#1a1a6e] text-white px-4 py-2 rounded text-sm">
        {editing ? 'Save' : 'Create'}
      </button>
      <button type="button" onclick={cancelForm}
        class="border px-4 py-2 rounded text-sm">Cancel</button>
    </div>
  </form>
{/if}

<table class="w-full text-sm">
  <thead>
    <tr class="text-left border-b text-[#1a1a6e] uppercase text-xs">
      <th class="pb-2">Name</th>
      <th class="pb-2">Company</th>
      <th class="pb-2">Rate</th>
      <th class="pb-2">Last Invoice</th>
      <th class="pb-2">Status</th>
      <th class="pb-2"></th>
    </tr>
  </thead>
  <tbody>
    {#each data.clients as client}
      <tr class="border-b hover:bg-gray-50">
        <td class="py-3 font-medium">{client.name}</td>
        <td class="py-3 text-gray-500">{client.company ?? '—'}</td>
        <td class="py-3">${client.hourly_rate}/hr</td>
        <td class="py-3 text-gray-500">
          {client.latest_invoice?.invoice_date ?? '—'}
        </td>
        <td class="py-3">
          {#if client.latest_invoice}
            <span class="capitalize text-xs px-2 py-1 rounded bg-gray-100">
              {client.latest_invoice.status}
            </span>
          {/if}
        </td>
        <td class="py-3 flex gap-2 justify-end">
          <button onclick={() => startEdit(client)}
            class="text-[#1a1a6e] hover:underline text-xs">Edit</button>
          <form method="POST" action="?/delete"
            onsubmit="return confirm('Delete client and all invoices?')">
            <input type="hidden" name="id" value={client.id} />
            <button type="submit" class="text-red-500 hover:underline text-xs">Delete</button>
          </form>
        </td>
      </tr>
    {/each}
  </tbody>
</table>
```

- [ ] **Step 3: Test manually**

Add a client with name "Gregory Cohen", slug "wmw", rate 50, tax 0. Verify it appears in the list. Edit the rate. Confirm it persists on refresh. Delete the client, confirm it's gone.

- [ ] **Step 4: Commit**

```bash
git add src/routes/app/clients/
git commit -m "feat: client list with add, edit, delete, last invoice status"
```

---

## Task 7: Settings Page

**Files:**
- Create: `src/routes/app/settings/+page.svelte`
- Create: `src/routes/app/settings/+page.server.ts`

- [ ] **Step 1: Write settings server**

Load the single settings row, upsert on save.

```ts
import { supabase } from '$lib/server/supabase';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  return { settings: data };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    await supabase.from('settings').upsert({
      id: 1,
      owner_name: data.get('owner_name'),
      address: data.get('address'),
      zelle: data.get('zelle'),
    });
  }
};
```

Note: `logo_url` and a logo upload feature is deferred to a future iteration. It requires setting up Supabase Storage and a file upload action. Add a `TODO: logo upload` comment in the settings page for now.

- [ ] **Step 2: Write settings page**

Form with: owner name, address (textarea), Zelle email. Save button. Include a placeholder comment for logo upload.

- [ ] **Step 3: Test manually**

Save settings. Refresh. Confirm values persist.

- [ ] **Step 4: Commit**

```bash
git add src/routes/app/settings/
git commit -m "feat: settings page with owner info"
```

---

## Task 8: New Invoice — Toggl Parse + Line Items

**Files:**
- Create: `src/routes/app/invoices/new/+page.svelte`
- Create: `src/routes/app/invoices/new/+page.server.ts`

- [ ] **Step 1: Write new invoice server**

```ts
import { supabase } from '$lib/server/supabase';
import { parseTogglPaste, parseTogglCSV } from '$lib/server/toggl';
import { generateInvoiceNumber, calculateTotals } from '$lib/server/invoice';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const { data: clients } = await supabase.from('clients').select('*').order('name');
  return { clients: clients ?? [] };
};

export const actions: Actions = {
  /** Parse Toggl paste and return line items for review */
  parseToggl: async ({ request }) => {
    const data = await request.formData();
    const text = data.get('toggl_text') as string;
    const clientId = data.get('client_id') as string;
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    const entries = parseTogglPaste(text);
    const items = entries.map((e, i) => ({
      type: 'time' as const,
      description: e.description,
      duration_raw: e.duration_raw,
      duration_rounded: e.duration_rounded,
      rate: client.hourly_rate,
      amount: Math.round(e.hours_rounded * client.hourly_rate * 100) / 100,
      sort_order: i,
    }));
    return { parsed: items, client_id: clientId };
  },

  /** Parse Toggl CSV upload */
  parseCSV: async ({ request }) => {
    const data = await request.formData();
    const file = data.get('csv_file') as File;
    const text = await file.text();
    const clientId = data.get('client_id') as string;
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    const entries = parseTogglCSV(text);
    const items = entries.map((e, i) => ({
      type: 'time' as const,
      description: e.description,
      duration_raw: e.duration_raw,
      duration_rounded: e.duration_rounded,
      rate: client.hourly_rate,
      amount: Math.round(e.hours_rounded * client.hourly_rate * 100) / 100,
      sort_order: i,
    }));
    return { parsed: items, client_id: clientId };
  },

  /** Generate invoice from confirmed line items */
  generate: async ({ request }) => {
    const data = await request.formData();
    const clientId = data.get('client_id') as string;
    const invoiceDate = data.get('invoice_date') as string;
    const dueDate = data.get('due_date') as string;
    const itemsJson = data.get('items') as string;
    const items = JSON.parse(itemsJson);

    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();

    // Increment seq
    const seq = client.invoice_seq + 1;
    await supabase.from('clients').update({ invoice_seq: seq }).eq('id', clientId);

    const invoiceNumber = generateInvoiceNumber(client.slug, seq);
    const totals = calculateTotals(items, client.tax_rate);

    const { data: invoice } = await supabase.from('invoices').insert({
      client_id: clientId,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      tax_rate: client.tax_rate,
      ...totals,
    }).select().single();

    await supabase.from('line_items').insert(
      items.map((item: any, i: number) => ({ ...item, invoice_id: invoice.id, sort_order: i }))
    );

    redirect(303, `/app/invoices/${invoice.id}`);
  }
};
```

- [ ] **Step 2: Write new invoice page**

Key UI elements:
- Client selector (dropdown)
- Input mode toggle: "Paste" | "CSV"
  - Paste: `<textarea>` + parse button
  - CSV: `<input type="file" accept=".csv">` + parse button
- Line items table (editable: description, duration_rounded, amount; delete row button; add expense row button)
- Invoice date + due date inputs
- Totals preview (subtotal, tax if > 0, total)
- Generate Invoice button (submits items as JSON)

- [ ] **Step 3: Test parse**

Paste the sample Toggl text from the spec. Confirm 12 rows appear with correct rounded durations and amounts at $50/hr.

- [ ] **Step 4: Commit**

```bash
git add src/routes/app/invoices/new/
git commit -m "feat: new invoice with toggl paste and csv parse, editable line items"
```

---

## Task 9: Invoice Detail + Status + Email

**Files:**
- Create: `src/routes/app/invoices/[id]/+page.svelte`
- Create: `src/routes/app/invoices/[id]/+page.server.ts`

- [ ] **Step 1: Write invoice detail server**

```ts
import { supabase } from '$lib/server/supabase';
import { sendInvoiceEmail } from '$lib/server/brevo';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { data: invoice } = await supabase
    .from('invoices').select('*, clients(*)').eq('id', params.id).single();
  if (!invoice) error(404);

  const { data: items } = await supabase
    .from('line_items').select('*').eq('invoice_id', params.id).order('sort_order');

  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();

  return { invoice, items: items ?? [], settings };
};

export const actions: Actions = {
  updateStatus: async ({ request, params }) => {
    const data = await request.formData();
    const status = data.get('status') as string;
    const update: any = { status };
    if (status === 'paid') update.paid_date = new Date().toISOString().split('T')[0];
    await supabase.from('invoices').update(update).eq('id', params.id);
  },

  updateLineItems: async ({ request, params }) => {
    // Only allowed while status is draft
    const { data: invoice } = await supabase
      .from('invoices').select('status').eq('id', params.id).single();
    if (invoice?.status !== 'draft') return fail(400, { error: 'Can only edit draft invoices' });

    const data = await request.formData();
    const itemsJson = data.get('items') as string;
    const items = JSON.parse(itemsJson);

    // Replace all line items for this invoice
    await supabase.from('line_items').delete().eq('invoice_id', params.id);
    await supabase.from('line_items').insert(
      items.map((item: any, i: number) => ({ ...item, invoice_id: params.id, sort_order: i }))
    );

    // Recalculate totals
    const { calculateTotals } = await import('$lib/server/invoice');
    const { data: inv } = await supabase.from('invoices').select('tax_rate').eq('id', params.id).single();
    const totals = calculateTotals(items, inv.tax_rate);
    await supabase.from('invoices').update(totals).eq('id', params.id);
  },

  sendEmail: async ({ params, url }) => {
    const { data: invoice } = await supabase
      .from('invoices').select('*, clients(*)').eq('id', params.id).single();
    if (!invoice?.clients?.email) return fail(400, { error: 'Client has no email' });

    const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
    const publicUrl = `${url.origin}/invoices/${invoice.public_token}`;

    await sendInvoiceEmail(
      invoice.clients.email,
      invoice.clients.name,
      invoice.invoice_number,
      publicUrl,
      settings?.owner_name ?? 'Alvar Sirlin'
    );

    await supabase.from('invoices').update({ status: 'sent' }).eq('id', params.id);
  }
};
```

- [ ] **Step 2: Write invoice detail page**

Renders the invoice in the PDF style (see Task 10 for shared component). Adds:
- Status badge (Draft / Sent / Paid)
- "Mark Sent" button (draft only)
- "Mark Paid" button (sent only), records date
- "Send Email" button — calls sendEmail action
- "Copy Link" button — copies `/invoices/[public_token]` to clipboard
- When status is draft: editable line items table above the invoice preview (same editable UI as new invoice page, submits via `?/updateLineItems`)

- [ ] **Step 3: Test status flow**

Generate an invoice. Confirm it shows as Draft. Click Mark Sent, confirm status updates. Click Mark Paid, confirm paid_date is set.

- [ ] **Step 4: Commit**

```bash
git add src/routes/app/invoices/[id]/
git commit -m "feat: invoice detail with status actions and email send"
```

---

## Task 10: Invoice Layout Component + Public Page

**Files:**
- Create: `src/lib/components/InvoiceView.svelte`
- Create: `src/routes/invoices/[token]/+page.svelte`
- Create: `src/routes/invoices/[token]/+page.server.ts`

- [ ] **Step 1: Write `InvoiceView.svelte`**

Reusable component used in both the app detail view and the public page.

```svelte
<script lang="ts">
  import type { Invoice, LineItem, Client, Settings } from '$lib/types';
  import { formatCurrency, formatDate } from '$lib/utils';

  let { invoice, items, client, settings }: {
    invoice: Invoice;
    items: LineItem[];
    client: Client;
    settings: Settings;
  } = $props();
</script>

<div class="max-w-3xl mx-auto p-10 font-sans text-[#1a1a6e]">

  <!-- Header row -->
  <div class="flex justify-between items-start mb-8">
    <div>
      <h1 class="text-4xl font-bold mb-4">Invoice</h1>
      <div class="text-sm space-y-1">
        <div><span class="font-bold">Invoice ID:</span> #{invoice.invoice_number}</div>
        <div><span class="font-bold">Invoice Date:</span> {formatDate(invoice.invoice_date)}</div>
        {#if invoice.due_date}
          <div><span class="font-bold">Due date:</span> {formatDate(invoice.due_date)}</div>
        {/if}
      </div>
    </div>
    <!-- Logo: orange circle with crosshair -->
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="32" fill="#ff3103"/>
      <line x1="32" y1="8" x2="32" y2="56" stroke="white" stroke-width="3"/>
      <line x1="8" y1="32" x2="56" y2="32" stroke="white" stroke-width="3"/>
      <circle cx="32" cy="32" r="10" fill="none" stroke="white" stroke-width="3"/>
    </svg>
  </div>

  <!-- Billing info -->
  <div class="grid grid-cols-2 gap-8 mb-8 text-sm">
    <div>
      <div class="font-bold mb-1">Billed to:</div>
      <div>{client.name}</div>
      {#if client.company}<div>{client.company}</div>{/if}
      {#if client.project}<div>{client.project}</div>{/if}
    </div>
    <div>
      <div class="font-bold mb-1">Pay to:</div>
      <div>{settings.owner_name}</div>
      {#if settings.address}
        {#each settings.address.split('\n') as line}
          <div>{line}</div>
        {/each}
      {/if}
      {#if settings.zelle}
        <div class="mt-1">Zelle (preferred): {settings.zelle}</div>
      {/if}
    </div>
  </div>

  <!-- Line items -->
  <table class="w-full text-sm mb-0">
    <thead>
      <tr class="border-t border-b border-[#1a1a6e] uppercase text-xs">
        <th class="text-left py-2 font-semibold">Description</th>
        <th class="text-right py-2 font-semibold text-[#ff3103]">Quantity</th>
        <th class="text-right py-2 font-semibold"></th>
      </tr>
    </thead>
    <tbody>
      {#each items as item}
        <tr class="border-b border-gray-200">
          <td class="py-2">{item.description}</td>
          <td class="py-2 text-right text-[#ff3103]">
            {item.duration_rounded ?? '—'}
          </td>
          <td class="py-2 text-right">{formatCurrency(item.amount, client.currency)}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <!-- Subtotal row -->
  <div class="flex justify-between items-center border-t border-b border-[#1a1a6e] py-2 mt-0 text-sm">
    <span class="font-semibold text-[#ff3103] uppercase">Subtotal</span>
    <div class="flex gap-12">
      <span class="text-[#ff3103]">
        {items.filter(i => i.type === 'time').reduce((s, i) => s + (i.hours_rounded ?? 0), 0).toFixed(2)}h
      </span>
      <span>{formatCurrency(invoice.subtotal, client.currency)}</span>
    </div>
  </div>

  <!-- Tax row (only if tax_rate > 0) -->
  {#if invoice.tax_rate > 0}
    <div class="flex justify-end gap-12 text-sm py-2 border-b border-gray-200">
      <span>Tax ({(invoice.tax_rate * 100).toFixed(0)}%)</span>
      <span>{formatCurrency(invoice.tax_amount, client.currency)}</span>
    </div>
  {/if}

  <!-- Total -->
  <div class="flex justify-end mt-4">
    <div class="text-right">
      <div class="text-xs uppercase tracking-wide text-[#1a1a6e] mb-1">Total</div>
      <div class="text-3xl font-bold">{formatCurrency(invoice.total, client.currency)}</div>
    </div>
  </div>

</div>
```

- [ ] **Step 2: Write public invoice server**

```ts
import { supabase } from '$lib/server/supabase';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { data: invoice } = await supabase
    .from('invoices').select('*, clients(*)').eq('public_token', params.token).single();
  if (!invoice) error(404);

  const { data: items } = await supabase
    .from('line_items').select('*').eq('invoice_id', invoice.id).order('sort_order');

  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();

  return { invoice, client: invoice.clients, items: items ?? [], settings };
};
```

- [ ] **Step 3: Write public page**

```svelte
<script lang="ts">
  import InvoiceView from '$lib/components/InvoiceView.svelte';
  let { data } = $props();
</script>

<InvoiceView invoice={data.invoice} items={data.items} client={data.client} settings={data.settings} />
```

- [ ] **Step 4: Test public view**

Generate an invoice. Copy the public link from the detail page. Open in incognito. Confirm invoice renders, no nav visible.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ src/routes/invoices/
git commit -m "feat: public invoice view matching PDF layout"
```

---

## Task 11: Invoice History

**Files:**
- Create: `src/routes/app/history/+page.svelte`
- Create: `src/routes/app/history/+page.server.ts`

- [ ] **Step 1: Write history server**

```ts
import { supabase } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const clientId = url.searchParams.get('client');
  const status = url.searchParams.get('status');

  let query = supabase
    .from('invoices')
    .select('*, clients(name, slug)')
    .order('created_at', { ascending: false });

  if (clientId) query = query.eq('client_id', clientId);
  if (status) query = query.eq('status', status);

  const { data: invoices } = await query;
  const { data: clients } = await supabase.from('clients').select('id, name').order('name');

  return { invoices: invoices ?? [], clients: clients ?? [] };
};
```

- [ ] **Step 2: Write history page**

Table with columns: Invoice #, Client, Date, Status, Total. Client and status filter dropdowns. Each row links to `/app/invoices/[id]`.

- [ ] **Step 3: Test**

Generate 2+ invoices. Confirm they appear. Filter by client. Filter by status.

- [ ] **Step 4: Commit**

```bash
git add src/routes/app/history/
git commit -m "feat: invoice history with client and status filters"
```

---

## Task 12: Vercel Deployment

**Files:**
- Create: `vercel.json` (if needed)

- [ ] **Step 1: Install Vercel adapter**

```bash
npm install -D @sveltejs/adapter-vercel
```

Update `svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-vercel';
```

- [ ] **Step 2: Push to GitHub**

```bash
git remote add origin https://github.com/yourusername/invoice-gen.git
git push -u origin main
```

- [ ] **Step 3: Connect to Vercel**

In Vercel dashboard: Import project → select repo → Framework: SvelteKit (auto-detected).

Add environment variables in Vercel project settings:
- `APP_PASSWORD`
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_KEY`
- `BREVO_API_KEY`

- [ ] **Step 4: Deploy and verify**

Trigger deploy. Visit production URL. Login with password. Generate a test invoice. View public link.

- [ ] **Step 5: Commit**

```bash
git add svelte.config.js package.json
git commit -m "chore: switch to vercel adapter for deployment"
```

---

## Iteration Notes

_Add notes here during implementation_
