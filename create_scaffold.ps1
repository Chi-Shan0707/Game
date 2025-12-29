<#
create_scaffold.ps1
在 PowerShell 中运行以生成 Next.js + TypeScript + Supabase MVP 项目骨架。
使用方法：
  1. 在目标目录保存本文件为 create_scaffold.ps1
  2. 打开 PowerShell（导航到该目录）
  3. 运行:
     Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
     .\create_scaffold.ps1
说明：脚本仅写文件，不会自动安装依赖或联网。请检查生成文件后再运行 npm install。
#>

# 函数：写入文件（UTF8）
function Write-ProjectFile {
    param(
        [string]$Path,
        [string]$Content
    )
    $dir = Split-Path $Path -Parent
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
#    $Content | Out-File -FilePath $Path -Encoding utf8 -Force
    $Content | Set-Content -LiteralPath $Path -Encoding utf8 -Force
    Write-Host "Wrote $Path"
}

# 创建目录
$dirs = @("lib","pages\api","pages\admin","pages\market","pages\profile","sql","styles")
foreach ($d in $dirs) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null }
}

# package.json
$pkg = @'
{
  "name": "prediction-market-sim",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^13.5.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.30.0",
    "clsx": "^1.2.1"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^13.5.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
'@
Write-ProjectFile -Path "package.json" -Content $pkg

# tsconfig.json
$ts = @'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "types": ["node", "jest"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
'@
Write-ProjectFile -Path "tsconfig.json" -Content $ts

# next.config.js
$nextcfg = @"
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
"@
Write-ProjectFile -Path "next.config.js" -Content $nextcfg

# .eslintrc.json
$eslintrc = @'
{
  "extends": ["next/core-web-vitals", "eslint:recommended"],
  "rules": {
    "@next/next/no-img-element": "off"
  }
}
'@
Write-ProjectFile -Path ".eslintrc.json" -Content $eslintrc

# .env.example
$envex = @'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SIM_ADMIN_KEY=changeme_admin_key
'@
Write-ProjectFile -Path ".env.example" -Content $envex

# sql/schema.sql
$sql = @'
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
('Will candidate X win the election?', 'Simple binary test market', ''[{"name":"Yes"},{"name":"No"}]'', '[0,0]', 10),
('Which team wins the final?', 'Three-way market', ''[{"name":"Team A"},{"name":"Team B"},{"name":"Draw"}]'', '[0,0,0]', 12)
on conflict do nothing;
'@
# Note: double single-quotes to avoid confusion in here-doc
Write-ProjectFile -Path "sql/schema.sql" -Content $sql

# lib/supabaseClient.ts
$supclient = @"
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.warn('NEXT_PUBLIC_SUPABASE_URL is not set');
}

export const clientSideSupabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// serverClient must only be used in trusted server contexts (uses service role key)
export const serverClient: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);

export default clientSideSupabase;

// TODO: For server endpoints that require verifying a user's access token, read
// the `Authorization: Bearer <access_token>` header and call
// `serverClient.auth.getUser()` appropriately.
"@
Write-ProjectFile -Path "lib/supabaseClient.ts" -Content $supclient

# lib/lmsr.ts
$lmsr = @"
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
"@
Write-ProjectFile -Path "lib/lmsr.ts" -Content $lmsr

# lib/reputation.ts
$reputation = @"
/**
 * Reputation helpers: Brier score calculation for discrete outcomes.
 */

export function brierScore(probabilities: number[], outcomeIndex: number): number {
  const n = probabilities.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const o = i === outcomeIndex ? 1 : 0;
    const d = (probabilities[i] || 0) - o;
    sum += d * d;
  }
  return sum;
}

export function reputationDeltaFromBrier(brier: number, nOutcomes: number): number {
  const maxBrier = 2;
  const normalized = Math.max(0, Math.min(1, 1 - brier / maxBrier));
  return parseFloat((normalized * 10 - 5).toFixed(4));
}

export function updateAverageReputation(oldAvg: number, oldCount: number, delta: number): { newAvg: number; newCount: number } {
  const newCount = oldCount + 1;
  const newAvg = ((oldAvg * oldCount) + delta) / newCount;
  return { newAvg, newCount };
}
"@
Write-ProjectFile -Path "lib/reputation.ts" -Content $reputation

