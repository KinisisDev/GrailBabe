-- Migration 007: Trade matching

CREATE TYPE trade_match_status AS ENUM ('pending','viewed','dismissed','dm_opened');

CREATE TABLE IF NOT EXISTS trade_matches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_a_item_id   uuid NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
  user_b_item_id   uuid NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
  user_a_value     numeric(10,2),
  user_b_value     numeric(10,2),
  value_diff_pct   numeric(5,2),
  confidence       numeric(4,3),
  claude_reasoning text,
  status           trade_match_status NOT NULL DEFAULT 'pending',
  dismissed_by_a   boolean NOT NULL DEFAULT false,
  dismissed_by_b   boolean NOT NULL DEFAULT false,
  matched_at       timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_match CHECK (user_a_id != user_b_id),
  UNIQUE(user_a_id, user_b_id, user_a_item_id, user_b_item_id)
);

CREATE INDEX idx_trade_matches_user_a ON trade_matches(user_a_id, status);
CREATE INDEX idx_trade_matches_user_b ON trade_matches(user_b_id, status);

ALTER TABLE trade_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_matches_read_participant"
  ON trade_matches FOR SELECT
  USING (user_a_id = get_user_id() OR user_b_id = get_user_id());

CREATE POLICY "trade_matches_update_participant"
  ON trade_matches FOR UPDATE
  USING (user_a_id = get_user_id() OR user_b_id = get_user_id());

-- SQL helper for trade matching cron (Stage 1 pre-filter)
CREATE OR REPLACE FUNCTION find_trade_candidate_pairs()
RETURNS TABLE(
  user_a_id uuid, user_b_id uuid,
  user_a_item_id uuid, user_b_item_id uuid,
  user_a_value numeric, user_b_value numeric,
  value_diff_pct numeric
) AS $$
  SELECT
    a.user_id AS user_a_id,
    b.user_id AS user_b_id,
    a.id AS user_a_item_id,
    b.id AS user_b_item_id,
    a.current_value AS user_a_value,
    b.current_value AS user_b_value,
    ABS(a.current_value - b.current_value) / NULLIF(GREATEST(a.current_value, b.current_value), 0) * 100 AS value_diff_pct
  FROM vault_items a
  JOIN vault_items b ON a.category = b.category AND a.user_id != b.user_id
  WHERE
    a.current_value IS NOT NULL AND b.current_value IS NOT NULL
    AND a.current_value > 0 AND b.current_value > 0
    AND ABS(a.current_value - b.current_value) / NULLIF(GREATEST(a.current_value, b.current_value), 0) <= 0.30
    AND NOT EXISTS (
      SELECT 1 FROM trade_matches tm
      WHERE tm.matched_at > now() - interval '7 days'
        AND ((tm.user_a_id = a.user_id AND tm.user_b_id = b.user_id)
          OR (tm.user_a_id = b.user_id AND tm.user_b_id = a.user_id))
    )
  LIMIT 200;
$$ LANGUAGE SQL STABLE;
