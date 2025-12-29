import { useState } from 'react';

export default function AdminResolve() {
  const [marketId, setMarketId] = useState('');
  const [outcomeIndex, setOutcomeIndex] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const key = process.env.NEXT_PUBLIC_SIM_ADMIN_KEY;
    const res = await fetch('/api/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sim-admin-key': key || '' },
      body: JSON.stringify({ marketId, outcomeIndex })
    });
    if (res.ok) alert('Resolved'); else alert('Failed');
  }

  return (
    <div>
      <h1 className='text-xl font-bold'>Admin: Resolve Market</h1>
      <form onSubmit={submit} className='mt-3 space-y-2'>
        <div>
          <label className='block'>Market ID</label>
          <input className='border p-1 w-full' value={marketId} onChange={(e) => setMarketId(e.target.value)} />
        </div>
        <div>
          <label className='block'>Outcome Index (0-based)</label>
          <input type='number' className='border p-1 w-full' value={outcomeIndex} onChange={(e) => setOutcomeIndex(Number(e.target.value))} />
        </div>
        <button type='submit' className='bg-red-600 text-white px-3 py-1 rounded'>Resolve</button>
      </form>
    </div>
  );
}