# pages/_app.tsx
$app = @"
import '../styles/globals.css';
import type { AppProps } from 'next/app';

function Banner() {
  return (
    <div className='bg-red-600 text-white text-center py-2'>
      <strong>SIMULATION ONLY — NO REAL MONEY</strong>
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div>
      <Banner />
      <main className='p-4'>
        <Component {...pageProps} />
      </main>
    </div>
  );
}
"@
Write-ProjectFile -Path "pages/_app.tsx" -Content $app

# pages/index.tsx
$index = @"
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Market = {
  id: string;
  title: string;
  description?: string;
  outcomes: { name: string }[];
  q: number[];
  b: number;
  status: string;
};

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    async function fetchMarkets() {
      const res = await fetch('/api/markets');
      const data = await res.json();
      setMarkets(data || []);
    }
    fetchMarkets();
  }, []);

  return (
    <div>
      <h1 className='text-2xl font-bold mb-4'>Open Markets</h1>
      <div className='space-y-3'>
        {markets.map((m) => (
          <div key={m.id} className='p-3 border rounded'>
            <Link href={'/market/' + m.id}>
              <a className='text-lg font-semibold'>{m.title}</a>
            </Link>
            <div className='text-sm text-gray-600'>{m.description}</div>
            <div className='mt-2'>
              {m.outcomes.map((o, idx) => (
                <span key={idx} className='mr-2 inline-block bg-gray-100 px-2 py-1 rounded'>{o.name}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
"@
Write-ProjectFile -Path "pages/index.tsx" -Content $index

# pages/market/[id].tsx
$marketPage = @"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getPrices, buyCostDelta } from '../../lib/lmsr';

type Market = {
  id: string;
  title: string;
  description?: string;
  outcomes: { name: string }[];
  q: number[];
  b: number;
  status: string;
};

export default function MarketPage() {
  const router = useRouter();
  const { id } = router.query;
  const [market, setMarket] = useState<Market | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [selected, setSelected] = useState<number>(0);
  const [costPreview, setCostPreview] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await fetch('/api/market/' + id);
      const data = await res.json();
      setMarket(data);
    }
    load();
  }, [id]);

  function preview() {
    if (!market) return;
    const { costDelta } = buyCostDelta(market.q, selected, qty, market.b);
    setCostPreview(costDelta);
  }

  async function submitTrade(e: React.FormEvent) {
    e.preventDefault();
    if (!market) return;
    const token = (window as any).__supabase_access_token || null;
    const res = await fetch('/api/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      body: JSON.stringify({ marketId: market.id, outcomeIndex: selected, qty })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Trade executed');
      location.reload();
    } else {
      alert(data?.error || 'Trade failed');
    }
  }

  if (!market) return <div>Loading...</div>;

  const prices = getPrices(market.q, market.b);

  return (
    <div>
      <h1 className='text-xl font-bold'>{market.title}</h1>
      <p className='text-sm text-gray-600'>{market.description}</p>

      <div className='mt-4'>
        <h2 className='font-semibold'>Outcomes & Prices</h2>
        <ul className='mt-2'>
          {market.outcomes.map((o, i) => (
            <li key={i} className='flex items-center justify-between py-1'>
              <div>{o.name}</div>
              <div className='font-mono'>{(prices[i] * 100).toFixed(2)}%</div>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={submitTrade} className='mt-4 border rounded p-3'>
        <h3 className='font-semibold'>Buy (simulation)</h3>
        <div className='mt-2'>
          <label className='block text-sm'>Outcome</label>
          <select value={selected} onChange={(e) => setSelected(Number(e.target.value))} className='border p-1'>
            {market.outcomes.map((o, i) => (
              <option key={i} value={i}>{o.name}</option>
            ))}
          </select>
        </div>
        <div className='mt-2'>
          <label className='block text-sm'>Quantity</label>
          <input type='number' value={qty} min={0.1} step={0.1} onChange={(e) => setQty(Number(e.target.value))} className='border p-1' />
        </div>
        <div className='mt-2'>
          <button type='button' onClick={preview} className='mr-2 bg-blue-600 text-white px-3 py-1 rounded'>Preview Cost</button>
          <button type='submit' className='bg-green-600 text-white px-3 py-1 rounded'>Buy</button>
        </div>
        {costPreview !== null && <div className='mt-2'>Estimated cost: {costPreview.toFixed(4)}</div>}
      </form>
    </div>
  );
}
"@
Write-ProjectFile -Path "pages/market/[id].tsx" -Content $marketPage

# pages/profile/[id].tsx
$profile = @"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type Profile = {
  id: string;
  username?: string;
  display_name?: string;
  reputation?: number;
  reputation_count?: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await fetch('/api/user/' + id);
      const data = await res.json();
      setProfile(data);
    }
    load();
  }, [id]);

  if (!profile) return <div>Loading...</div>;

  return (
    <div>
      <h1 className='text-xl font-bold'>{profile.display_name || profile.username}</h1>
      <div className='mt-2'>Reputation: {profile.reputation?.toFixed(4) ?? '0'}</div>
      <div>Predictions: {profile.reputation_count ?? 0}</div>
      <div className='mt-4'>
        <h2 className='font-semibold'>Recent performance</h2>
        <div className='text-sm text-gray-600'>(See reputation_records table for details)</div>
      </div>
    </div>
  );
}
"@
Write-ProjectFile -Path "pages/profile/[id].tsx" -Content $profile

# pages/admin/create.tsx
$adminCreate = @"
import { useState } from 'react';

export default function AdminCreate() {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [outcomes, setOutcomes] = useState('Yes,No');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const key = process.env.NEXT_PUBLIC_SIM_ADMIN_KEY;
    const res = await fetch('/api/markets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sim-admin-key': key || '' },
      body: JSON.stringify({ title, description: desc, outcomes: outcomes.split(',').map((s) => ({ name: s.trim() })) })
    });
    if (res.ok) {
      alert('Market created');
    } else {
      alert('Failed to create');
    }
  }

  return (
    <div>
      <h1 className='text-xl font-bold'>Admin: Create Market</h1>
      <form onSubmit={submit} className='mt-3 space-y-2'>
        <div>
          <label className='block'>Title</label>
          <input className='border p-1 w-full' value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className='block'>Description</label>
          <input className='border p-1 w-full' value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div>
          <label className='block'>Outcomes (comma-separated)</label>
          <input className='border p-1 w-full' value={outcomes} onChange={(e) => setOutcomes(e.target.value)} />
        </div>
        <button type='submit' className='bg-blue-600 text-white px-3 py-1 rounded'>Create</button>
      </form>
    </div>
  );
}
"@
Write-ProjectFile -Path "pages/admin/create.tsx" -Content $adminCreate

