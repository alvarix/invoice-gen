# Invoice Generator

A personal invoice management tool for freelancers. Ingest Toggl time entries, generate branded invoices, email them to clients, and track payment status.

## Stack

- **SvelteKit** (Svelte 5 runes) — frontend and server routes
- **Supabase** (Postgres + Storage) — database via service role key (no client-side RLS)
- **TailwindCSS v4** — styling
- **Brevo** — transactional email API
- **marked** — server-side markdown rendering
- **Vercel** — deployment via `@sveltejs/adapter-vercel`

## Features

- **Client management** — per-client hourly rates, tax rates, currency, invoice sequences
- **Toggl ingestion** — paste or CSV upload, auto-rounds to nearest 15 minutes
- **Manual invoice entry** — create invoices without Toggl data using the Manual tab
- **Expense line items** — add non-time items alongside time entries
- **Editable invoices** — modify line items, descriptions, amounts, and invoice numbers in draft mode
- **Invoice notes** — optional markdown field rendered below totals on the invoice
- **Invoice lifecycle** — Draft, Sent, Paid status tracking with paid date
- **Email sending** — preview modal with confirmation, disabled on localhost
- **Public invoice links** — shareable `/invoices/[token]` pages, no login required
- **Print/PDF** — clean printable view with `@page` margin header and page numbers
- **Client portal** — token-gated `/portal/[token]` page showing a client's invoices and agreements
- **Agreements** — create markdown or PDF agreements, send to clients, email link via Brevo, track acceptance with timestamp + IP + optional typed-name signature
- **Agreement PDF naming** — uploaded PDFs stored as `{ownerName} - {title}.pdf` for friendly download names
- **Agreement print/PDF** — "Download / Print PDF" prints the full agreement including acceptance receipt
- **Slug URLs** — agreement public links use `slug--uuid` format for readability; bare UUID links are also accepted
- **Trash** — soft-delete invoices, restore or purge; auto-purge of items older than 90 days on trash page load
- **Invoice number pre-fill** — invoice number field auto-populated from client slug + year + sequence, editable before generating
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
| `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase anon/public key (required at build time) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS, server-only) |
| `APP_PASSWORD` | Owner login password |
| `BREVO_API_KEY` | Brevo transactional email API key |
| `BREVO_SENDER_EMAIL` | Verified sender email in Brevo |
| `PUBLIC_BASE_URL` | Production URL — required for email links, blocks sending if unset |

### Database

Run migrations in order in the Supabase SQL editor:

| Migration | Description |
|---|---|
| `001_init.sql` | Core tables: clients, invoices, line_items, settings |
| `002_settings_email_phone.sql` | Email and phone fields on settings |
| `003_client_portal.sql` | `portal_token` on clients, `notes` on invoices |
| `004_agreements.sql` | Agreements table |
| `005_agreement_pdf.sql` | `pdf_url` on agreements, Supabase Storage bucket `agreements` |
| Manual | `ALTER TABLE invoices ADD COLUMN deleted_at timestamptz DEFAULT NULL;` + index — enables soft delete / trash |
| Manual | `ALTER TABLE agreements ADD COLUMN require_signature boolean NOT NULL DEFAULT false, ADD COLUMN accepted_name text;` — typed-name signature on acceptance |

### Supabase Storage

Migration `005` creates a public bucket named `agreements` for PDF uploads. The service role key handles uploads server-side — no additional configuration needed.

## URLs

### Owner (requires login)

| URL | Description |
|---|---|
| `/login` | Owner login |
| `/app/invoices/new` | Create invoice (Toggl paste, CSV, or manual) |
| `/app/history` | Invoice history with soft-delete |
| `/app/trash` | Trashed invoices — restore or permanently delete, auto-purges after 90 days |
| `/app/agreements` | Agreements list |
| `/app/agreements/new` | Create agreement |
| `/app/agreements/[id]` | Edit, send, email to client, upload PDF, live client preview, track acceptance |
| `/app/clients` | Client management + portal link copy/reset |
| `/app/settings` | Owner info used on invoices |

### Public (no login)

| URL | Description |
|---|---|
| `/invoices/[token]` | Shareable invoice view, print/PDF |
| `/agreements/[token]` | Agreement view with two-step acceptance flow |
| `/portal/[token]` | Client portal — their invoices and agreements |

Portal tokens are per client. Copy or reset from `/app/clients`.

## Development

```sh
npm run dev          # start dev server on :5173
npm run build        # production build
npm run preview      # preview production build
npx svelte-check     # type checking
```

## Deployment

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables (`PUBLIC_*` vars must be present at build time)
4. Deploy
5. Run migrations in Supabase SQL editor in order
