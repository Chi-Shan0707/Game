/**
 * Reputation helpers: Brier score calculation for discrete outcomes.
 */

export function brierScore(probabilities: number[], outcomeIndex: number): number {
  const n = probabilities.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const o = i === outcomeIndex ? 1 : 0;
    const d = (probabilities[i] || 0) - o;
    sum += d * d;
  }
  return sum;
}

export function reputationDeltaFromBrier(brier: number, nOutcomes: number): number {
  const maxBrier = 2;
  const normalized = Math.max(0, Math.min(1, 1 - brier / maxBrier));
  return parseFloat((normalized * 10 - 5).toFixed(4));
}

export function updateAverageReputation(oldAvg: number, oldCount: number, delta: number): { newAvg: number; newCount: number } {
  const newCount = oldCount + 1;
  const newAvg = ((oldAvg * oldCount) + delta) / newCount;
  return { newAvg, newCount };
}