# pages/admin/resolve.tsx
$adminResolve = @"
import { useState } from 'react';

export default function AdminResolve() {
  const [marketId, setMarketId] = useState('');
  const [outcomeIndex, setOutcomeIndex] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const key = process.env.NEXT_PUBLIC_SIM_ADMIN_KEY;
    const res = await fetch('/api/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sim-admin-key': key || '' },
      body: JSON.stringify({ marketId, outcomeIndex })
    });
    if (res.ok) alert('Resolved'); else alert('Failed');
  }

  return (
    <div>
      <h1 className='text-xl font-bold'>Admin: Resolve Market</h1>
      <form onSubmit={submit} className='mt-3 space-y-2'>
        <div>
          <label className='block'>Market ID</label>
          <input className='border p-1 w-full' value={marketId} onChange={(e) => setMarketId(e.target.value)} />
        </div>
        <div>
          <label className='block'>Outcome Index (0-based)</label>
          <input type='number' className='border p-1 w-full' value={outcomeIndex} onChange={(e) => setOutcomeIndex(Number(e.target.value))} />
        </div>
        <button type='submit' className='bg-red-600 text-white px-3 py-1 rounded'>Resolve</button>
      </form>
    </div>
  );
}
"@
Write-ProjectFile -Path "pages/admin/resolve.tsx" -Content $adminResolve

