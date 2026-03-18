# Invoice Generator — Spec

## Summary
A SvelteKit web app for generating, managing, and sharing invoices. Owner logs in with a password. Clients receive a Brevo email with a link to view their invoice publicly.

## Stack
- **Frontend/Backend:** SvelteKit (deployed to Vercel)
- **Database:** Supabase (Postgres + REST API)
- **Email:** Brevo transactional API
- **Auth:** Single password (env var) for owner; public token URL for clients

## Users
- **Owner (Alvar):** Full app access via password login
- **Client:** Read-only invoice view via emailed link (no login)

---

## Data Model

### `clients`
| field | type | notes |
|---|---|---|
| id | uuid | pk |
| slug | text | short identifier e.g. "wmw" |
| name | text | contact name e.g. "Gregory Cohen" |
| company | text | e.g. "Philanthropy Leaders" |
| project | text | e.g. "WMW Website" |
| email | text | for sending invoice links |
| hourly_rate | numeric | |
| currency | text | default "USD" |
| tax_rate | numeric | default 0, e.g. 0.15 for 15% |
| invoice_seq | integer | auto-increments on each new invoice |
| created_at | timestamp | |

### `invoices`
| field | type | notes |
|---|---|---|
| id | uuid | pk |
| client_id | uuid | fk → clients |
| invoice_number | text | e.g. "wmw-2026-2" |
| invoice_date | date | |
| due_date | date | |
| status | text | draft / sent / paid |
| paid_date | date | nullable |
| tax_rate | numeric | snapshot from client at creation |
| subtotal | numeric | |
| tax_amount | numeric | |
| total | numeric | |
| public_token | text | random string for public URL |
| created_at | timestamp | |

### `line_items`
| field | type | notes |
|---|---|---|
| id | uuid | pk |
| invoice_id | uuid | fk → invoices |
| type | text | "time" or "expense" |
| description | text | raw (prefix kept as-is) |
| duration_raw | text | nullable, e.g. "1:52:26" |
| duration_rounded | text | nullable, e.g. "2:00" |
| rate | numeric | nullable, hourly rate |
| amount | numeric | calculated |
| sort_order | integer | preserves input order |

### `settings` (single row)
| field | type | notes |
|---|---|---|
| id | integer | always 1 |
| owner_name | text | e.g. "Alvar Sirlin" |
| address | text | multi-line |
| zelle | text | e.g. "alvarix@gmail.com" |
| logo_url | text | path to logo asset |

---

## Auth
- Owner login: POST password (env var `APP_PASSWORD`) → server sets `HttpOnly` session cookie
- Client view: `/invoices/[public_token]` — no auth, token is the key
- All `/app/*` routes protected by server-side session check

---

## Screens

### Owner App (`/app/*`)

**`/app/invoices/new`** — New Invoice
- Select client from dropdown
- Toggle: Toggl paste | CSV upload
  - **Paste mode:** textarea → parse button → line items table
  - **CSV mode:** file input → parse → line items table
- Editable line items table (description, duration, amount; add/remove rows)
- Add expense button (description + amount)
- Totals preview (subtotal, tax if applicable, total)
- Generate button → creates draft invoice

**`/app/invoices/[id]`** — Invoice Detail
- Full invoice preview (matches public view)
- Status badge + actions: mark sent, mark paid (records paid_date)
- Send email button → sends Brevo email to client with public link
- Copy public link button
- Edit line items (while draft)

**`/app/clients`** — Client List
- Table of clients with last invoice date and status
- Add / edit client form

**`/app/history`** — Invoice History
- List all invoices, filter by client and status
- Click → Invoice Detail

**`/app/settings`** — Settings
- Edit owner name, address, Zelle info
- Upload logo

### Public (`/invoices/[public_token]`)
- Read-only invoice matching PDF layout
- No nav, no login

---

## Toggl Parse Logic

Input format (paste):
```
2: deploy
1:00:05
2: design
1:52:26
status call
1:04:34
```

Rules:
- Lines alternate: description, then duration
- Keep prefix as-is (e.g. "2: design" stays "2: design")
- Blank or missing description → use "misc"
- Duration: round up to nearest 15 minutes (1:52:26 → 1:52 → 2:00)
- Amount = rounded hours × client hourly rate

CSV format (Toggl export):
- Columns: Description, Duration (h:mm:ss)
- Same rounding logic applies
- Toggle between paste and CSV on the new invoice screen

---

## Invoice Design (matches PDF)

**Colors:**
- Primary text: dark navy `#1a1a6e` (approx)
- Accent: orange-red (SUBTOTAL label, QUANTITY values, logo)

**Layout:**
- Header: "Invoice" large bold left, logo top-right
- Invoice meta: ID, date, due date (top-left block)
- Billing info: two columns — "Billed to:" (client) | "Pay to:" (owner)
- Line items table: DESCRIPTION | QUANTITY (h:mm, orange) | AMOUNT
- HR separators above/below rows
- SUBTOTAL row (orange label, totals right)
- TOTAL block bottom-right, large bold navy
- Pay to block includes Zelle info

---

## Email (Brevo)

Trigger: owner clicks "Send to client" on Invoice Detail
- From: owner's Brevo-verified sender
- To: client email (from clients table)
- Subject: `Invoice [invoice_number] from Alvar Sirlin`
- Body: plain HTML with invoice summary and link to `/invoices/[public_token]`

---

## Future Considerations
- Timer integration (owner-built, rolling in later)
- CSV export of invoices
- Multiple currencies
- Serving invoices at custom domain path
