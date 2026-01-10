import { serverClient } from './supabaseClient';

export async function logEvent(actorId: string | null, action: string, payload: any) {
  if (!serverClient) {
    console.error('[audit] serverClient not configured; skipping logEvent', { actorId, action });
    return;
  }

  const row = {
    actor_id: actorId,
    action,
    payload
  };

  // Use service role to write eventlog; prefer lowercase name first, fallback to EventLog.
  const primary = await serverClient.from('eventlog').insert(row);
  if (!primary.error) return;

  console.error('[audit] insert eventlog failed; retrying EventLog', { error: primary.error });
  const fallback = await serverClient.from('EventLog').insert(row);
  if (fallback.error) {
    console.error('[audit] insert EventLog failed', { error: fallback.error });
  }
}

// TODO: add error handling, batching, and retention rules. Ensure logs are immutable and auditable.
