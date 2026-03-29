create table agreements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  content text,
  status text not null default 'draft' check (status in ('draft','sent','accepted')),
  public_token uuid unique not null default gen_random_uuid(),
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table agreements enable row level security;
