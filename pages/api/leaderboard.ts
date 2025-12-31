import type { NextApiRequest, NextApiResponse } from 'next';
// Offline leaderboard stub
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.json({ leaderboard: [
    { id: 'u1', email: 'alice@example.com', reputation: 1200, honor_level: 3 },
    { id: 'u2', email: 'bob@example.com', reputation: 1100, honor_level: 2 }
  ]});
}
