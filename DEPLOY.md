# GrailBabe — Vercel Deploy Guide

## One-time setup

### 1. Import the repo
1. Push `grailbabe/` to a GitHub repo
2. Go to https://vercel.com/new → Import Repository
3. Vercel auto-detects Next.js — leave framework as **Next.js**
4. Set **Root Directory** to `apps/web` (or leave blank — vercel.json handles it)

### 2. Add Environment Variables
In Vercel project → Settings → Environment Variables, add all of these:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/vault` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/vault` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (keep secret!) |
| `NEXT_PUBLIC_API_SERVER_URL` | Your Replit api-server URL |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain e.g. `https://grailbabe.vercel.app` |

### 3. Add your Vercel domain to Clerk
In Clerk Dashboard → Domains → add your `*.vercel.app` production URL.

### 4. Run Supabase migrations
In Supabase → SQL Editor, run in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

### 5. Deploy
Push to `main` — Vercel auto-deploys. That's it.

---

## Local dev

```bash
# From monorepo root
npm install
cp apps/web/.env.local.example apps/web/.env.local
# Fill in .env.local with your keys
npm run dev        # starts apps/web on localhost:3000
```

## Clerk → Supabase JWT (required for RLS)

To allow the Supabase client to make authenticated requests on behalf of users,
set up the JWT template in Clerk:

1. Clerk Dashboard → JWT Templates → New Template
2. Name it `supabase`
3. Paste in this template:
```json
{
  "sub": "{{user.id}}",
  "role": "authenticated",
  "email": "{{user.primary_email_address}}"
}
```
4. Set the signing key to your **Supabase JWT Secret**
   (Supabase → Project Settings → API → JWT Settings → JWT Secret)
5. In your client-side Supabase calls, pass the token:
```ts
const { getToken } = useAuth()
const token = await getToken({ template: 'supabase' })
const authedClient = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${token}` } }
})
```

> **Note:** The vault page currently uses the service role key server-side
> (via Server Actions), so it works without this step. Add JWT auth when you
> build client-side realtime features in Phase 04.

---

## Phase 02 — Inngest Setup (PriceSnapshot cron)

### 1. Create an Inngest account
Go to https://app.inngest.com → create a project named `grailbabe`

### 2. Add environment variables
From Inngest dashboard → Manage → Event Keys:

| Variable | Where |
|---|---|
| `INNGEST_EVENT_KEY` | Event Keys tab |
| `INNGEST_SIGNING_KEY` | Keys tab → Signing Key |

### 3. Register your app with Inngest
After deploying to Vercel, go to Inngest dashboard → Apps → Add App
Enter your URL: `https://your-domain.vercel.app/api/inngest`

Inngest will discover your functions (`refresh-all-prices`, `refresh-single-item`)
and set up the cron schedule automatically.

### 4. Run migration 003
In Supabase SQL Editor run:
`supabase/migrations/003_portfolio_rpc.sql`

This adds the `portfolio_daily_value()` RPC function used by the Portfolio Pulse chart.

### 5. Dev testing
During local dev, run the Inngest dev server alongside Next.js:
```bash
npx inngest-cli@latest dev
# In a separate terminal:
npm run dev
```
Go to http://localhost:8288 to manually trigger the cron and inspect function runs.

### Price source mapping
| Category | Primary | Fallback |
|---|---|---|
| Pokémon | JustTCG | Pokémon TCG API |
| MTG | Scryfall (usd price) | — |
| One Piece | TCGapi.dev | — |
| Sports Cards | CardHedger | PriceCharting |
| Lego | PriceCharting | — |
