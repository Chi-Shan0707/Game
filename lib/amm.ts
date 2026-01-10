// Constant Product AMM (x * y = k) for Yes/No Markets
// Reference: Polymarket uses a variant of this.

export interface AmmState {
  yesPool: number;
  noPool: number;
}

export interface BetResult {
  amountOut: number;
  price: number;
  priceImpact: number;
  newPools: AmmState;
}

/**
 * Calculates current prices for Yes and No outcomes.
 */
export function getAmmPrices(state: AmmState) {
  const { yesPool, noPool } = state;
  const total = yesPool + noPool;
  if (total === 0) return { yesPrice: 0.5, noPrice: 0.5 };
  
  // Price of Yes is the ratio of pools (simplified constant product)
  // In a Binary AMM, the price of Yes is often represented as x / (x + y)
  return {
    yesPrice: yesPool / total,
    noPrice: noPool / total
  };
}

/**
 * Calculates outcome of a bet using Constant Product Formula (x * y = k).
 * For a Yes bet:
 * (yesPool + points) * (noPool - outcomeShares) = k
 */
export function calculateAmmBet(
  state: AmmState,
  points: number,
  isYes: boolean,
  slippage: number = 0.005
): BetResult {
  const { yesPool, noPool } = state;
  const k = yesPool * noPool;
  
  let amountOut = 0;
  let newYesPool = yesPool;
  let newNoPool = noPool;

  if (isYes) {
    // Adding points to No pool, taking shares from Yes pool (CPMM variant for binary)
    // Actually, in a standard Yes/No AMM like Polymarket (based on CTF):
    // Price P = x / (x + y). 
    // Here we use a simpler model:
    newYesPool = yesPool + points;
    newNoPool = k / newYesPool;
    amountOut = noPool - newNoPool;
  } else {
    newNoPool = noPool + points;
    newYesPool = k / newNoPool;
    amountOut = yesPool - newYesPool;
  }

  const initialPrice = getAmmPrices(state)[isYes ? 'yesPrice' : 'noPrice'];
  const finalPrice = getAmmPrices({ yesPool: newYesPool, noPool: newNoPool })[isYes ? 'yesPrice' : 'noPrice'];
  const priceImpact = Math.abs(finalPrice - initialPrice) / initialPrice;

  return {
    amountOut,
    price: finalPrice,
    priceImpact,
    newPools: { yesPool: newYesPool, noPool: newNoPool }
  };
}
