-- init_schema.sql (Supabase/Postgres)
-- Creates tables + atomic RPC `execute_prediction` for simulated prediction market.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NOTE: This schema uses lowercase, unquoted table names (Supabase-friendly).

CREATE TABLE IF NOT EXISTS public."user" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  insight_points int DEFAULT 100,
  honor_level int DEFAULT 1,
  reputation numeric DEFAULT 1000.0
);

CREATE TABLE IF NOT EXISTS public.market (
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

CREATE TABLE IF NOT EXISTS public.prediction (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public."user"(id) ON DELETE CASCADE,
  market_id uuid REFERENCES public.market(id) ON DELETE CASCADE,
  outcome_idx int NOT NULL,
  points int NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.position (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public."user"(id) ON DELETE CASCADE,
  market_id uuid REFERENCES public.market(id) ON DELETE CASCADE,
  holdings jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT position_user_market_unique UNIQUE (user_id, market_id)
);

CREATE TABLE IF NOT EXISTS public.settlement (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id uuid REFERENCES public.market(id) ON DELETE CASCADE,
  outcome_idx int NOT NULL,
  settled_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reputation_record (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public."user"(id) ON DELETE CASCADE,
  market_id uuid,
  change numeric,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eventlog (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id uuid,
  action text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Sample market
INSERT INTO public.market (title, description, outcomes, pool, category, editorial_approved)
VALUES (
  'Example: Which team will win the friendly match?',
  'Demo market (non-binding)',
  '["Team A", "Team B"]',
  '[10, 10]',
  'sports',
  true
)
ON CONFLICT DO NOTHING;

-- RPC: execute_prediction: atomic update that deducts user points and updates market pools, positions, predictions.
CREATE OR REPLACE FUNCTION public.execute_prediction(market_uuid uuid, user_uuid uuid, outcome_idx int, points int)
RETURNS jsonb AS $$
DECLARE
  m_row RECORD;
  u_row RECORD;
  new_pool jsonb;
  pool_len int;
BEGIN
  -- Lock market row
  SELECT * INTO m_row FROM public.market WHERE id = market_uuid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found';
  END IF;
  IF NOT m_row.editorial_approved THEN
    RAISE EXCEPTION 'Market not approved';
  END IF;
  IF m_row.status <> 'open' THEN
    RAISE EXCEPTION 'Market not open';
  END IF;

  -- Lock user row
  SELECT * INTO u_row FROM public."user" WHERE id = user_uuid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF u_row.insight_points < points THEN
    RAISE EXCEPTION 'Insufficient insight points';
  END IF;

  new_pool := m_row.pool;
  IF jsonb_typeof(new_pool) <> 'array' THEN
    new_pool := '[]'::jsonb;
  END IF;
  pool_len := jsonb_array_length(new_pool);
  IF outcome_idx < 0 OR outcome_idx >= pool_len THEN
    RAISE EXCEPTION 'Invalid outcome index';
  END IF;

  -- Update pool element at outcome_idx
  UPDATE public.market
  SET pool = (
    SELECT jsonb_agg(
      CASE WHEN i = outcome_idx
        THEN to_jsonb((COALESCE((new_pool->>i)::int, 0) + points))
        ELSE to_jsonb(COALESCE((new_pool->>i)::int, 0))
      END
    )
    FROM generate_series(0, pool_len - 1) AS i
  )
  WHERE id = market_uuid;

  -- Deduct points
  UPDATE public."user" SET insight_points = insight_points - points WHERE id = user_uuid;

  -- Record prediction
  INSERT INTO public.prediction (user_id, market_id, outcome_idx, points)
  VALUES (user_uuid, market_uuid, outcome_idx, points);

  -- Upsert holdings
  INSERT INTO public.position (user_id, market_id, holdings)
  VALUES (user_uuid, market_uuid, '[]'::jsonb)
  ON CONFLICT (user_id, market_id) DO UPDATE
  SET holdings = jsonb_set(
    COALESCE(public.position.holdings, '[]'::jsonb),
    ARRAY[outcome_idx::text],
    to_jsonb((COALESCE((public.position.holdings->>(outcome_idx::text))::int, 0) + points)),
    true
  ),
  updated_at = now();

  -- Log event
  INSERT INTO public.eventlog (actor_id, action, payload)
  VALUES (user_uuid, 'place_prediction', jsonb_build_object('market_id', market_uuid, 'outcome_idx', outcome_idx, 'points', points));

  RETURN jsonb_build_object('status', 'ok');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;