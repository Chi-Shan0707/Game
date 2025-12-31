# Transaction & RPC Notes

RPC: `execute_prediction(market_id, user_id, outcome_idx, points)`
- Implemented as a PL/pgSQL function that runs in a transaction:
  - Verify market is open and editorially approved.
  - Verify user has sufficient `insight_points`.
  - Deduct points from user and add to market pool for chosen outcome.
  - Upsert or insert `Position` / `Prediction` record for that user and market.
  - Insert `EventLog` entry.
  - Return updated pool and user position summary.

Server usage:
- The server should call `serverClient.rpc('execute_prediction', {...})` using `SUPABASE_SERVICE_ROLE_KEY`.
- Do not call this RPC from client-side code.

TODO: Expand with concrete PL/pgSQL implementation and test harness.
