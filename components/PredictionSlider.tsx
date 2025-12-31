import React, { useState } from 'react';
import { computeParimutuelOdds } from '../lib/parimutuel';

type Props = {
  outcomes: string[];
  pool: number[];
  onPredict: (points: number) => Promise<any>;
  maxPoints?: number;
};

export default function PredictionSlider({ outcomes, pool, onPredict, maxPoints = 100 }: Props) {
  const [points, setPoints] = useState<number>(10);
  const projectedPool = [...pool];
  projectedPool[0] = (projectedPool[0] || 0) + points; // preview adding to outcome 0 for demo
  const { probabilities, payoutPerPoint } = computeParimutuelOdds(projectedPool);

  return (
    <div>
      <label>Commit Insight Points: {points}</label>
      <input type="range" min={1} max={maxPoints} value={points} onChange={e => setPoints(Number(e.target.value))} />
      <div>
        <button onClick={() => onPredict(points)}>Place Prediction</button>
      </div>
      <div style={{ marginTop: 8 }}>
        <strong>Preview (virtual):</strong>
        <div>Probabilities: {probabilities.map(p => p.toFixed(3)).join(', ')}</div>
        <div>Payout per point: {payoutPerPoint.map(p => p.toFixed(2)).join(', ')}</div>
      </div>
    </div>
  );
}
