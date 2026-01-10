import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function CreateMarketPage({ user }: any) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    deadline: '',
    algorithm: 'parimutuel',
    outcomes: 'Yes, No',
    initialLiquidity: 100
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Please login first');

    setLoading(true);
    const session = supabase.auth.session();

    try {
      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-sim-admin-key': process.env.NEXT_PUBLIC_SIMULATION_ADMIN_KEY || '' // if admin required
        },
        body: JSON.stringify({
          ...formData,
          outcomes: formData.outcomes.split(',').map(s => s.trim()),
          deadline: new Date(formData.deadline).toISOString()
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create market');

      alert('Market created successfully!');
      router.push('/');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="bg-white rounded-3xl border shadow-xl overflow-hidden">
        <div className="bg-blue-600 px-8 py-10 text-white">
          <h1 className="text-3xl font-black mb-2">Create New Market</h1>
          <p className="text-blue-100 opacity-80">Launch a prediction market themed around your favorite topics.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Market Title</label>
            <input
              required
              className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition"
              placeholder="e.g. Will Bitcoin reach $100k by end of 2026?"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Description</label>
            <textarea
              className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition h-32"
              placeholder="Provide details about the resolution criteria..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Category</label>
              <select
                className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="politics">Politics</option>
                <option value="technology">Technology</option>
                <option value="sports">Sports</option>
                <option value="science">Science</option>
                <option value="entertainment">Entertainment</option>
                <option value="general">General</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Deadline</label>
              <input
                required
                type="datetime-local"
                className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition"
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Algorithm</label>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, algorithm: 'parimutuel' })}
                  className={`flex-1 py-3 rounded-lg text-xs font-bold transition ${formData.algorithm === 'parimutuel' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                >
                  Parimutuel
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, algorithm: 'amm' })}
                  className={`flex-1 py-3 rounded-lg text-xs font-bold transition ${formData.algorithm === 'amm' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                >
                  AMM (x*y=k)
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Fee Rate (%)</label>
              <input
                type="number"
                disabled
                className="w-full p-4 bg-gray-100 rounded-xl border-2 border-transparent text-gray-400 cursor-not-allowed"
                value={2}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xl rounded-2xl shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:bg-blue-300"
          >
            {loading ? 'Creating...' : 'Launch Market'}
          </button>
        </form>
      </div>
    </div>
  );
}
