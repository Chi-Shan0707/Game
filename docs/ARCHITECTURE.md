# Architecture Overview

- Frontend: Next.js (pages router) + Tailwind + shadcn/ui. Renders market discovery, market details, prediction UI and profile pages. Shows persistent compliance banner.
- Backend: Next.js API routes. Uses Supabase (Postgres) for persistence and optional realtime.
- ORM: Prisma for schema modeling and migrations (schema in `prisma/schema.prisma`).
- Realtime: Supabase Realtime or socket.io for live pool/odds updates; clients subscribe to updated pools.
- Compliance Layer: Server-side `lib/compliance.ts` enforces topic blacklist, editorial approval flags, daily point-earn rules, and blocks any purchase/redeem flows. Admin APIs require `SIMULATION_ADMIN_KEY` and service-role Supabase key.

Data flow (summary):
1. User interacts with frontend; actions call Next API routes.
2. Prediction placement calls server-side RPC `execute_prediction` (atomic transaction) via Supabase service role to update pools and user insight points.
3. Settlement uses server-side RPC and reputation computations; writes `Settlement`, `ReputationRecord`, and `EventLog` records.

Security notes:
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- All admin routes must validate `SIMULATION_ADMIN_KEY` and be logged.

TODO: Add sequence diagrams and deploy notes.
