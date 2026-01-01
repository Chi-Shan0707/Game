import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side (public anon key) - safe for browser
export const clientSideSupabase: SupabaseClient | null =
	supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Server-side (service role) - MUST only be used in API routes or server runtime
export const serverClient: SupabaseClient | null =
	supabaseUrl && supabaseServiceRoleKey
		? createClient(supabaseUrl, supabaseServiceRoleKey)
		: null;
