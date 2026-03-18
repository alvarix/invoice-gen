# Invoice Generator — Design Spec

Date: 2026-03-18

## Overview

A SvelteKit web app for generating, managing, and sharing invoices. Runs on Vercel, uses Supabase for persistence, Brevo for transactional email. Designed for a single operator (Alvar) with multiple clients. Clients receive a magic link to view their invoice at a public URL.

---

## Tech Stack

- **Frontend/Backend**: SvelteKit (deployed to Vercel)
- **Database**: Supabase (Postgres + RLS enabled)
- **Email**: Brevo API (transactional)
- **Auth**: Single password (env var) for operator; public token URL for clients

---

## Authentication

- **Operator**: Login with a passphrase stored as a bcrypt hash in the `APP_PASSWORD` env var. On login, the submitted password is compared using bcrypt. Session persists via a signed cookie (`SESSION_SECRET` env var).
- **Client invoice view**: Public URL using a random `public_token` (UUID). No login required. URL acts as the access key.

---

## Data Model

### `settings` (single row)
| Field | Type | Notes |
|---|---|---|
| id | int | always 1 |
| owner_name | text | e.g. "Alvar Sirlin" |
| address | text | multi-line |
| payment_info | text | e.g. "Zelle: alvarix@gmail.com" |

### `clients`
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| slug | text | short identifier used in invoice numbers, e.g. "wmw" |
| name | text | contact name |
| company | text | company name |
| project_name | text | project label |
| email | text | for sending invoice link |
| hourly_rate | numeric | default rate |
| currency | text | default "USD" |
| tax_rate | numeric | percentage, e.g. 8.875 |
| invoice_seq | int | auto-increments on Generate |
| created_at | timestamp | |

### `invoices`
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| client_id | uuid | foreign key → clients |
| invoice_number | text | e.g. "wmw-2026-2", assigned on Generate |
| invoice_date | date | defaults to current date |
| due_date | date | defaults to invoice_date + 14 days |
| status | enum | draft, sent, paid |
| sent_at | timestamp | nullable, set when email is sent |
| paid_date | date | nullable |
| tax_rate | numeric | snapshot from client at Generate time |
| currency | text | snapshot from client at Generate time |
| subtotal | numeric | sum of line item amounts |
| tax_amount | numeric | |
| total | numeric | |
| notes | text | nullable, free-text per-invoice memo |
| public_token | uuid | random, used in public URL |
| created_at | timestamp | |

Indexes: `invoices.client_id`, `line_items.invoice_id`

### `line_items`
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| invoice_id | uuid | foreign key → invoices |
| type | enum | time, expense |
| description | text | raw from paste or manual entry |
| duration_raw | text | original duration string, e.g. "1:52:26" (time only, null for expense) |
| duration_rounded | numeric | hours rounded up to nearest 0.25 (time only, null for expense) |
| rate | numeric | hourly rate at Generate time (time only, null for expense) |
| amount | numeric | calculated total for this line |
| sort_order | int | for manual reordering |

---

## Invoice Number Format

`[client-slug]-[year]-[seq]` — e.g. `wmw-2026-2`

- `slug` is stored on the client record, editable
- Sequence (`invoice_seq`) increments on the client record at Generate time
- Invoice number is editable before clicking Generate; manual edits do not affect the counter
- Uniqueness is not enforced by the database but a warning is shown if a duplicate number is detected

---

## New Invoice Flow — Draft vs Generate

**Save as Draft**
- Saves line items and metadata with `status = draft`
- No invoice number assigned yet
- Fully editable

**Generate**
- Assigns invoice number (increments `invoice_seq` on the client)
- Snapshots `tax_rate` and `currency` from client onto the invoice
- Snapshots `rate` from client onto each time line item
- Status remains `draft` — does not send anything
- Invoice number is locked after Generate (no further edits without voiding)

**Sent invoices are read-only in v1.** To correct a sent invoice, create a new one manually. Voiding/replacing is out of scope for v1.

---

## Toggl Paste Parser

The input is a manual copy-paste from Toggl's web interface (not a CSV export). The format alternates description and duration lines:

```
2: deploy
1:00:05
2: design
1:52:26
2: local; update landing: content and french page
0:57:48
status call
1:04:34
```

