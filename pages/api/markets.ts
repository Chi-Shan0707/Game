import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await serverClient.from('markets').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const key = req.headers['x-sim-admin-key'] || req.headers['x-sim-admin-key'.toLowerCase()];
    if (String(key) !== process.env.NEXT_PUBLIC_SIM_ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });
    const { title, description, outcomes, b } = req.body;
    const q = outcomes.map(() => 0);
    const { data, error } = await serverClient.from('markets').insert([{ title, description, outcomes, q, b: b ?? 10 }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await serverClient.from('events').insert([{ kind: 'market_created', payload: data }]);
    return res.status(201).json(data);
  }

  return res.status(405).end();
}
