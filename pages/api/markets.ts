import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../lib/supabaseClient';
import { isTopicAllowed } from '../../lib/compliance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    if (serverClient) {
      const select = 'id,title,description,outcomes,category,status,algorithm_type,yes_pool,no_pool,total_pool,deadline';
      const { data, error } = await serverClient.from('market').select(select).order('created_at', { ascending: false });
      if (!error) return res.json({ markets: data || [] });
    }

    // Return a few static demo markets
    return res.json({
      markets: [
        {
          id: 't1',
          title: 'Local Renewable Energy Adoption',
          description: 'Will the local city reach 40% renewable energy in the next 3 years?',
          outcomes: ['Yes', 'No'],
          pool: [10, 5],
          category: 'demo'
        },
        {
          id: 't2',
          title: 'Public Art Initiative',
          description: 'Will the new public art program complete 10 installations this year?',
          outcomes: ['Yes', 'No'],
          pool: [3, 7],
          category: 'demo'
        }
      ]
    });
  }

  if (req.method === 'POST') {
    const adminKey = req.headers['x-sim-admin-key'];
    if (adminKey !== process.env.SIMULATION_ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!serverClient) {
      return res.status(501).json({ error: 'Supabase not configured' });
    }

    const { title, description, outcomes, category, algorithm, initialLiquidity, deadline } = req.body;
    
    if (!title || !outcomes || !Array.isArray(outcomes)) {
      return res.status(400).json({ error: 'Invalid body' });
    }

    if (!isTopicAllowed(category)) {
      return res.status(400).json({ error: 'Topic not allowed by compliance policy' });
    }

    const algo = algorithm === 'amm' ? 'amm' : 'parimutuel';
    const initPool = Number(initialLiquidity) || 0;

    const row = {
      title,
      description,
      outcomes,
      category,
      status: 'open',
      algorithm_type: algo,
      deadline: deadline || null,
      total_pool: initPool,
      yes_pool: algo === 'amm' ? initPool / 2 : 0,
      no_pool: algo === 'amm' ? initPool / 2 : 0
    };

    const { data, error } = await serverClient.from('market').insert([row]).select();
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ market: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
