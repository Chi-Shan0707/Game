import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { computeParimutuelOdds } from '../../lib/parimutuel';
import { getAmmPrices, calculateAmmBet } from '../../lib/amm';
import BetButton from '../../components/BetButton';
import MarketStatusBadge from '../../components/MarketStatusBadge';
import ProfitCalculator from '../../components/ProfitCalculator';
import PredictionSlider from '../../components/PredictionSlider';

type Market = {
  id: string;
  title: string;
  description?: string;
  outcomes: string[];
  pool: number[];
  yes_pool: number;
  no_pool: number;
  total_pool: number;
  status: string;
  category: string;
  algorithm_type: string;
  fee_rate: number;
  created_at: string;
  end_at: string;
  creator_id?: string;
};

export default function MarketPage({ user, onAuthRequired }: any) {
  const router = useRouter();
  const { id } = router.query;
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'yes' | 'no'>('yes');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('market')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) setMarket(data);
      setLoading(false);

      // Fetch history
      const { data: hist } = await supabase
        .from('prediction')
        .select('*, user(email)')
        .eq('market_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (hist) setHistory(hist);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <div className="flex justify-center items-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!market) return <div className="text-center py-20">Market not found</div>;

  const handleBet = async () => {
    if (!user) {
      onAuthRequired();
      return;
    }

    setSubmitting(true);
    const session = supabase.auth.session();
    
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          marketId: market.id,
          outcomeIdx: activeTab === 'yes' ? 0 : 1,
          points: amount
        })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to place bet');
      
      alert('Bet placed successfully!');
      setAmount(10);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isParimutuel = market.algorithm_type === 'parimutuel';
  const { probabilities, payoutPerPoint } = computeParimutuelOdds(market.pool || [0, 0]);
  const ammPrices = getAmmPrices({ yesPool: market.yes_pool, noPool: market.no_pool });
  
  const currentOdds = activeTab === 'yes' 
    ? (isParimutuel ? payoutPerPoint[0] : 1 / ammPrices.yesPrice)
    : (isParimutuel ? payoutPerPoint[1] : 1 / ammPrices.noPrice);

  const currentPrice = activeTab === 'yes' ? ammPrices.yesPrice : ammPrices.noPrice;

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Market Info */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl border p-8 shadow-sm">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">
              {market.category}
            </span>
            <MarketStatusBadge status={market.status} />
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wide">
              {market.algorithm_type}
            </span>
          </div>
          
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{market.title}</h1>
          <p className="text-gray-600 leading-relaxed mb-8">{market.description}</p>
          
          {/* Visual Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
              <div>
                <span className="text-3xl font-black text-green-600">{(ammPrices.yesPrice * 100).toFixed(0)}¢</span>
                <span className="text-sm text-gray-500 ml-2 font-medium">Yes</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500 mr-2 font-medium">No</span>
                <span className="text-3xl font-black text-red-600">{(ammPrices.noPrice * 100).toFixed(0)}¢</span>
              </div>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
              <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${ammPrices.yesPrice * 100}%` }}></div>
              <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${ammPrices.noPrice * 100}%` }}></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 py-4 border-t">
            <div className="text-center">
              <div className="text-xs text-gray-400 font-bold uppercase">Total Pool</div>
              <div className="text-lg font-bold">{(market.total_pool || 0).toLocaleString()}</div>
            </div>
            <div className="text-center border-x">
              <div className="text-xs text-gray-400 font-bold uppercase">End Date</div>
              <div className="text-lg font-bold">{new Date(market.end_at).toLocaleDateString()}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 font-bold uppercase">Winning Outcome</div>
              <div className="text-lg font-bold">{market.status === 'settled' ? market.outcomes[market.resolved_outcome_idx || 0] : '--'}</div>
            </div>
          </div>
        </div>

        {/* Bet History */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-gray-50">
            <h3 className="font-bold text-gray-700">Bet History</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white border-b text-gray-400 uppercase text-[10px] font-bold">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Direction</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{h.user?.email || 'Anonymous'}</td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${h.outcome_idx === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {market.outcomes[h.outcome_idx]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">{h.points} pts</td>
                  <td className="px-6 py-4 text-right text-gray-400 text-xs">
                    {new Date(h.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {history.length === 0 && <tr className="text-center p-8 text-gray-400"><td colSpan={4} className="py-8">No bets yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Betting Panel */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border p-6 shadow-md sticky top-24">
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('yes')}
              className={`flex-1 py-2 rounded-lg font-bold transition ${activeTab === 'yes' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
            >
              Yes
            </button>
            <button
              onClick={() => setActiveTab('no')}
              className={`flex-1 py-2 rounded-lg font-bold transition ${activeTab === 'no' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
            >
              No
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Bet Amount</span>
              <span className="text-blue-600 font-bold">Balance: {user?._points || 0} pts</span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-2xl font-black p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition"
              />
              <span className="absolute right-4 top-5 font-bold text-gray-400">PTS</span>
            </div>

            <PredictionSlider 
              outcomes={['No', 'Yes']} // Dummy for slider, amount is numeric
              pool={[market.no_pool, market.yes_pool]}
              onPredict={(p) => setAmount(p)}
            />

            <ProfitCalculator 
              amount={amount} 
              odds={currentOdds} 
              feeRate={market.fee_rate || 0.02} 
            />

            <BetButton 
              variant={activeTab} 
              onClick={handleBet} 
              loading={submitting}
              disabled={amount <= 0 || market.status !== 'open'}
              label={market.status !== 'open' ? 'Market Closed' : undefined}
            />
            
            <p className="text-[10px] text-gray-400 text-center">
              By betting, you agree to our Terms of Service and recognize this is a simulation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
