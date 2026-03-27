# Feature Spec: Client Agreements

## Overview

Add the ability to create, send, and track client agreements (hosting contracts, service agreements, etc.) alongside the existing invoice system. Agreements have public links, similar to invoices, and an acceptance workflow.

## Data model

### `agreements` table

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| client_id | uuid (FK -> clients) | |
| title | text | e.g. "Managed Hosting and Support Agreement" |
| content | text | Markdown body of the agreement |
| status | text | `draft`, `sent`, `accepted` |
| public_token | uuid | For shareable `/agreements/[token]` URL |
| sent_at | timestamptz | Null until sent |
| accepted_at | timestamptz | Null until accepted |
| accepted_ip | text | IP address at time of acceptance |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | |

No versioning for now. If an agreement needs to change after acceptance, create a new one.

## Routes

### Owner routes (behind auth)

- `/app/agreements` - list all agreements, grouped by client, filterable by status
- `/app/agreements/new` - create new agreement: select client, enter title, write/paste markdown content
- `/app/agreements/[id]` - view/edit agreement, send to client, see acceptance status

### Public routes (no auth)

- `/agreements/[token]` - rendered agreement with client name, date, and an "I Accept" button at the bottom (only shown if status is `sent`)

## Acceptance flow

1. Owner creates agreement in draft, writes or pastes markdown content
2. Owner clicks "Send" - emails client a link to `/agreements/[token]`, status becomes `sent`
3. Client opens link, reads rendered markdown agreement
4. Client clicks "I Accept This Agreement" button
5. Server records `accepted_at` timestamp and `accepted_ip`, status becomes `accepted`
6. Owner receives email notification of acceptance
7. Public page now shows "Accepted on [date]" instead of the accept button

## Email templates

### Agreement sent (to client)

Subject: `Agreement: [title] from [owner_name]`
Body: Brief message with link to public agreement page.

### Agreement accepted (to owner)

Subject: `[client_name] accepted: [title]`
Body: Confirmation with timestamp and link to the agreement in the app.

## UI notes

- Agreement content editor: a textarea with markdown, plus a preview toggle/tab
- Public agreement page: clean rendered markdown, similar styling to the public invoice page
- The accept button should require a confirmation step (modal or inline) to prevent accidental clicks
- After acceptance, the page should feel like a receipt: accepted date, both party names, the full text

## Migration

Single migration file adding the `agreements` table. No changes to existing tables.

## Out of scope (for now)

- PDF export of agreements
- Multiple versions/amendments
- Counter-signing by the owner
- Expiration dates
- Template library (just copy/paste content for now)
