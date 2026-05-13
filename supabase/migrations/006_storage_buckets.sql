-- Migration 006: Storage buckets + image_url column

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('card-images', 'card-images', true, 5242880, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "card_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'card-images');

CREATE POLICY "card_images_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'card-images');

ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS image_url text;
