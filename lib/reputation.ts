// Brier score and reputation delta utilities

export function brierScore(predictedProbs: number[], actualIndex: number): number {
  // Brier score: sum (p_i - o_i)^2 where o_i is 1 for actual, 0 otherwise
  return predictedProbs.reduce((acc, p, i) => {
    const o = i === actualIndex ? 1 : 0;
    return acc + Math.pow(p - o, 2);
  }, 0) / predictedProbs.length;
}

export function reputationDelta(oldReputation: number, brierBefore: number, brierAfter: number): number {
  // Positive delta when score improves (lower Brier)
  const delta = (brierBefore - brierAfter) * 100; // scale factor
  // Bayesian shrinkage stub: dampen delta based on current reputation
  const weight = 1 / (1 + Math.log1p(Math.max(0, oldReputation)));
  const adjusted = delta * weight;
  // TODO: replace with formal Bayesian model with priors and volatility
  return adjusted;
}
