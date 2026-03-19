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
- **Expense line items** — add non-time items alongside time entries
- **Editable invoices** — modify line items, descriptions, amounts, and invoice numbers in draft mode
- **Invoice lifecycle** — Draft, Sent, Paid status tracking with paid date
- **Email sending** — preview modal with confirmation, BCC copy to owner, disabled on localhost
- **Public invoice links** — shareable `/invoices/[token]` pages, no login required
- **Print/PDF** — clean printable view with repeating header on multi-page invoices
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
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `APP_PASSWORD` | Owner login password |
| `BREVO_API_KEY` | Brevo transactional email API key |
| `BREVO_SENDER_EMAIL` | Verified sender email in Brevo |
| `PUBLIC_BASE_URL` | Production URL (required for email links, blocks sending if unset) |

### Database

Run the migration files in `supabase/migrations/` in order in the Supabase SQL editor.

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
3. Add environment variables
4. Deploy
