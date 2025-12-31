import React from 'react';
import topics from '../data/topics.json';
import TopicCard from '../components/TopicCard';

export default function IndexPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Market Discovery</h1>
      <div className="grid grid-cols-1 gap-4 mt-4">
        {topics.map(t => (
          <TopicCard key={t.id} topic={t} />
        ))}
      </div>
    </div>
  );
}
