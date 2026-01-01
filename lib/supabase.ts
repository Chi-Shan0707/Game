// Convenience re-export for callers expecting `lib/supabase.ts`
// NOTE: `serverClient` must only be imported/used in server-side code (API routes).
export { clientSideSupabase, serverClient } from './supabaseClient';
