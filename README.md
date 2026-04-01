# Invoice Generator

A personal invoice management tool for freelancers. Ingest Toggl time entries, generate branded invoices, email them to clients, and track payment status.

## Stack

- **SvelteKit** (Svelte 5 runes) — frontend and server routes
- **Supabase** (Postgres) — database via service role key (no client-side RLS)
- **TailwindCSS v4** — styling
- **Brevo** — transactional email API
- **Vercel** — deployment via `@sveltejs/adapter-vercel`

## Features

- **Client management** — per-client hourly rates, tax rates, currency, invoice sequences
- **Toggl ingestion** — paste or CSV upload, auto-rounds to nearest 15 minutes
- **Manual invoice entry** — create invoices without Toggl data using the Manual tab
- **Expense line items** — add non-time items alongside time entries
- **Editable invoices** — modify line items, descriptions, amounts, and invoice numbers in draft mode
- **Invoice notes** — optional markdown field rendered below totals on the invoice
- **Invoice lifecycle** — Draft, Sent, Paid status tracking with paid date
- **Email sending** — preview modal with confirmation, BCC copy to owner, disabled on localhost
- **Public invoice links** — shareable `/invoices/[token]` pages, no login required
- **Print/PDF** — clean printable view with `@page` margin header and page numbers
- **Client portal** — token-gated `/portal/[token]` page showing a client's invoices and agreements
- **Agreements** — create markdown or PDF agreements, send to clients, track acceptance online
- **Owner auth** — single password login via `APP_PASSWORD` env var

## Setup

```sh
npm install
cp .env.example .env  # fill in values
npm run dev
```

### Environment variables

| Variable | Description |
|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS, server-only) |
| `APP_PASSWORD` | Owner login password |
| `BREVO_API_KEY` | Brevo transactional email API key |
| `BREVO_SENDER_EMAIL` | Verified sender email in Brevo |
| `PUBLIC_BASE_URL` | Production URL — required for email links, blocks sending if unset |

### Database

Run the migration files in `supabase/migrations/` in order in the Supabase SQL editor.

| Migration | Description |
|---|---|
| `001_init.sql` | Core tables: clients, invoices, line_items, settings |
| `002_settings_email_phone.sql` | Email and phone fields on settings |
| `003_client_portal.sql` | `portal_token` on clients, `notes` on invoices |
| `004_agreements.sql` | Agreements table |
| `005_agreement_pdf.sql` | `pdf_url` on agreements, Supabase Storage bucket `agreements` |

### Supabase Storage

Migration `005` creates a public bucket named `agreements` for PDF uploads. No additional configuration needed — the service role key handles uploads server-side.

## Development

```sh
npm run dev          # start dev server on :5173
npm run build        # production build
npm run preview      # preview production build
npx svelte-check     # type checking
```

## URLs

### Owner (requires login)

| URL | Description |
|---|---|
| `/login` | Owner login |
| `/app/invoices/new` | Create invoice (Toggl paste, CSV, or manual) |
| `/app/history` | Invoice history |
| `/app/agreements` | Agreements list |
| `/app/agreements/new` | Create agreement |
| `/app/agreements/[id]` | Edit, send, track agreement |
| `/app/clients` | Client management + portal links |
| `/app/settings` | Owner info used on invoices |

### Public (no login)

| URL | Description |
|---|---|
| `/invoices/[token]` | Shareable invoice view, print/PDF |
| `/agreements/[token]` | Agreement view with acceptance flow |
| `/portal/[token]` | Client portal — their invoices and agreements |

Portal tokens are managed per client in `/app/clients`. Copy or reset the link from there.

## Deployment

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables (see table above — `PUBLIC_*` vars must be present at build time)
4. Deploy
5. Run migrations in Supabase SQL editor in order
