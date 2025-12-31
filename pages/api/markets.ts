import type { NextApiRequest, NextApiResponse } from 'next';
// Stubbed API for local demo. In production replace with DB-backed logic.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Return a few static demo markets
    return res.json({ markets: [
      { id: 't1', title: 'Local Renewable Energy Adoption', description: 'Will the local city reach 40% renewable energy in the next 3 years?', outcomes: ['Yes','No'], pool: [10,5], category: 'demo' },
      { id: 't2', title: 'Public Art Initiative', description: 'Will the new public art program complete 10 installations this year?', outcomes: ['Yes','No'], pool: [3,7], category: 'demo' }
    ]});
  }
  // POST / create is not implemented in offline prototype
  return res.status(501).json({ error: 'Not implemented in offline prototype. TODO: restore admin create using server DB.' });
}
