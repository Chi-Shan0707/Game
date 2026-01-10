import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../lib/supabaseClient';

type PredictBody = {
  marketId?: unknown;
  outcomeIdx?: unknown;
  points?: unknown;
  userId?: unknown; // dev-only fallback
};

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v : null;
}

function asInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isInteger(Number(v))) return Number(v);
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!serverClient) {
    return res.status(501).json({ error: 'Supabase configuration missing' });
  }

  const body = (req.body || {}) as PredictBody;
  const marketId = asString(body.marketId);
  const outcomeIdx = asInt(body.outcomeIdx);
  const points = asInt(body.points);

  if (!marketId || outcomeIdx === null || points === null || points <= 0) {
    return res.status(400).json({ error: 'Invalid marketId, outcomeIdx, or points' });
  }

  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!bearerToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Resolve user using token
  const { data: userData, error: authError } = await (serverClient.auth.api as any).getUser(bearerToken);
  if (authError || !userData?.id) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  const userId = userData.id;

  // Call the atomic RPC
  const { data, error: rpcError } = await serverClient.rpc('execute_prediction', {
    market_uuid: marketId,
    user_uuid: userId,
    outcome_idx: outcomeIdx,
    amount_to_bet: points
  });

  if (rpcError) {
    console.error('[predict] RPC failed:', rpcError);
    return res.status(500).json({ error: rpcError.message || 'Transaction failed' });
  }

  return res.status(200).json({ ok: true, data });
}
