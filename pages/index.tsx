import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { computeParimutuelOdds } from '../lib/parimutuel';

type Market = {
  id: string;
  title: string;
  description: string;
  pool: number[];
  outcomes: string[];
  category?: string;
  status: string;
  total_pool: number;
  yes_pool: number;
  no_pool: number;
};

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'politics', 'technology', 'sports', 'entertainment', 'science'];

  useEffect(() => {
    fetch('/api/markets')
      .then((res) => res.json())
      .then((data) => {
        if (data.markets) {
          setMarkets(data.markets);
        }
        setLoading(false);
      });
  }, []);

  const filteredMarkets = markets.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase()) || 
                          (m.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="bg-blue-600 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-4xl font-extrabold mb-2 text-white">Predict the Future</h1>
        <p className="text-blue-100 text-lg">Join the world's most accurate simulation market. Use Insight Points to back your knowledge.</p>
      </section>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex overflow-x-auto pb-2 gap-2 w-full md:w-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                selectedCategory === cat 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100 border'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Market Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-xl shadow-sm"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.length > 0 ? filteredMarkets.map((m) => {
            const tot = Number(m.total_pool) || 0;
            const yes = Number(m.yes_pool) || 0;
            const yesPrice = tot > 0 ? (yes / tot) : 0.5;
            const noPrice = 1 - yesPrice;

            return (
              <div key={m.id} className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition group shadow-sm">
                <Link href={`/market/${m.id}`}>
                  <div className="p-6 cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded tracking-wider">
                        {m.category || 'general'}
                      </span>
                      <span className={`text-[10px] font-bold uppercase rounded px-2 py-1 ${
                        m.status === 'open' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold mb-2 group-hover:text-blue-600 transition truncate h-14">
                      {m.title}
                    </h2>
                    
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-green-600 font-bold">Yes {(yesPrice * 100).toFixed(0)}¢</span>
                          <span className="text-red-600 font-bold">No {(noPrice * 100).toFixed(0)}¢</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                          <div className="h-full bg-green-500" style={{ width: `${yesPrice * 100}%` }}></div>
                          <div className="h-full bg-red-500" style={{ width: `${noPrice * 100}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500 pt-4 border-t mt-4">
                      <div className="flex items-center">
                        <span className="mr-1">💰</span>
                        <span>{tot.toLocaleString()} Pool</span>
                      </div>
                      <span className="font-semibold text-blue-600">Bet Now →</span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          }) : (
            <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed">
              <p className="text-gray-400">No markets found matching your criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
