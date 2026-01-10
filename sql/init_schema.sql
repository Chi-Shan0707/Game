-- init_schema.sql (Supabase/Postgres)
-- Creates tables + atomic RPC `execute_prediction` for simulated prediction market.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NOTE: This schema uses lowercase, unquoted table names (Supabase-friendly).

CREATE TABLE IF NOT EXISTS public."user" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  points bigint DEFAULT 1000,
  reputation int DEFAULT 0
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
  status text DEFAULT 'open', -- 'open', 'closed', 'settled'
  created_at timestamptz DEFAULT now(),
  algorithm_type text DEFAULT 'parimutuel', -- 'parimutuel', 'amm'
  fee_rate numeric DEFAULT 0.02,
  yes_pool bigint DEFAULT 0,
  no_pool bigint DEFAULT 0,
  total_pool bigint DEFAULT 0,
  resolved_outcome_idx int
);

CREATE TABLE IF NOT EXISTS public.prediction (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public."user"(id) ON DELETE CASCADE,
  market_id uuid REFERENCES public.market(id) ON DELETE CASCADE,
  outcome_idx int NOT NULL,
  points int NOT NULL,
  price_at_bet numeric, -- for AMM
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.position (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public."user"(id) ON DELETE CASCADE,
  market_id uuid REFERENCES public.market(id) ON DELETE CASCADE,
  holdings jsonb DEFAULT '[]'::jsonb, -- e.g. {"0": 100, "1": 50}
  updated_at timestamptz DEFAULT now(),
  unrealized_profit numeric DEFAULT 0,
  realized_profit numeric DEFAULT 0,
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

CREATE INDEX IF NOT EXISTS idx_market_status ON public.market(status);
CREATE INDEX IF NOT EXISTS idx_market_category ON public.market(category);
CREATE INDEX IF NOT EXISTS idx_position_user_id ON public.position(user_id);
CREATE INDEX IF NOT EXISTS idx_position_market_id ON public.position(market_id);
CREATE INDEX IF NOT EXISTS idx_prediction_market_id ON public.prediction(market_id);

-- RPC: execute_prediction: atomic update that deducts user points and updates market pools, positions, predictions.
CREATE OR REPLACE FUNCTION public.execute_prediction(market_uuid uuid, user_uuid uuid, outcome_idx int, amount_to_bet int)
RETURNS jsonb AS $$
DECLARE
  m_row RECORD;
  u_row RECORD;
  fee_amount int;
  net_points int;
BEGIN
  -- Lock market row
  SELECT * INTO m_row FROM public.market WHERE id = market_uuid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found';
  END IF;
  IF m_row.status <> 'open' THEN
    RAISE EXCEPTION 'Market not open';
  END IF;

  -- Lock user row
  SELECT * INTO u_row FROM public."user" WHERE id = user_uuid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF u_row.points < amount_to_bet THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- Calculate fees
  fee_amount := floor(amount_to_bet * m_row.fee_rate);
  net_points := amount_to_bet - fee_amount;

  -- Update pools
  UPDATE public.market
  SET 
    yes_pool = CASE WHEN outcome_idx = 0 THEN yes_pool + net_points ELSE yes_pool END,
    no_pool = CASE WHEN outcome_idx = 1 THEN no_pool + net_points ELSE no_pool END,
    total_pool = total_pool + net_points
  WHERE id = market_uuid;

  -- Deduct points
  UPDATE public."user" SET points = points - amount_to_bet WHERE id = user_uuid;

  -- Record prediction
  INSERT INTO public.prediction (user_id, market_id, outcome_idx, points, price_at_bet)
  VALUES (user_uuid, market_uuid, outcome_idx, amount_to_bet, NULL);

  -- Upsert holdings
  INSERT INTO public.position (user_id, market_id, holdings, updated_at)
  VALUES (user_uuid, market_uuid, jsonb_build_object(outcome_idx::text, net_points), now())
  ON CONFLICT (user_id, market_id) DO UPDATE
  SET holdings = jsonb_set(
    COALESCE(public.position.holdings, '{}'::jsonb),
    ARRAY[outcome_idx::text],
    to_jsonb((COALESCE((public.position.holdings->>(outcome_idx::text))::int, 0) + net_points)),
    true
  ),
  updated_at = now();

  -- Log event
  INSERT INTO public.eventlog (actor_id, action, payload)
  VALUES (user_uuid, 'place_prediction', jsonb_build_object(
    'market_id', market_uuid, 
    'outcome_idx', outcome_idx, 
    'amount', amount_to_bet,
    'fee_amount', fee_amount,
    'net_points', net_points
  ));

  RETURN jsonb_build_object('status', 'ok', 'net_points', net_points, 'fee_amount', fee_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to increment user points safely
CREATE OR REPLACE FUNCTION public.increment_user_points(user_uuid uuid, amount int)
RETURNS void AS $$
BEGIN
  UPDATE public."user"
  SET insight_points = insight_points + amount
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
