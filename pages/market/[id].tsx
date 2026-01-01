import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PredictionSlider from '../../components/PredictionSlider';
import { computeParimutuelOdds } from '../../lib/parimutuel';

type Market = {
  id: string;
  title: string;
  description?: string;
  outcomes?: string[];
  pool?: number[];
};

export default function MarketPage() {
  const router = useRouter();
  const { id } = router.query;
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  // Polling for updates
  useEffect(() => {
    if (!id) return;
    
    const fetchMarket = async () => {
      try {
        const res = await fetch(`/api/market/${id}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.market) {
            setMarket(json.market);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchMarket();
    const interval = setInterval(fetchMarket, 5000); // Short polling fallback
    return () => clearInterval(interval);
  }, [id]);

  async function handlePredict(outcomeIdx: number, points: number) {
    if (!market) return;
    setStatus('Submitting...');

    // For demo purposes, we try to get a user ID from localStorage or prompt
    // In a real app, this would come from the auth context
    let userId = localStorage.getItem('SIM_USER_ID');
    if (!userId) {
      userId = prompt('Enter a User UUID for simulation (check Supabase "user" table):');
      if (userId) localStorage.setItem('SIM_USER_ID', userId);
    }

    // If still no user ID, we can't submit to API properly unless it's dev mode fallback
    // But let's try anyway, the API might handle it or return 401
    
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}` // TODO: Add auth token
        },
        body: JSON.stringify({
          marketId: market.id,
          outcomeIdx,
          points,
          userId // Dev fallback
        })
      });
      
      const json = await res.json();
      if (res.ok) {
        setStatus('Prediction placed! Refreshing...');
        // Optimistic update or wait for poll
        setTimeout(() => setStatus(null), 2000);
      } else {
        setStatus(`Error: ${json.error || 'Unknown error'}`);
      }
    } catch (e) {
      setStatus('Network error');
    }
  }

  if (loading) return <div className="p-4">Loading market...</div>;
  if (!market) return <div className="p-4">Market not found</div>;

  const { probabilities, payoutPerPoint } = computeParimutuelOdds(market.pool || []);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <button onClick={() => router.back()} className="text-blue-500 mb-4">&larr; Back</button>
      <h1 className="text-3xl font-bold mb-2">{market.title}</h1>
      <p className="text-gray-700 mb-6">{market.description}</p>

      <div className="grid grid-cols-1 gap-6">
        {market.outcomes?.map((outcome, idx) => (
          <div key={idx} className="border p-4 rounded bg-white shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-xl">{outcome}</h3>
              <div className="text-right">
                <div className="text-2xl font-mono">{(probabilities[idx] * 100).toFixed(1)}%</div>
                <div className="text-xs text-gray-500">Payout: {payoutPerPoint[idx].toFixed(2)}x</div>
              </div>
            </div>
            
            <PredictionSlider 
              outcomes={market.outcomes || []}
              pool={market.pool || []}
              onPredict={(points) => handlePredict(idx, points)}
            />
          </div>
        ))}
      </div>

      {status && (
        <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded shadow-lg">
          {status}
        </div>
      )}
    </div>
  );
}
