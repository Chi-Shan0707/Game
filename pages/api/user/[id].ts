import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (req.method !== 'GET') return res.status(405).end();
  const { data } = await serverClient.from('users').select('id,username,display_name,virtual_balance,reputation,reputation_count').eq('id', id).maybeSingle();
  if (!data) return res.status(404).json({ error: 'not found' });
  return res.json(data);
}
