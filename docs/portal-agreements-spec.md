# Spec: Client Portal + Agreements + Invoice Notes

## Overview

Three related features built together:
1. **Client portal** — a token-gated page at `/portal/[token]` where a client can view all their invoices and agreements
2. **Agreements** — owner creates markdown-based documents, sends to client, client accepts online
3. **Invoice notes** — optional markdown field on invoices rendered below line items (~10% of total work)

---

## Migrations

### 003_client_portal.sql
- `clients.portal_token` — unique UUID text column, auto-generated
- `invoices.notes` — nullable text field for optional markdown memo

### 004_agreements.sql
New `agreements` table:
- `id`, `client_id` (FK), `title`, `content` (markdown), `status` (draft/sent/accepted)
- `public_token` (UUID, for shareable URL)
- `sent_at`, `accepted_at`, `accepted_ip`, `created_at`, `updated_at`

---

## Routes

### Owner routes (behind /app auth)

| Route | Purpose |
|---|---|
| `/app/agreements` | List all agreements grouped by client, filterable by status |
| `/app/agreements/new` | Create: select client, title, markdown content |
| `/app/agreements/[id]` | View/edit, send, track acceptance |

`/app/agreements/[id]` has two tabs: Edit (textarea) / Preview (rendered markdown).
Status badge: draft / sent / accepted. Send button visible only when draft.

### Public routes (no auth)

| Route | Purpose |
|---|---|
| `/portal/[token]` | Client's invoices + agreements, read-only |
| `/agreements/[token]` | Rendered agreement with accept flow |

---

## Acceptance flow

1. Owner writes agreement in draft, clicks "Send to Client"
2. Status becomes `sent`, `sent_at` recorded
3. Client opens `/agreements/[token]`, reads rendered markdown
4. Client clicks "I Accept" — confirmation modal appears
5. Server records `accepted_at`, `accepted_ip`, sets status `accepted`
6. Page shows receipt: accepted date, both party names, full text
7. Email notification to owner (deferred — no live sends without env guard)

---

## Client portal `/portal/[token]`

- Minimal branded layout (no sidebar), owner info from settings
- Client name header
- Invoices section: list with status badge, amount, link to `/invoices/[token]`
- Agreements section: list with status badge, link to `/agreements/[token]`
- 404 if token not found

## Portal token management in /app/clients

- Portal URL shown per client row with copy button
- "Reset link" button regenerates `portal_token` — instantly invalidates old URL

---

## Invoice notes (small addition)

- Optional textarea on invoice edit page (draft only)
- Renders below totals on public invoice view
- Supports markdown, rendered server-side via `marked`
- Same textarea/preview component pattern as agreements editor

---

## Dependencies

- `marked` — markdown to HTML, used server-side for SSR rendering

---

## Out of scope

- Email delivery (stubbed, requires env guard)
- PDF export of agreements
- Agreement versioning / amendments
- E-signature by owner
- Expiration dates
- Template library
