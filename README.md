# Simulated Prediction Market — MVP

Important: This platform is a simulation for education and reputation only. "Insight Points" are non-purchasable, non-transferable, non-redeemable.

Quick start

1. Copy `.env.example` to `.env.local` and fill values.
2. Install dependencies:

```bash
npm install
```

3. Initialize Prisma (requires a Postgres URL in `.env.local`):

```bash
npx prisma generate
npx prisma migrate dev --name init
# or run the SQL in sql/init_schema.sql via Supabase SQL editor
```

4. Run dev:

```bash
npm run dev
```

DB init

- Use `sql/init_schema.sql` in Supabase SQL Editor or `psql` to create tables and RPC function.

Compliance note

- TODO: Confirm content and features with legal counsel for Mainland China before public launch.
- No purchase routes or redeemable currency are present. All admin actions are logged in `EventLog`.
