-- init_schema.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS "User" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  insight_points int DEFAULT 100,
  honor_level int DEFAULT 1,
  reputation numeric DEFAULT 1000.0
);

-- Markets
CREATE TABLE IF NOT EXISTS "Market" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  outcomes jsonb NOT NULL,
  pool jsonb NOT NULL DEFAULT '[]'::jsonb,
  category text,
  editorial_approved boolean DEFAULT false,
  start_at timestamptz,
  end_at timestamptz,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

-- Predictions
CREATE TABLE IF NOT EXISTS "Prediction" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES "User"(id) ON DELETE CASCADE,
  market_id uuid REFERENCES "Market"(id) ON DELETE CASCADE,
  outcome_idx int NOT NULL,
  points int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Positions
CREATE TABLE IF NOT EXISTS "Position" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES "User"(id) ON DELETE CASCADE,
  market_id uuid REFERENCES "Market"(id) ON DELETE CASCADE,
  holdings jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Settlements
CREATE TABLE IF NOT EXISTS "Settlement" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id uuid REFERENCES "Market"(id) ON DELETE CASCADE,
  outcome_idx int NOT NULL,
  settled_at timestamptz DEFAULT now()
);

-- ReputationRecord
CREATE TABLE IF NOT EXISTS "ReputationRecord" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES "User"(id) ON DELETE CASCADE,
  market_id uuid,
  change numeric,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- EventLog
CREATE TABLE IF NOT EXISTS "EventLog" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id uuid,
  action text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Sample market
INSERT INTO "Market" (title, description, outcomes, pool, category, editorial_approved)
VALUES (
  'Example: Which team will win the friendly match?',
  'Demo market (non-binding)',
  '["Team A", "Team B"]',
  '[10, 10]',
  'sports',
  true
);

-- RPC: execute_prediction: atomic update that deducts user points and updates market pools, positions, predictions.
CREATE OR REPLACE FUNCTION execute_prediction(market_uuid uuid, user_uuid uuid, outcome_idx int, points int)
RETURNS jsonb AS $$
DECLARE
  m_row RECORD;
  user_row RECORD;
  new_pool jsonb;
  holdings jsonb;
BEGIN
  -- Validate inputs and market state
  SELECT * INTO m_row FROM "Market" WHERE id = market_uuid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found';
  END IF;
  IF NOT m_row.editorial_approved THEN
    RAISE EXCEPTION 'Market not approved by editorial';
  END IF;
  IF m_row.status != 'open' THEN
    RAISE EXCEPTION 'Market not open';
  END IF;

  SELECT * INTO user_row FROM "User" WHERE id = user_uuid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF user_row.insight_points < points THEN
    RAISE EXCEPTION 'Insufficient insight points';
  END IF;

  -- Parse pool and increment outcome pool
  new_pool := m_row.pool;
  IF jsonb_typeof(new_pool) <> 'array' THEN
    new_pool := '[]'::jsonb;
  END IF;

  -- Ensure array length
  PERFORM 1;
  -- Convert to array of numeric
  -- Simple approach: expand array, add points to outcome_idx
  WITH p AS (
    SELECT jsonb_array_elements_text(new_pool) WITH ORDINALITY AS (val, idx)
  ) SELECT 1;

  -- For brevity: naive update (in practice expand and set element)
  UPDATE "Market" SET pool = (
    SELECT jsonb_agg(CASE WHEN i = outcome_idx THEN ( (coalesce((new_pool->>i)::int,0) + points)::text )::jsonb ELSE new_pool->>i END)
    FROM generate_series(0, jsonb_array_length(new_pool)-1) AS i
  ) WHERE id = market_uuid;

  -- Deduct user points
  UPDATE "User" SET insight_points = insight_points - points WHERE id = user_uuid;

  -- Insert prediction and upsert position holdings
  INSERT INTO "Prediction" (user_id, market_id, outcome_idx, points)
  VALUES (user_uuid, market_uuid, outcome_idx, points);

  -- Simplified holdings update: append to position or create
  INSERT INTO "Position" (user_id, market_id, holdings)
  VALUES (user_uuid, market_uuid, jsonb_build_array(points))
  ON CONFLICT (user_id, market_id) DO UPDATE SET holdings = jsonb_set(coalesce(Position.holdings,'[]'::jsonb), '{'||outcome_idx||'}', to_jsonb((coalesce((Position.holdings->>outcome_idx)::int,0)+points))) , updated_at = now();

  -- Log event
  INSERT INTO "EventLog" (actor_id, action, payload)
  VALUES (user_uuid, 'place_prediction', jsonb_build_object('market_id', market_uuid, 'outcome_idx', outcome_idx, 'points', points));

  -- Return simplified result
  RETURN jsonb_build_object('status','ok');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TODO: The above function is a starting point. Test thoroughly and adjust to expected pool JSON shapes.
