-- ==========================================
-- Performance Optimization Migration
-- Adds critical indexes for updated_at and created_at columns
-- ==========================================

-- Add updated_at column indexes for all tables
CREATE INDEX IF NOT EXISTS idx_exhibits_updated_at ON exhibits(updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_collections_updated_at ON collections(updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_notifications_updated_at ON notifications(updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_messages_updated_at ON messages(updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_guestbook_updated_at ON guestbook(updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_wishlist_updated_at ON wishlist(updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at DESC NULLS LAST);

-- Add created_at column indexes for all tables (except users)
CREATE INDEX IF NOT EXISTS idx_exhibits_created_at ON exhibits(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_guestbook_created_at ON guestbook(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_wishlist_created_at ON wishlist(created_at DESC NULLS LAST);

-- Add JSONB indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_exhibits_owner_jsonb ON exhibits USING btree ((data->>'owner'));
CREATE INDEX IF NOT EXISTS idx_collections_owner_jsonb ON collections USING btree ((data->>'owner'));
CREATE INDEX IF NOT EXISTS idx_wishlist_owner_jsonb ON wishlist USING btree ((data->>'owner'));
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_jsonb ON notifications USING btree ((data->>'recipient'));
CREATE INDEX IF NOT EXISTS idx_users_email_jsonb ON users USING btree (LOWER(data->>'email'));

-- Update table statistics for better query planning
ANALYZE exhibits;
ANALYZE collections;
ANALYZE notifications;
ANALYZE messages;
ANALYZE guestbook;
ANALYZE wishlist;
ANALYZE users;

-- ==========================================
-- Verify indexes were created
-- ==========================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('exhibits', 'collections', 'notifications', 'messages', 'guestbook', 'wishlist', 'users')
ORDER BY tablename, indexname;
