import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../lib/supabaseClient';
import { logEvent } from '../../lib/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Authorization Check (Admin only)
  const adminKey = req.headers['x-sim-admin-key'];
  if (adminKey !== process.env.SIMULATION_ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!serverClient) return res.status(501).json({ error: 'Supabase missing' });

  const { marketId, outcomeIdx } = req.body;
  if (!marketId || typeof outcomeIdx !== 'number') return res.status(400).json({ error: 'Invalid body' });

  // 2. Fetch Market Data
  const { data: market, error: marketFetchError } = await serverClient
    .from('market')
    .select('*')
    .eq('id', marketId)
    .single();

  if (marketFetchError || !market) return res.status(404).json({ error: 'Market not found' });
  if (market.status === 'settled') return res.status(400).json({ error: 'Market already settled' });

  const totalPool = Number(market.total_pool) || 0;
  const pools = Array.isArray(market.pool) ? market.pool.map(Number) : [0, 0];
  const winningPool = pools[outcomeIdx] || 0;

  // 3. Update Market Status
  const { error: marketUpdateError } = await serverClient
    .from('market')
    .update({ 
      status: 'settled', 
      resolved_outcome_idx: outcomeIdx,
      end_at: new Date().toISOString() 
    })
    .eq('id', marketId);

  if (marketUpdateError) return res.status(500).json({ error: 'Failed to update market' });

  // 4. Calculate and Distribute Payouts
  const { data: positions, error: posError } = await serverClient
    .from('position')
    .select('*')
    .eq('market_id', marketId);

  if (posError) console.error('Error fetching positions:', posError);

  if (positions && winningPool > 0) {
    const payoutMultiplier = totalPool / winningPool;

    for (const pos of positions) {
      const holdings = pos.holdings || {};
      const userShares = Number(holdings[outcomeIdx]) || 0;

      if (userShares > 0) {
        const payoutAmount = Math.floor(userShares * payoutMultiplier);
        
        // Update user points
        await serverClient.rpc('increment_user_points', { 
          user_uuid: pos.user_id, 
          amount: payoutAmount 
        });

        // Record reputation gain
        await serverClient.from('reputation_record').insert({
          user_id: pos.user_id,
          market_id: marketId,
          change: 10, // constant for now, could be dynamic
          reason: `Market resolution: ${market.title}`
        });

        // Update position profit
        await serverClient
          .from('position')
          .update({ realized_profit: payoutAmount - userShares })
          .eq('id', pos.id);
      }
    }
  }

  // 5. Create settlement record & Log
  await serverClient.from('settlement').insert({
    market_id: marketId,
    outcome_idx: outcomeIdx,
    settled_at: new Date().toISOString()
  });

  await logEvent(null, 'MARKET_SETTLED', { marketId, outcomeIdx, totalPool });

  return res.json({ ok: true, message: 'Market settled successfully' });
}
