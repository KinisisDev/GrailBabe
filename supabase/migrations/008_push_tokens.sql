-- Migration 008: Expo push token storage + price_snapshots table
-- Run after 007_trade_matches.sql

-- ── Push token columns ────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS expo_push_token text,
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_push_token
  ON users(expo_push_token)
  WHERE expo_push_token IS NOT NULL;

-- ── Price snapshots (daily portfolio values for sparkline) ────────────────────
CREATE TABLE IF NOT EXISTS price_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date   date NOT NULL,
  portfolio_value numeric(14, 2) NOT NULL DEFAULT 0,
  item_count      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_user_date
  ON price_snapshots(user_id, snapshot_date DESC);

-- RLS: users can only read their own snapshots (written by service role)
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_snapshots"
  ON price_snapshots FOR SELECT
  USING (
    user_id = (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub' LIMIT 1
    )
  );
