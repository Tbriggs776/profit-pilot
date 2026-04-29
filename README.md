# Profit Pilot

A price calculation and profit margin tool with usage analytics. Built with React, Vite, Supabase, and deployed on Vercel.

## Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Radix UI, Framer Motion, Recharts
- **Backend:** Supabase (Postgres + Auth + Edge Functions + Row Level Security)
- **Hosting:** Vercel
- **Source Control:** GitHub

## Local development

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL + anon key
npm run dev
```

Open http://localhost:5173.

## Environment variables

| Name | Where to set | Notes |
|------|--------------|-------|
| `VITE_SUPABASE_URL` | `.env` (local), Vercel env (prod) | From Supabase project settings |
| `VITE_SUPABASE_ANON_KEY` | `.env` (local), Vercel env (prod) | Public anon key |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run [`supabase/migrations/20260429000000_init.sql`](supabase/migrations/20260429000000_init.sql).
   This creates:
   - `profiles` table (extends `auth.users` with `full_name`, `role`)
   - `analytics_events` table
   - Row Level Security policies
   - A trigger that auto-creates a profile row on signup
3. (Optional) Enable Google OAuth in **Authentication → Providers**.
4. Deploy the analytics edge function (requires the [Supabase CLI](https://supabase.com/docs/guides/cli)):

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase functions deploy getAnalytics
   ```

5. To grant yourself admin access (needed to view the Analytics page):

   ```sql
   update public.profiles set role = 'admin' where id = '<your-auth-uid>';
   ```

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project → Import** the repo. Framework preset: **Vite**.
3. Add the env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) under **Settings → Environment Variables**.
4. Deploy.

`vercel.json` rewrites all paths to `index.html` for client-side routing.

## Project layout

```
src/
  api/
    supabaseClient.js    # Supabase JS client
    analytics.js         # event tracking helper
    base44Client.js      # compatibility shim mapping the old base44 surface to Supabase
    entities.js          # legacy export shims
    integrations.js      # legacy export shims (now unimplemented stubs)
  lib/
    AuthContext.jsx      # auth provider built on supabase.auth
    NavigationTracker.jsx
    query-client.js
  pages/
    Home.jsx
    PriceCalculator.jsx
    Analytics.jsx        # admin-only dashboard
    Profile.jsx          # email/password + Google sign-in
supabase/
  migrations/            # SQL schema
  functions/getAnalytics # edge function for analytics aggregation
```

## Migrating from Base44

This project was originally built on the [Base44](https://base44.com) platform. The migration:

- Replaced `@base44/sdk` with `@supabase/supabase-js`.
- Mapped `base44.auth` → `supabase.auth`.
- Mapped `base44.analytics.track()` → direct insert into `analytics_events`.
- Mapped `base44.functions.invoke()` → `supabase.functions.invoke()`.
- Rewrote the `getAnalytics` Deno function as a Supabase Edge Function.
- Removed `@base44/vite-plugin`.
- Authentication is now optional — the calculator works for anonymous users.
