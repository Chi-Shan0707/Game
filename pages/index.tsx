import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { computeParimutuelOdds } from '../lib/parimutuel';

type Market = {
  id: string;
  title: string;
  description: string;
  pool: number[];
  outcomes: string[];
};

export default function IndexPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/markets')
      .then(res => res.json())
      .then(data => {
        if (data.markets) {
          setMarkets(data.markets);
        }
      })
      .catch(err => console.error('Failed to fetch markets', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4">Loading markets...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Market Discovery</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {markets.map(m => {
          const { probabilities } = computeParimutuelOdds(m.pool || []);
          const probYes = probabilities[0] || 0; // Assuming index 0 is Yes
          
          return (
            <div key={m.id} className="p-4 border rounded shadow-sm hover:shadow-md transition-shadow">
              <Link href={`/market/${m.id}`} className="block">
                <h3 className="font-semibold text-lg text-blue-600 hover:underline">{m.title}</h3>
              </Link>
              <p className="text-sm text-gray-600 mt-1">{m.description}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="bg-gray-100 px-2 py-1 rounded">
                  Implied Probability (Yes): {(probYes * 100).toFixed(1)}%
                </span>
                <Link href={`/market/${m.id}`} className="text-blue-500 hover:text-blue-700">
                  View Details &rarr;
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      {markets.length === 0 && (
        <div className="text-gray-500">No markets found.</div>
      )}
    </div>
  );
}
