// Parimutuel calculator for client & server (pure TS)

export function computeParimutuelOdds(pool: number[]): { probabilities: number[]; payoutPerPoint: number[] } {
  const eps = 1e-6;
  const sanitized = pool.map(p => (isFinite(p) && p >= 0 ? p : 0));
  const sum = sanitized.reduce((s, v) => s + v, 0);
  if (sum <= 0) {
    // evenly distribute probabilities when no liquidity
    const n = Math.max(1, sanitized.length);
    const probs = Array(n).fill(1 / n);
    const payouts = probs.map(p => 1 / (p + eps));
    return { probabilities: probs, payoutPerPoint: payouts };
  }
  const probabilities = sanitized.map(p => (p + eps) / (sum + eps * sanitized.length));
  // Virtual payout per point if outcome wins: totalPool / pool_i (common parimutuel)
  const payouts = sanitized.map(p => {
    if (p <= 0) return sum / (eps);
    return sum / p;
  });
  return { probabilities, payoutPerPoint: payouts };
}

// Example usage:
// const { probabilities, payoutPerPoint } = computeParimutuelOdds([10, 20, 5]);
// probabilities: [0.25,0.5,0.125] (approx)
// payoutPerPoint: [3.5,1.75,7]

// Note: payouts are virtual and denominated in Insight Points; platform uses these for reputation and simulated payouts only.
