# Prediction Algorithms

This platform supports two core market resolution and price discovery algorithms.

## 1. Parimutuel (Pool-based)
Used for simple proportional payout markets. 

- **Price Discovery**: Based on the ratio of pool sizes.
- **Odds Calculation**: `Potential Payout = Total Pool / Outcome Pool * Your Bet`.
- **Slippage**: None (calculated at resolution).
- **Use Case**: Event-based markets where final outcome determines the entire share of the pot.

## 2. CPMM (Constant Product Market Maker)
Replicates the automated market maker model used by Polymarket/Uniswap.

- **Formula**: $x * y = k$
  - where $x$ = "Yes" liquidity, $y$ = "No" liquidity.
- **Price Calculation**: 
  - $Price_{Yes} = y / (x + y)$
  - $Price_{No} = x / (x + y)$
- **Slippage**: Dynamic based on trade size relative to pool depth.
- **Transaction Flow**:
  1. User specifies point amount.
  2. System calculates `Shares = dy`.
  3. $k$ is preserved while $x$ and $y$ are updated.
- **Use Case**: Continuous trading markets with immediate liquidity and price sensitivity.

---

## Fee Structure
- **Global Platform Fee**: 2%
- **Recipient**: Platform Treasury (Service Role controlled).
- **Timing**: Deducted at the moment of prediction.
