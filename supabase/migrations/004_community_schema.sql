-- Migration 004: Community — board, DMs, notifications

-- Board channels
CREATE TABLE IF NOT EXISTS board_channels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO board_channels (name, description, sort_order) VALUES
  ('general',    'General chat',              1),
  ('pokemon',    'Pokémon TCG talk',          2),
  ('mtg',        'Magic: The Gathering',      3),
  ('one-piece',  'One Piece TCG',             4),
  ('sports',     'Sports cards',              5),
  ('lego',       'Lego sets',                 6),
  ('trades',     'Looking for trades',        7),
  ('price-talk', 'Market prices & news',      8)
ON CONFLICT (name) DO NOTHING;

-- Board posts
CREATE TABLE IF NOT EXISTS board_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid NOT NULL REFERENCES board_channels(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_board_posts_channel ON board_posts(channel_id, created_at DESC);

-- Reactions
CREATE TABLE IF NOT EXISTS board_reactions (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id  uuid NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji    text NOT NULL,
  UNIQUE(post_id, user_id, emoji)
);

-- Replies
CREATE TABLE IF NOT EXISTS board_replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- DM conversations
CREATE TABLE IF NOT EXISTS dm_conversations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(initiator_id, recipient_id)
);

-- Direct messages
CREATE TABLE IF NOT EXISTS direct_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            text NOT NULL,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_direct_messages_conv ON direct_messages(conversation_id, created_at ASC);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text,
  body       text,
  metadata   jsonb,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE board_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
