import type { NextApiRequest, NextApiResponse } from 'next';
// Offline predict endpoint is not available in client-only prototype.
// Voting is handled in-browser via localStorage. This endpoint returns 501.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(501).json({ error: 'Not implemented in offline prototype. Voting is client-side only.' });
}
