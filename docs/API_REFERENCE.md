# API Reference

All API routes are protected by Supabase Auth unless otherwise specified.

## Markets

### `GET /api/markets`
Fetch all active/settled markets.
- Query: `category`, `status`
- Response: `Market[]`

### `POST /api/markets` (Admin only)
Create a new market.
- Body: `{ title, description, category, deadline, algorithm, outcomes }`

## Predictions

### `POST /api/predict`
Execute a prediction.
- Body: `{ marketId, outcomeIndex, amount, algorithm }`
- Logic: Atomic transaction calls `execute_prediction` RPC.

## Settlement

### `POST /api/settle` (Admin only)
Resolves a market and distributes points.
- Body: `{ marketId, winningOutcome }`
- Logic: Updates `market` status, calculates ROI for all `position` holders, increments `user.points` and `user.reputation`.

## Leaderboard

### `GET /api/leaderboard`
Public ranking.
- Query: `sortBy` (points | reputation)
- Response: `UserStats[]`
