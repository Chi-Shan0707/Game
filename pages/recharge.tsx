import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function RechargePage({ user }: any) {
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);

  const handleRecharge = async () => {
    if (!user) return alert('Please login first');
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('increment_user_points', {
        user_uuid: user.id,
        amount: amount
      });

      if (error) throw error;
      alert(`Successfully recharged ${amount} points!`);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const packs = [100, 500, 1000, 5000];

  return (
    <div className="max-w-md mx-auto py-20 px-4">
      <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">
            💎
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Refill Points</h1>
          <p className="text-gray-400">Select a pack to simulated recharge your account balance.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          {packs.map(p => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={`py-4 rounded-2xl font-black text-xl transition border-2 ${amount === p ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'}`}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          onClick={handleRecharge}
          disabled={loading}
          className="w-full py-5 bg-gray-900 hover:bg-black text-white font-black text-xl rounded-2xl shadow-xl transition-transform active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Confirm Recharge'}
        </button>

        <p className="mt-6 text-[10px] uppercase font-black tracking-widest text-gray-300">
          Simulated environment • No real money used
        </p>
      </div>
    </div>
  );
}
