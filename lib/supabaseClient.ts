import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.warn('NEXT_PUBLIC_SUPABASE_URL is not set');
}

export const clientSideSupabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// serverClient must only be used in trusted server contexts (uses service role key)
export const serverClient: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);

export default clientSideSupabase;

// TODO: For server endpoints that require verifying a user's access token, read
// the Authorization: Bearer <access_token> header and call
// serverClient.auth.getUser() appropriately.
