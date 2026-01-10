import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function ProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const [userProfile, setUserProfile] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  async function fetchProfile() {
    try {
      // Fetch user stats
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('id', id)
        .single();

      if (userError) throw userError;
      setUserProfile(userData);

      // Fetch active positions
      const { data: posData, error: posError } = await supabase
        .from('position')
        .select(`
          *,
          market:market_id (title, status, outcome)
        `)
        .eq('user_id', id);

      if (posError) throw posError;
      setPositions(posData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-10 text-center font-bold">Loading Portfolio...</div>;
  if (!userProfile) return <div className="p-10 text-center font-bold text-red-500">User not found</div>;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {/* Header Bio */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-gradient-to-tr from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-4xl shadow-inner">
            👤
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{userProfile.id.slice(0, 8)}...</h1>
            <p className="text-gray-400 font-medium">Platform Participant</p>
          </div>
        </div>
        <div className="flex space-x-12">
          <div className="text-center">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Points</p>
            <p className="text-4xl font-black text-blue-600">{(userProfile.points || 0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Reputation</p>
            <p className="text-4xl font-black text-green-500">{userProfile.reputation || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Positions */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black uppercase text-gray-500 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm">✦</span>
            Active Market Positions
          </h2>
          
          {positions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed text-gray-400 font-medium">
              No active positions found. Explore the markets to start predicting!
            </div>
          ) : (
            positions.map((pos) => (
              <div key={pos.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center transition hover:border-blue-200">
                <div className="space-y-1">
                  <h3 className="font-black text-gray-800 line-clamp-1">{pos.market?.title || 'Unknown Market'}</h3>
                  <div className="flex items-center space-x-3 text-sm">
                    <span className={`px-2 py-0.5 rounded font-bold ${pos.outcome_index === 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {pos.outcome_index === 0 ? 'YES' : 'NO'}
                    </span>
                    <span className="text-gray-400">Shares: {pos.amount}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-black ${pos.market?.status === 'resolved' ? 'text-gray-400' : 'text-blue-500'}`}>
                    {pos.market?.status === 'open' ? 'Active' : 'Resolved'}
                  </div>
                  {pos.market?.status === 'resolved' && (
                    <div className={`text-xs font-bold ${pos.outcome_index === (pos.market.outcome === 'Yes' ? 0 : 1) ? 'text-green-500' : 'text-red-500'}`}>
                      {pos.outcome_index === (pos.market.outcome === 'Yes' ? 0 : 1) ? 'WON' : 'LOST'}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Mini-Stats */}
        <div className="space-y-6">
           <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl">
             <h3 className="text-xs font-black uppercase text-blue-400 tracking-tighter mb-4">Account Tier</h3>
             <div className="flex items-center space-x-4 mb-6">
               <div className="text-3xl">🚀</div>
               <div>
                 <p className="font-black">Level {Math.floor((userProfile.reputation || 0) / 10) + 1}</p>
                 <p className="text-xs text-gray-400">Insight Seeker</p>
               </div>
             </div>
             <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-2">
               <div 
                 className="h-full bg-blue-500" 
                 style={{ width: `${((userProfile.reputation || 0) % 10) * 10}%` }}
               ></div>
             </div>
             <p className="text-[10px] text-gray-500 font-bold uppercase">{10 - ((userProfile.reputation || 0) % 10)} pts to next level</p>
           </div>

           <div className="bg-white rounded-3xl p-8 border shadow-sm">
             <h3 className="font-black text-gray-900 mb-4">Badges</h3>
             <div className="flex flex-wrap gap-2">
               {(userProfile.reputation || 0) > 5 && <span title="Early Adopter" className="p-3 bg-yellow-50 rounded-xl">🥇</span>}
               {positions.length > 5 && <span title="Active Predictor" className="p-3 bg-purple-50 rounded-xl">⚡</span>}
               {(userProfile.points || 0) > 5000 && <span title="Whale" className="p-3 bg-blue-50 rounded-xl">🐋</span>}
               <span title="Verified Human" className="p-3 bg-green-50 rounded-xl">✅</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
