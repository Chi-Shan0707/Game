import { useEffect, useState } from 'react';

type Leader = {
  id: string;
  email: string;
  displayName: string;
  insight_points: number;
  reputation: number;
  honor_level: number;
};

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('insight_points');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?sort=${sort}`)
      .then(res => res.json())
      .then(data => {
        if (data.leaderboard) setLeaders(data.leaderboard);
        setLoading(false);
      });
  }, [sort]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Leaderboard</h1>
        <p className="text-gray-500">The most accurate predictors in the ecosystem.</p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <div className="flex bg-white rounded-lg border p-1">
            <button
              onClick={() => setSort('insight_points')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${sort === 'insight_points' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Top Points
            </button>
            <button
              onClick={() => setSort('reputation')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${sort === 'reputation' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Top Reputation
            </button>
          </div>
          <span className="text-xs text-gray-400 font-medium">Updated every 5 minutes</span>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white">
              <th className="px-8 py-5">Rank</th>
              <th className="px-8 py-5">User</th>
              <th className="px-8 py-5 text-right">Reputation</th>
              <th className="px-8 py-5 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="animate-pulse border-b">
                  <td colSpan={4} className="px-8 py-6 h-12 bg-gray-50/50"></td>
                </tr>
              ))
            ) : (
              leaders.map((leader, index) => (
                <tr key={leader.id} className="border-b last:border-0 hover:bg-blue-50/30 transition group">
                  <td className="px-8 py-5 font-black text-gray-300 group-hover:text-blue-200">
                    {index + 1}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                        {leader.displayName[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{leader.displayName}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Level {leader.honor_level}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right font-mono font-bold text-indigo-600">
                    {leader.reputation}
                  </td>
                  <td className="px-8 py-5 text-right font-mono font-bold text-gray-900">
                    {leader.insight_points.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
