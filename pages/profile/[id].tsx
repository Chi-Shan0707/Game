import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type Profile = {
  id: string;
  username?: string;
  display_name?: string;
  reputation?: number;
  reputation_count?: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await fetch('/api/user/' + id);
      const data = await res.json();
      setProfile(data);
    }
    load();
  }, [id]);

  if (!profile) return <div>Loading...</div>;

  return (
    <div>
      <h1 className='text-xl font-bold'>{profile.display_name || profile.username}</h1>
      <div className='mt-2'>Reputation: {profile.reputation?.toFixed(4) ?? '0'}</div>
      <div>Predictions: {profile.reputation_count ?? 0}</div>
      <div className='mt-4'>
        <h2 className='font-semibold'>Recent performance</h2>
        <div className='text-sm text-gray-600'>(See reputation_records table for details)</div>
      </div>
    </div>
  );
}
