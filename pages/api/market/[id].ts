import type { NextApiRequest, NextApiResponse } from 'next';
// Offline stub for market detail. Replace with DB-backed logic later.
import { computeParimutuelOdds } from '../../../lib/parimutuel';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid id' });
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