# pages/api/markets.ts
$apiMarkets = @"
import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await serverClient.from('markets').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const key = req.headers['x-sim-admin-key'] || req.headers['x-sim-admin-key'.toLowerCase()];
    if (String(key) !== process.env.NEXT_PUBLIC_SIM_ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });
    const { title, description, outcomes, b } = req.body;
    const q = outcomes.map(() => 0);
    const { data, error } = await serverClient.from('markets').insert([{ title, description, outcomes, q, b: b ?? 10 }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await serverClient.from('events').insert([{ kind: 'market_created', payload: data }]);
    return res.status(201).json(data);
  }

  return res.status(405).end();
}
"@
Write-ProjectFile -Path "pages/api/markets.ts" -Content $apiMarkets

# pages/api/market/[id].ts
$apiMarketId = @"
import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../../lib/supabaseClient';
import { getPrices } from '../../../lib/lmsr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (req.method !== 'GET') return res.status(405).end();
  const { data, error } = await serverClient.from('markets').select('*').eq('id', id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'not found' });
  const q = Array.isArray(data.q) ? data.q.map(Number) : [];
  const prices = getPrices(q, Number(data.b));
  return res.json({ ...data, q, prices });
}
"@
Write-ProjectFile -Path "pages/api/market/[id].ts" -Content $apiMarketId

# pages/api/trade.ts
$apiTrade = @"
import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../lib/supabaseClient';
import { buyCostDelta } from '../../lib/lmsr';

// Simple per-user daily limit (example)
const DAILY_LIMIT = 500;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const auth = req.headers.authorization?.split(' ')[1] ?? null;
  const { marketId, outcomeIndex, qty } = req.body;
  if (!auth) return res.status(401).json({ error: 'missing auth token' });

  const { data: userRes, error: userErr } = await serverClient.auth.getUser(auth);
  if (userErr) return res.status(401).json({ error: userErr.message });
  const supaUserId = userRes?.data?.user?.id;
  if (!supaUserId) return res.status(401).json({ error: 'invalid user' });

  let { data: users } = await serverClient.from('users').select('*').eq('supabase_user_id', supaUserId).limit(1).maybeSingle();
  let user = users as any;
  if (!user) {
    const inserted = await serverClient.from('users').insert([{ supabase_user_id: supaUserId, username: 'user_' + String(supaUserId).slice(0, 6) }]).select().maybeSingle();
    user = inserted.data;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentTrades } = await serverClient.from('trades').select('cost').eq('user_id', user.id).gte('created_at', since);
  const spent = (recentTrades || []).reduce((s: number, t: any) => s + Number(t.cost || 0), 0);
  if (spent + Number(0) > DAILY_LIMIT) return res.status(429).json({ error: 'daily limit exceeded' });

  const { data: market } = await serverClient.from('markets').select('*').eq('id', marketId).maybeSingle();
  if (!market) return res.status(404).json({ error: 'market not found' });
  const q = Array.isArray(market.q) ? market.q.map(Number) : [];
  const b = Number(market.b);

  const { costDelta, newQ } = buyCostDelta(q, outcomeIndex, Number(qty), b);

  if (Number(user.virtual_balance) < costDelta) return res.status(400).json({ error: 'insufficient virtual balance' });

  const tradeInsert = await serverClient.from('trades').insert([{
    user_id: user.id,
    market_id: marketId,
    outcome_index: outcomeIndex,
    qty,
    cost: costDelta
  }]).select().maybeSingle();

  const { data: pos } = await serverClient.from('positions').select('*').eq('user_id', user.id).eq('market_id', marketId).maybeSingle();
  let holdings = [] as number[];
  if (pos && pos.holdings) holdings = pos.holdings.map(Number);
  while (holdings.length < newQ.length) holdings.push(0);
  holdings[outcomeIndex] = holdings[outcomeIndex] + Number(qty);
  if (pos) {
    await serverClient.from('positions').update({ holdings, updated_at: new Date().toISOString() }).eq('id', pos.id);
  } else {
    await serverClient.from('positions').insert([{ user_id: user.id, market_id: marketId, holdings }]);
  }

  await serverClient.from('markets').update({ q: newQ }).eq('id', marketId);

  const newBalance = Number(user.virtual_balance) - Number(costDelta);
  await serverClient.from('users').update({ virtual_balance: newBalance }).eq('id', user.id);

  await serverClient.from('events').insert([{ kind: 'trade', payload: { user: user.id, market: marketId, outcomeIndex, qty, cost: costDelta } }]);

  return res.json({ ok: true, trade: tradeInsert.data, newBalance, holdings });
}
"@
Write-ProjectFile -Path "pages/api/trade.ts" -Content $apiTrade

