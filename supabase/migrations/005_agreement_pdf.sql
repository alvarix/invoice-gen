-- Add PDF URL to agreements (set by owner after uploading to Supabase Storage)
alter table agreements add column pdf_url text;

-- Create public storage bucket for agreement PDFs
-- Files are publicly readable via the storage URL; upload requires service role key (server only)
insert into storage.buckets (id, name, public)
values ('agreements', 'agreements', true)
on conflict (id) do nothing;
