-- Add portal token to clients for client-facing portal URL
alter table clients
  add column portal_token text unique default gen_random_uuid()::text;

-- Backfill existing clients
update clients set portal_token = gen_random_uuid()::text where portal_token is null;

-- Optional markdown notes field on invoices
alter table invoices
  add column notes text;
