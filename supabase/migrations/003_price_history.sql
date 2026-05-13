-- Migration 003: Price snapshots and history

CREATE TABLE IF NOT EXISTS price_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
  price       numeric(10,2) NOT NULL,
  source      text DEFAULT 'manual',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_item_id ON price_history(item_id, recorded_at DESC);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_history_read_own"
  ON price_history FOR SELECT
  USING (item_id IN (SELECT id FROM vault_items WHERE user_id = get_user_id()));
