import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

/** Server-side Supabase client using service role key — bypasses RLS */
export const supabase = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
