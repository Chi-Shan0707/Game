import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import topics from '../../data/topics.json';

export default function MarketPage() {
  const router = useRouter();
  const { id } = router.query;
  const [topic, setTopic] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const found = topics.find(t => t.id === id);
    setTopic(found || null);
  }, [id]);

  if (!topic) return <div>Topic not found</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{topic.title}</h1>
      <p>{topic.description}</p>
      <p className="mt-4 text-sm text-gray-600">This is an offline demo. Voting is stored in your browser localStorage.</p>
    </div>
  );
}
