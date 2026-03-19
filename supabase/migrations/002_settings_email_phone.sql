-- Add email and phone fields to owner settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone text;
