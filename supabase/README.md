# GrailBabe — Supabase Setup

## Running Migrations

1. Go to your Supabase project → SQL Editor
2. Run migrations in order:
   - `001_initial_schema.sql`  — creates all tables, enums, indexes, triggers
   - `002_rls_policies.sql`  — enables RLS and adds all row-level security policies

## Clerk + Supabase JWT Integration

Supabase RLS uses `auth.jwt() ->> 'sub'` to identify users via their Clerk `clerk_id`.
You must configure Clerk to issue Supabase-compatible JWTs:

1. In Clerk Dashboard → JWT Templates → create a new template named `supabase`
2. Set the signing key to your **Supabase JWT Secret** (Project Settings → API → JWT Secret)
3. Add this claim to the template:
   ```json
   { "role": "authenticated" }
   ```
4. In your Next.js app, pass the Clerk Supabase token when creating the client:
   ```ts
   const { getToken } = useAuth()
   const token = await getToken({ template: 'supabase' })
   const client = createClient(url, anonKey, {
     global: { headers: { Authorization: `Bearer ${token}` } }
   })
   ```

## Key Design Decisions

- `users.clerk_id` is the bridge between Clerk auth and Supabase data
- `get_current_user_id()` is a `SECURITY DEFINER` helper that resolves clerk_id → users.id for RLS
- Catalog tables (`sets`, `set_items`) are public read / service_role write
- All user data tables enforce owner-only write; public read is opt-in via `is_public`
- `price_snapshots` dedup index prevents double-cron writes within the same minute
