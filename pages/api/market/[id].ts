import type { NextApiRequest, NextApiResponse } from 'next';
import { computeParimutuelOdds } from '../../../lib/parimutuel';
import { serverClient } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid id' });

  if (serverClient) {
    const select = 'id,title,description,outcomes,pool,category,editorial_approved,status,created_at';
    const primary = await serverClient.from('Market').select(select).eq('id', id).maybeSingle();
    if (!primary.error && primary.data) {
      const { probabilities, payoutPerPoint } = computeParimutuelOdds((primary.data as any).pool || []);
      return res.json({ market: primary.data, odds: { probabilities, payoutPerPoint } });
    }

    if (primary.error) {
      console.error('[market:id] select Market failed; retrying market', { error: primary.error, id });
    }
    const fallback = await serverClient.from('market').select(select).eq('id', id).maybeSingle();
    if (!fallback.error && fallback.data) {
      const { probabilities, payoutPerPoint } = computeParimutuelOdds((fallback.data as any).pool || []);
      return res.json({ market: fallback.data, odds: { probabilities, payoutPerPoint } });
    }
    if (fallback.error) {
      console.error('[market:id] select market failed; falling back to demo', { error: fallback.error, id });
    }
  }

  // Static demo mapping
  const demo: Record<string, any> = {
    't1': { id: 't1', title: 'Local Renewable Energy Adoption', description: 'Will the local city reach 40% renewable energy in the next 3 years?', outcomes: ['Yes','No'], pool: [10,5] },
    't2': { id: 't2', title: 'Public Art Initiative', description: 'Will the new public art program complete 10 installations this year?', outcomes: ['Yes','No'], pool: [3,7] }
  };
  const market = demo[id] || null;
  if (!market) return res.status(404).json({ error: 'Not found in offline demo' });
  const { probabilities, payoutPerPoint } = computeParimutuelOdds(market.pool || []);
  return res.json({ market, odds: { probabilities, payoutPerPoint } });
}
