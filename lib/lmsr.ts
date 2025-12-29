/**
 * LMSR implementation (Log Market Scoring Rule)
 * q: array of current outstanding shares per outcome
 * b: liquidity parameter (higher b => prices move slower)
 */

export function cost(q: number[], b: number): number {
  const sum = q.reduce((acc, qi) => acc + Math.exp(qi / b), 0);
  return b * Math.log(sum);
}

export function getPrices(q: number[], b: number): number[] {
  const exps = q.map((qi) => Math.exp(qi / b));
  const denom = exps.reduce((a, b2) => a + b2, 0);
  return exps.map((e) => e / denom);
}

export function buyCostDelta(q: number[], outcomeIndex: number, qty: number, b: number): { costDelta: number; newQ: number[] } {
  const before = cost(q, b);
  const newQ = q.slice();
  newQ[outcomeIndex] = (newQ[outcomeIndex] || 0) + qty;
  const after = cost(newQ, b);
  return { costDelta: after - before, newQ };
}

// Example helper: compute max affordable qty given a budget (simple linear search)
export function maxQtyForBudget(q: number[], outcomeIndex: number, budget: number, b: number, step = 0.1, maxIter = 10000): number {
  let qty = 0;
  let costUsed = 0;
  for (let i = 0; i < maxIter; i++) {
    const { costDelta } = buyCostDelta(q, outcomeIndex, step, b);
    if (costUsed + costDelta > budget + 1e-12) break;
    costUsed += costDelta;
    qty += step;
    q = q.slice();
    q[outcomeIndex] = (q[outcomeIndex] || 0) + step;
  }
  return qty;
}
