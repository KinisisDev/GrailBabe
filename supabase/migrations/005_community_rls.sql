-- Migration 005: Community RLS policies

ALTER TABLE board_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Board channels: public read
CREATE POLICY "channels_read_all" ON board_channels FOR SELECT USING (true);

-- Board posts: public read, auth write
CREATE POLICY "posts_read_all" ON board_posts FOR SELECT USING (true);
CREATE POLICY "posts_insert_auth" ON board_posts FOR INSERT WITH CHECK (user_id = get_user_id());
CREATE POLICY "posts_delete_own" ON board_posts FOR DELETE USING (user_id = get_user_id());

-- Reactions
CREATE POLICY "reactions_read_all" ON board_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert_auth" ON board_reactions FOR INSERT WITH CHECK (user_id = get_user_id());
CREATE POLICY "reactions_delete_own" ON board_reactions FOR DELETE USING (user_id = get_user_id());

-- Replies
CREATE POLICY "replies_read_all" ON board_replies FOR SELECT USING (true);
CREATE POLICY "replies_insert_auth" ON board_replies FOR INSERT WITH CHECK (user_id = get_user_id());

-- DM conversations: participants only
CREATE POLICY "convs_read_participant" ON dm_conversations FOR SELECT
  USING (initiator_id = get_user_id() OR recipient_id = get_user_id());
CREATE POLICY "convs_insert_auth" ON dm_conversations FOR INSERT WITH CHECK (initiator_id = get_user_id());
CREATE POLICY "convs_update_participant" ON dm_conversations FOR UPDATE
  USING (initiator_id = get_user_id() OR recipient_id = get_user_id());

-- Direct messages: participants only
CREATE POLICY "dm_read_participant" ON direct_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM dm_conversations WHERE initiator_id = get_user_id() OR recipient_id = get_user_id()
  ));
CREATE POLICY "dm_insert_participant" ON direct_messages FOR INSERT
  WITH CHECK (sender_id = get_user_id());

-- Notifications: own only
CREATE POLICY "notifications_read_own" ON notifications FOR SELECT USING (user_id = get_user_id());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = get_user_id());
