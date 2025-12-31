import { serverClient } from './supabaseClient';

export async function logEvent(actorId: string | null, action: string, payload: any) {
  // Use serverClient (service role) to write EventLog
  await serverClient.from('EventLog').insert({
    actor_id: actorId,
    action,
    payload
  });
}

// TODO: add error handling, batching, and retention rules. Ensure logs are immutable and auditable.
