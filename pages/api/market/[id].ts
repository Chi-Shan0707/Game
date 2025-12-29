import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../../lib/supabaseClient';
import { getPrices } from '../../../lib/lmsr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (req.method !== 'GET') return res.status(405).end();
  const { data, error } = await serverClient.from('markets').select('*').eq('id', id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'not found' });
  const q = Array.isArray(data.q) ? data.q.map(Number) : [];
  const prices = getPrices(q, Number(data.b));
  return res.json({ ...data, q, prices });
}
