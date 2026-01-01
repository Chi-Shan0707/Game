# Simulated Prediction Market — MVP

Important: This platform is a simulation for education and reputation only. "Insight Points" are non-purchasable, non-transferable, non-redeemable.

Quick start

Domain

- Development: use `http://localhost:3000` (no domain is required)
- Deployment: platforms like Vercel will auto-assign a domain (you can add a custom domain later)

1. Copy `.env.example` to `.env.local` and fill values.
2. Install dependencies:

```bash
npm install
```

3. Initialize database (Supabase Postgres + RPC)

This project uses Supabase SQL (tables + `execute_prediction` RPC) as the source of truth.

Run the SQL in `sql/init_schema.sql` in Supabase SQL Editor (or via `psql`) to create tables and the RPC function.

Prisma note

- `prisma/schema.prisma` is kept as a schema reference.
- Prisma commands are intentionally not part of the setup flow for this repo.

```bash
# Supabase SQL Editor: paste and run sql/init_schema.sql
# or via psql (requires DATABASE_URL):
# psql "$DATABASE_URL" -f sql/init_schema.sql
```

4. Run dev:

```bash
npm run dev
```

DB init

- Use `sql/init_schema.sql` in Supabase SQL Editor or `psql` to create tables and the `execute_prediction` RPC function.

Supabase requirement

- LocalStorage voting is suitable for a local demo only. It is not persistent across browsers/devices and is lost when clearing browser storage.
- Persistent voting requires a working Supabase project + `.env.local` with Supabase keys.

Compliance note

- TODO: Confirm content and features with legal counsel for Mainland China before public launch.
- No purchase routes or redeemable currency are present. All admin actions are logged in `EventLog`.