Rules:
- Lines alternate: description line, then duration line
- Description is taken as-is — prefixes like `2:` are NOT stripped (they are the operator's own notation for which invoice the entry belongs to)
- Duration format is `H:MM:SS` — rounded up to the nearest 15 minutes (0.25 hr increments). Example: `1:52:26` → rounds to `2:00` → at $50/hr = $100.00
- If description is blank or whitespace → use "misc"
- Blank description example: if a line is empty or only spaces before the duration line, the generated row description is "misc"
- Amount = `duration_rounded × client hourly_rate`

The operator sees a table of editable rows after parsing. Each row shows: description, rounded hours, rate, amount. All fields are editable. Rows can be deleted or reordered. The raw `duration_raw` is stored for audit but not shown in the UI.

**Future:** a built-in timer may replace or supplement the paste input. The data model supports this — `duration_raw` would hold the timer output in the same `H:MM:SS` format.

---

## Application Screens

### Authenticated (operator)

**Sidebar navigation:**
- New Invoice
- Clients
- History
- Settings

**New Invoice**
1. Select client from dropdown
2. Invoice metadata: number (shown as preview, not yet assigned), date (defaults today), due date (defaults +14 days)
3. Paste Toggl text → parse → display editable line items table (description, rounded hours, rate, amount)
4. Add/edit/delete time rows
5. Add expense rows (description + flat amount, no hours/rate)
6. Optional notes field (free text)
7. Tax rate shown (from client default, editable per invoice)
8. Live totals: subtotal, tax, total
9. Save as Draft / Generate

**Invoice Detail**
- Full invoice view
- Status controls: mark Sent (sets `sent_at`), mark Paid (with date picker for `paid_date`)
- Send email to client (triggers Brevo, sends public link, sets `sent_at`, status → sent)
- Copy public link to clipboard
- Edit only available while status is `draft`

**Clients**
- List of clients
- Add / edit client form
- Fields: name, company, project name, email, hourly rate, currency, tax rate, slug

**History**
- All invoices, sorted by date descending
- Filter by client, filter by status
- Click to open Invoice Detail

**Settings**
- Owner name, address, payment info (shown on all invoices)
- Note: app password is managed directly in the Vercel dashboard (env var)

### Public (client-facing)

**`/i/[public_token]`**
- Read-only invoice matching the PDF template layout
- Shows:
  - Your info: owner name, address, payment info (from settings)
  - Client info: contact name, company, project name
  - Invoice metadata: number, date, due date
  - Line items table: description, hours (time entries), amount
  - Subtotal, tax (if non-zero), total, currency (snapshotted from client at Generate time)
- No login, no actions
- Graceful 404 if token not found

---

## Email Flow

1. Operator clicks "Send to Client" on Invoice Detail
2. App calls Brevo API with client email
3. Email contains: invoice number, total due, link to `/i/[public_token]`
4. `sent_at` is set, invoice status → sent
5. Client clicks link, views invoice in browser

---

## PDF Export

Not built in v1. The public client view (`/i/[public_token]`) and the operator invoice detail both have a print stylesheet that hides navigation and produces a clean single-page output. Browser print → Save as PDF is the v1 workflow.

---

## Deployment

- **Vercel**: SvelteKit with `@sveltejs/adapter-vercel`
- **Supabase**: Postgres, RLS enabled. All server-side queries use the `service_role` key via SvelteKit server routes — never the anon key. The public invoice route (`/i/[public_token]`) queries via a server route with the service_role key, selecting only the row matching the token. The anon key is used only for client-side auth checks where RLS policies apply. This approach avoids exposing the anon key with overly permissive RLS policies.
- **Environment variables**:
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `BREVO_API_KEY`
  - `APP_PASSWORD` (bcrypt hash of operator passphrase)
  - `SESSION_SECRET` (random string for signing session cookies)

---

## Out of Scope (v1)

- CSV import from Toggl
- Built-in timer (future)
- Multi-user / team access
- Recurring invoices
- Client portal (client login)
- Native PDF generation (use browser print)
- Multiple payment methods per client
- Invoice void / replace workflow
- App password change UI (manage via Vercel dashboard)
