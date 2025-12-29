import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../lib/supabaseClient';
import { brierScore, reputationDeltaFromBrier, updateAverageReputation } from '../../lib/reputation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const key = req.headers['x-sim-admin-key'] || req.headers['x-sim-admin-key'.toLowerCase()];
  if (String(key) !== process.env.NEXT_PUBLIC_SIM_ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });

  const { marketId, outcomeIndex } = req.body;
  const { data: market } = await serverClient.from('markets').select('*').eq('id', marketId).maybeSingle();
  if (!market) return res.status(404).json({ error: 'not found' });

  await serverClient.from('markets').update({ status: 'resolved' }).eq('id', marketId);
  await serverClient.from('resolutions').insert([{ market_id: marketId, outcome_index: outcomeIndex }]);

  const { data: positions } = await serverClient.from('positions').select('*').eq('market_id', marketId);
  for (const pos of positions || []) {
    const holdings = (pos.holdings || []).map(Number);
    const payoff = holdings[outcomeIndex] || 0;
    const u = await serverClient.from('users').select('*').eq('id', pos.user_id).maybeSingle();
    if (u.data) {
      const newBal = Number(u.data.virtual_balance || 0) + Number(payoff);
      await serverClient.from('users').update({ virtual_balance: newBal }).eq('id', u.data.id);
    }
  }

  const q = Array.isArray(market.q) ? market.q.map(Number) : [];
  const b = Number(market.b);
  const probs = (await import('../../lib/lmsr')).getPrices(q, b);

  for (const pos of positions || []) {
    const userId = pos.user_id;
    const brier = brierScore(probs, outcomeIndex);
    const delta = reputationDeltaFromBrier(brier, probs.length);
    await serverClient.from('reputation_records').insert([{ user_id: userId, market_id: marketId, brier_score: brier, delta }]);
    const u = await serverClient.from('users').select('*').eq('id', userId).maybeSingle();
    if (u.data) {
      const { newAvg, newCount } = updateAverageReputation(Number(u.data.reputation || 0), Number(u.data.reputation_count || 0), delta);
      await serverClient.from('users').update({ reputation: newAvg, reputation_count: newCount }).eq('id', userId);
    }
  }

  await serverClient.from('events').insert([{ kind: 'market_resolved', payload: { marketId, outcomeIndex } }]);

  return res.json({ ok: true });
}
