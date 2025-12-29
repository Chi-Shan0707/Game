import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPrices } from '../lib/lmsr';

type Market = {
  id: string;
  title: string;
  description?: string;
  outcomes: { name: string }[];
  q: number[];
  b: number;
  status: string;
};

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    async function fetchMarkets() {
      const res = await fetch('/api/markets');
      const data = await res.json();
      setMarkets(data || []);
    }
    fetchMarkets();
  }, []);

  return (
    <div>
      <h1 className='text-2xl font-bold mb-4'>Open Markets</h1>
      <div className='space-y-3'>
        {markets.map((m) => {
          const prices = getPrices(m.q, m.b);
          return (
            <div key={m.id} className='p-3 border rounded'>
              <Link href={'/market/' + m.id}>
                <a className='text-lg font-semibold'>{m.title}</a>
              </Link>
              <div className='text-sm text-gray-600'>{m.description}</div>
              <div className='mt-2'>
                {m.outcomes.map((o, idx) => (
                  <span key={idx} className='mr-2 inline-block bg-gray-100 px-2 py-1 rounded'>
                    {o.name}: {(prices[idx] * 100).toFixed(1)}%
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
