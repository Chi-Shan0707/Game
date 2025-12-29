-- Schema for Prediction Market Simulator (simulation-only). No real money.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  supabase_user_id uuid not null unique,
  username text,
  display_name text,
  virtual_balance numeric default 1000, -- simulation-only currency
  reputation numeric default 0,
  reputation_count int default 0,
  created_at timestamptz default now()
);

create index if not exists users_supabase_user_id_idx on users(supabase_user_id);

create table if not exists markets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  outcomes jsonb not null, -- array of outcome objects {name}
  b numeric not null default 10.0, -- LMSR liquidity parameter
  q jsonb not null default '[]', -- array of quantities per outcome
  status text not null default 'open', -- open/resolved/cancelled
  created_by uuid,
  created_at timestamptz default now()
);

create index if not exists markets_status_idx on markets(status);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  market_id uuid not null references markets(id),
  outcome_index int not null,
  qty numeric not null,
  cost numeric not null,
  created_at timestamptz default now()
);

create index if not exists trades_user_idx on trades(user_id);

create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  market_id uuid not null references markets(id),
  holdings jsonb not null default '[]', -- array of numeric positions per outcome
  updated_at timestamptz default now()
);

create unique index if not exists positions_user_market_uq on positions(user_id, market_id);

create table if not exists resolutions (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references markets(id),
  outcome_index int not null,
  resolved_at timestamptz default now()
);

create table if not exists reputation_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  market_id uuid not null references markets(id),
  brier_score numeric not null,
  delta numeric not null,
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  payload jsonb,
  created_at timestamptz default now()
);

-- sample data: two markets
insert into markets (title, description, outcomes, q, b)
values
('Will candidate X win the election?', 'Simple binary test market', '[{"name":"Yes"},{"name":"No"}]', '[0,0]', 10),
('Which team wins the final?', 'Three-way market', '[{"name":"Team A"},{"name":"Team B"},{"name":"Draw"}]', '[0,0,0]', 12)
on conflict do nothing;
