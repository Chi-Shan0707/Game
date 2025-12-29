import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getPrices, buyCostDelta } from '../../lib/lmsr';

type Market = {
  id: string;
  title: string;
  description?: string;
  outcomes: { name: string }[];
  q: number[];
  b: number;
  status: string;
};

export default function MarketPage() {
  const router = useRouter();
  const { id } = router.query;
  const [market, setMarket] = useState<Market | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [selected, setSelected] = useState<number>(0);
  const [costPreview, setCostPreview] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await fetch('/api/market/' + id);
      const data = await res.json();
      setMarket(data);
    }
    load();
  }, [id]);

  function preview() {
    if (!market) return;
    const { costDelta } = buyCostDelta(market.q, selected, qty, market.b);
    setCostPreview(costDelta);
  }

  async function submitTrade(e: React.FormEvent) {
    e.preventDefault();
    if (!market) return;
    const token = (window as any).__supabase_access_token || null;
    const res = await fetch('/api/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ marketId: market.id, outcomeIndex: selected, qty })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Trade executed');
      location.reload();
    } else {
      alert(data?.error || 'Trade failed');
    }
  }

  if (!market) return <div>Loading...</div>;

  const prices = getPrices(market.q, market.b);

  return (
    <div>
      <h1 className='text-xl font-bold'>{market.title}</h1>
      <p className='text-sm text-gray-600'>{market.description}</p>

      <div className='mt-4'>
        <h2 className='font-semibold'>Outcomes & Prices</h2>
        <ul className='mt-2'>
          {market.outcomes.map((o, i) => (
            <li key={i} className='flex items-center justify-between py-1'>
              <div>{o.name}</div>
              <div className='font-mono'>{(prices[i] * 100).toFixed(2)}%</div>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={submitTrade} className='mt-4 border rounded p-3'>
        <h3 className='font-semibold'>Buy (simulation)</h3>
        <div className='mt-2'>
          <label className='block text-sm'>Outcome</label>
          <select value={selected} onChange={(e) => setSelected(Number(e.target.value))} className='border p-1'>
            {market.outcomes.map((o, i) => (
              <option key={i} value={i}>{o.name}</option>
            ))}
          </select>
        </div>
        <div className='mt-2'>
          <label className='block text-sm'>Quantity</label>
          <input type='number' value={qty} min={0.1} step={0.1} onChange={(e) => setQty(Number(e.target.value))} className='border p-1' />
        </div>
        <div className='mt-2'>
          <button type='button' onClick={preview} className='mr-2 bg-blue-600 text-white px-3 py-1 rounded'>Preview Cost</button>
          <button type='submit' className='bg-green-600 text-white px-3 py-1 rounded'>Buy</button>
        </div>
        {costPreview !== null && <div className='mt-2'>Estimated cost: {costPreview.toFixed(4)}</div>}
      </form>
    </div>
  );
}