# pages/api/resolve.ts
$apiResolve = @"
import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../lib/supabaseClient';
import { brierScore, reputationDeltaFromBrier, updateAverageReputation } from '../../lib/reputation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const key = req.headers['x-sim-admin-key'] || req.headers['x-sim-admin-key'.toLowerCase()];
  if (String(key) !== process.env.NEXT_PUBLIC_SIM_ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });

  const { marketId, outcomeIndex } = req.body;
  const { data: market } = await serverClient.from('markets').select('*').eq('id', marketId).maybeSingle();
  if (!market) return res.status(404).json({ error: 'not found' });

  await serverClient.from('markets').update({ status: 'resolved' }).eq('id', marketId);
  await serverClient.from('resolutions').insert([{ market_id: marketId, outcome_index: outcomeIndex }]);

  const { data: positions } = await serverClient.from('positions').select('*').eq('market_id', marketId);
  for (const pos of positions || []) {
    const holdings = (pos.holdings || []).map(Number);
    const payoff = holdings[outcomeIndex] || 0;
    const u = await serverClient.from('users').select('*').eq('id', pos.user_id).maybeSingle();
    if (u.data) {
      const newBal = Number(u.data.virtual_balance || 0) + Number(payoff);
      await serverClient.from('users').update({ virtual_balance: newBal }).eq('id', u.data.id);
    }
  }

  const q = Array.isArray(market.q) ? market.q.map(Number) : [];
  const b = Number(market.b);
  const probs = (await import('../../lib/lmsr')).getPrices(q, b);

  for (const pos of positions || []) {
    const userId = pos.user_id;
    const brier = brierScore(probs, outcomeIndex);
    const delta = reputationDeltaFromBrier(brier, probs.length);
    await serverClient.from('reputation_records').insert([{ user_id: userId, market_id: marketId, brier_score: brier, delta }]);
    const u = await serverClient.from('users').select('*').eq('id', userId).maybeSingle();
    if (u.data) {
      const { newAvg, newCount } = updateAverageReputation(Number(u.data.reputation || 0), Number(u.data.reputation_count || 0), delta);
      await serverClient.from('users').update({ reputation: newAvg, reputation_count: newCount }).eq('id', userId);
    }
  }

  await serverClient.from('events').insert([{ kind: 'market_resolved', payload: { marketId, outcomeIndex } }]);

  return res.json({ ok: true });
}
"@
Write-ProjectFile -Path "pages/api/resolve.ts" -Content $apiResolve

# pages/api/user/[id].ts
$apiUser = @"
import type { NextApiRequest, NextApiResponse } from 'next';
import { serverClient } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (req.method !== 'GET') return res.status(405).end();
  const { data } = await serverClient.from('users').select('id,username,display_name,virtual_balance,reputation,reputation_count').eq('id', id).maybeSingle();
  if (!data) return res.status(404).json({ error: 'not found' });
  return res.json(data);
}
"@
Write-ProjectFile -Path "pages/api/user/[id].ts" -Content $apiUser

# styles/globals.css
$css = @"
@tailwind base;
@tailwind components;
@tailwind utilities;

body { font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }

.container { max-width: 800px; margin: 0 auto; }
"@
Write-ProjectFile -Path "styles/globals.css" -Content $css

# tailwind.config.js
$tailwind = @"
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {}
  },
  plugins: []
};
"@
Write-ProjectFile -Path "tailwind.config.js" -Content $tailwind

# postcss.config.js
$postcss = @"
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
"@
Write-ProjectFile -Path "postcss.config.js" -Content $postcss

