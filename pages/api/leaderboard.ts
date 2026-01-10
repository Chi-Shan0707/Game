import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!serverClient) return res.status(501).json({ error: 'Supabase missing' });

  const { sort = 'insight_points' } = req.query;
  const sortBy = ['insight_points', 'reputation'].includes(sort as string) ? sort : 'insight_points';

  const { data, error } = await serverClient
    .from('user')
    .select('id, email, insight_points, reputation, honor_level')
    .order(sortBy as string, { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });

  const leaderboard = (data || []).map(u => ({
    ...u,
    displayName: u.email?.split('@')[0] || 'Anonymous'
  }));

  return res.json({ leaderboard });
}
