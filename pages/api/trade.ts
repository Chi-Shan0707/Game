import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../lib/supabaseClient';
import { buyCostDelta } from '../../lib/lmsr';

// Simple per-user daily limit (example)
const DAILY_LIMIT = 500;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const auth = req.headers.authorization?.split(' ')[1] ?? null;
  const { marketId, outcomeIndex, qty } = req.body;
  if (!auth) return res.status(401).json({ error: 'missing auth token' });

  const { data: userRes, error: userErr } = await serverClient.auth.getUser(auth);
  if (userErr) return res.status(401).json({ error: userErr.message });
  const supaUserId = userRes?.data?.user?.id;
  if (!supaUserId) return res.status(401).json({ error: 'invalid user' });

  let { data: users } = await serverClient.from('users').select('*').eq('supabase_user_id', supaUserId).limit(1).maybeSingle();
  let user = users as any;
  if (!user) {
    const inserted = await serverClient.from('users').insert([{ supabase_user_id: supaUserId, username: 'user_' + String(supaUserId).slice(0, 6) }]).select().maybeSingle();
    user = inserted.data;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentTrades } = await serverClient.from('trades').select('cost').eq('user_id', user.id).gte('created_at', since);
  const spent = (recentTrades || []).reduce((s: number, t: any) => s + Number(t.cost || 0), 0);
  if (spent + costDelta > DAILY_LIMIT) return res.status(429).json({ error: 'daily limit exceeded' });

  const { data: market } = await serverClient.from('markets').select('*').eq('id', marketId).maybeSingle();
  if (!market) return res.status(404).json({ error: 'market not found' });
  const q = Array.isArray(market.q) ? market.q.map(Number) : [];
  const b = Number(market.b);

  const { costDelta, newQ } = buyCostDelta(q, outcomeIndex, Number(qty), b);

  if (Number(user.virtual_balance) < costDelta) return res.status(400).json({ error: 'insufficient virtual balance' });

  const tradeInsert = await serverClient.from('trades').insert([{
    user_id: user.id,
    market_id: marketId,
    outcome_index: outcomeIndex,
    qty,
    cost: costDelta
  }]).select().maybeSingle();

  const { data: pos } = await serverClient.from('positions').select('*').eq('user_id', user.id).eq('market_id', marketId).maybeSingle();
  let holdings = [] as number[];
  if (pos && pos.holdings) holdings = pos.holdings.map(Number);
  while (holdings.length < newQ.length) holdings.push(0);
  holdings[outcomeIndex] = holdings[outcomeIndex] + Number(qty);
  if (pos) {
    await serverClient.from('positions').update({ holdings, updated_at: new Date().toISOString() }).eq('id', pos.id);
  } else {
    await serverClient.from('positions').insert([{ user_id: user.id, market_id: marketId, holdings }]);
  }

  await serverClient.from('markets').update({ q: newQ }).eq('id', marketId);

  const newBalance = Number(user.virtual_balance) - Number(costDelta);
  await serverClient.from('users').update({ virtual_balance: newBalance }).eq('id', user.id);

  await serverClient.from('events').insert([{ kind: 'trade', payload: { user: user.id, market: marketId, outcomeIndex, qty, cost: costDelta } }]);

  return res.json({ ok: true, trade: tradeInsert.data, newBalance, holdings });
}
