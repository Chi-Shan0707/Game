# Prediction Market Simulator MVP

This is a simulation-only prediction market built with Next.js, TypeScript, and Supabase. **NO REAL MONEY** is involved; all transactions are virtual and for educational purposes only.

## Features

- Create and resolve prediction markets
- Buy simulated shares using LMSR (Logarithmic Market Scoring Rule)
- User profiles with Brier score-based reputation
- Admin interface for market management
- Basic anti-abuse: daily trade limits, simulation notices

## Tech Stack

- Frontend: Next.js (Pages Router) + React + TypeScript
- Backend: Next.js API Routes
- Database: Supabase (Postgres)
- Auth: Supabase Auth
- Styling: Tailwind CSS

## Setup Instructions

### 1. Create a Supabase Project

- Go to [supabase.com](https://supabase.com) and create a new project.
- Note down your project URL and API keys.

### 2. Run the SQL Schema

- In your Supabase dashboard, go to the SQL Editor.
- Copy and paste the contents of `sql/schema.sql` and run it.
- This creates all tables and inserts sample data.

### 3. Set Environment Variables

- Copy `.env.example` to `.env.local`.
- Fill in the values:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  NEXT_PUBLIC_SIM_ADMIN_KEY=your_admin_key_here
  ```

### 4. Install Dependencies and Run

```bash
npm install
npm run dev
```

- Open [http://localhost:3000](http://localhost:3000) in your browser.

## Manual Test Steps

1. **Create a Market (Admin)**:
   - Visit `/admin/create`.
   - Fill in title, description, outcomes (comma-separated).
   - Submit (uses admin key from env).

2. **Create a Test User**:
   - Use Supabase Auth UI or API to sign up a user.
   - The first trade will create a user record.

3. **Perform a Trade**:
   - Visit the market page.
   - Select outcome, enter quantity.
   - Submit trade (requires auth token).

4. **Resolve Market**:
   - Visit `/admin/resolve`.
   - Enter market ID and outcome index.
   - Submit.

5. **Check Profile**:
   - Visit `/profile/[user_id]` to see reputation update.

## TODO for Production

- Add realtime updates (Supabase realtime)
- Better auth/KYC integration
- Containerization (Docker)
- Message queue for async processing
- Fraud detection algorithms
- UI/UX improvements

## Security Notes

- Admin keys are simple; in production, use proper auth.
- All operations are logged in the `events` table.
- No real money flows; explicit checks prevent any payment integration.