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
    return res.status(501).json({
      error: 'Supabase is not configured on server',
      todo: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    });
  }

  const body = (req.body || {}) as PredictBody;
  const marketId = asString(body.marketId);
  const outcomeIdx = asInt(body.outcomeIdx);
  const points = asInt(body.points);
  if (!marketId || outcomeIdx === null || points === null) {
    return res.status(400).json({
      error: 'Invalid request body',
      expected: { marketId: 'string', outcomeIdx: 'int', points: 'int' }
    });
  }

  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  // Resolve userId
  let userId: string | null = null;
  if (bearerToken) {
    const { data, error } = await (serverClient as any).auth.api.getUser(bearerToken);
    if (error || !data?.id) {
      console.error('[predict] auth.api.getUser failed', { error });
      return res.status(401).json({ error: 'Invalid session token' });
    }
    userId = data.id;
  } else {
    // Dev fallback: allow explicit userId in request body when no auth is wired yet.
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Authorization required' });
    }
    userId = asString(body.userId);
    if (!userId) {
      return res.status(401).json({
        error: 'Authorization required (dev fallback: pass userId in body)',
        example: { marketId, outcomeIdx, points, userId: 'uuid' }
      });
    }
  }

  const rpcArgsV1 = {
    market_uuid: marketId,
    user_uuid: userId,
    outcome_idx: outcomeIdx,
    points
  };

  // Some DB setups may name parameters market_id/user_id; try both for compatibility.
  const rpcArgsV2 = {
    market_id: marketId,
    user_id: userId,
    outcome_idx: outcomeIdx,
    points
  };

  console.error('[predict] rpc params', { rpcArgsV1, rpcArgsV2 });

  const first = await serverClient.rpc('execute_prediction', rpcArgsV1 as any);
  if (first.error) {
    console.error('[predict] rpc v1 failed', { error: first.error, rpcArgsV1 });
    const second = await serverClient.rpc('execute_prediction', rpcArgsV2 as any);
    if (second.error) {
      console.error('[predict] rpc v2 failed', { error: second.error, rpcArgsV2 });
      return res.status(500).json({
        error: 'RPC failed',
        details: second.error.message || second.error,
        hint: 'Check that execute_prediction exists and parameter names match your function definition.'
      });
    }
    return res.json({ ok: true, mode: 'rpc_v2', data: second.data });
  }

  return res.json({ ok: true, mode: 'rpc_v1', data: first.data });
}
