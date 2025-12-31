import type { NextApiRequest, NextApiResponse } from 'next';
// Offline prototype: settling markets is not supported. Return 501.
// TODO: Restore settlement logic using server-side DB and reputation calculation.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(501).json({ error: 'Not implemented in offline prototype. Settlement requires server DB.' });
}
