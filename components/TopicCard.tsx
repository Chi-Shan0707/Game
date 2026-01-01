import React, { useEffect, useState } from 'react';

type Topic = {
  id: string;
  title: string;
  description: string;
};

export default function TopicCard({ topic }: { topic: Topic }) {
  const key = `votes:${topic.id}`;
  const [yes, setYes] = useState<number>(0);
  const [no, setNo] = useState<number>(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        setYes(parsed.yes || 0);
        setNo(parsed.no || 0);
      }
    } catch (e) {
      // ignore
    }
  }, [key]);

  function save(newYes: number, newNo: number) {
    setYes(newYes);
    setNo(newNo);
    try {
      localStorage.setItem(key, JSON.stringify({ yes: newYes, no: newNo }));
    } catch (e) {
      // ignore storage errors
    }
  }

  return (
    <div className="p-4 border rounded shadow-sm">
      <h3 className="font-semibold">
        <a href={`/market/${topic.id}`} className="underline">
          {topic.title}
        </a>
      </h3>
      <p className="text-sm text-gray-600">{topic.description}</p>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="px-3 py-1 bg-green-500 text-white rounded"
          onClick={() => save(yes + 1, no)}
        >
          Vote Yes
        </button>
        <button
          className="px-3 py-1 bg-red-500 text-white rounded"
          onClick={() => save(yes, no + 1)}
        >
          Vote No
        </button>
        <div className="ml-auto text-sm">
          <span className="mr-2">Yes: {yes}</span>
          <span>No: {no}</span>
        </div>
      </div>
    </div>
  );
}
