import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../lib/supabaseClient';
import { logEvent } from '../../lib/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-sim-admin-key'];
  if (adminKey !== process.env.SIMULATION_ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!serverClient) {
    return res.status(501).json({ error: 'Supabase not configured' });
  }

  const { marketId, outcomeIdx } = req.body;

  if (!marketId || typeof outcomeIdx !== 'number') {
    return res.status(400).json({ error: 'Invalid body' });
  }

  // 1. Update market status
  const { error: marketError } = await serverClient
    .from('market')
    .update({ status: 'settled', end_at: new Date().toISOString() })
    .eq('id', marketId);

  if (marketError) {
    return res.status(500).json({ error: 'Failed to update market', details: marketError });
  }

  // 2. Create settlement record
  const { error: settlementError } = await serverClient
    .from('settlement')
    .insert({
      market_id: marketId,
      outcome_idx: outcomeIdx,
      settled_at: new Date().toISOString()
    });

  if (settlementError) {
    console.error('Settlement insert failed', settlementError);
    // Continue anyway to log event
  }

  // 3. Log event
  await logEvent(null, 'MARKET_SETTLED', { marketId, outcomeIdx });

  // TODO: Calculate and apply reputation updates for all predictors
  // This would typically be a background job or a stored procedure

  return res.json({ ok: true, message: 'Market settled' });
}
