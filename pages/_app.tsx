import '../styles/globals.css';
import type { AppProps } from 'next/app';
import ComplianceBanner from '../components/ComplianceBanner';
import AuthModal from '../components/AuthModal';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function App({ Component, pageProps }: AppProps) {
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    // Check active session
    const session = supabase.auth.session();
    setUser(session?.user ?? null);
    if (session?.user) fetchPoints(session.user.id);

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) fetchPoints(currentUser.id);
        else setPoints(0);
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  const fetchPoints = async (userId: string) => {
    const { data, error } = await supabase
      .from('user')
      .select('insight_points')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setPoints(data.insight_points);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ComplianceBanner />
      
      {/* Navigation Bar */}
      <nav className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Link href="/">
              <span className="text-xl font-bold text-blue-600 cursor-pointer">SimMarket</span>
            </Link>
            <div className="hidden md:flex space-x-4 text-sm font-medium text-gray-600">
              <Link href="/"><span className="hover:text-blue-600 cursor-pointer">Markets</span></Link>
              <Link href="/leaderboard"><span className="hover:text-blue-600 cursor-pointer">Leaderboard</span></Link>
              {user && <Link href="/create-market"><span className="hover:text-blue-600 cursor-pointer">Create Market</span></Link>}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex flex-col items-end mr-2">
                  <span className="text-xs text-gray-500 uppercase font-semibold">Balance</span>
                  <span className="text-sm font-bold text-green-600">{points} pts</span>
                </div>
                <Link href={`/profile/${user.id}`}>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold cursor-pointer hover:bg-blue-200 transition">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-xs text-gray-500 hover:text-red-500 underline"
                >
                  Logout
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                Connect Wallet (Login)
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <Component {...pageProps} user={user} points={points} onAuthRequired={() => setIsAuthModalOpen(true)} />
      </main>

      <footer className="bg-white border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 mb-4">
            SimMarket is a simulation platform. All points are virtual and have no monetary value.
          </p>
          <div className="flex justify-center space-x-6 text-xs text-gray-400">
            <Link href="/compliance"><span>Compliance</span></Link>
            <Link href="/privacy"><span>Privacy</span></Link>
            <Link href="/algorithm"><span>Algorithm Explanation</span></Link>
          </div>
          <p className="text-[10px] text-gray-300 mt-6">Powered by Supabase & Next.js</p>
        </div>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
