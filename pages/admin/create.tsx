import { useState } from 'react';

export default function AdminCreate() {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [outcomes, setOutcomes] = useState('Yes,No');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const key = process.env.NEXT_PUBLIC_SIM_ADMIN_KEY;
    const res = await fetch('/api/markets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sim-admin-key': key || '' },
      body: JSON.stringify({ title, description: desc, outcomes: outcomes.split(',').map((s) => ({ name: s.trim() })) })
    });
    if (res.ok) {
      alert('Market created');
    } else {
      alert('Failed to create');
    }
  }

  return (
    <div>
      <h1 className='text-xl font-bold'>Admin: Create Market</h1>
      <form onSubmit={submit} className='mt-3 space-y-2'>
        <div>
          <label className='block'>Title</label>
          <input className='border p-1 w-full' value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className='block'>Description</label>
          <input className='border p-1 w-full' value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div>
          <label className='block'>Outcomes (comma-separated)</label>
          <input className='border p-1 w-full' value={outcomes} onChange={(e) => setOutcomes(e.target.value)} />
        </div>
        <button type='submit' className='bg-blue-600 text-white px-3 py-1 rounded'>Create</button>
      </form>
    </div>
  );
}
