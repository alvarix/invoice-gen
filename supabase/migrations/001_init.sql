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
