#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection parameters
DB_HOST="${DB_HOST:-89.169.46.157}"
DB_USER="${DB_USER:-gen_user}"
DB_NAME="${DB_NAME:-default_db}"
DB_PASSWORD="${DB_PASSWORD:-9H@DDCb.gQm.S\}}"

echo "🚀 Applying database indexes..."
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"
echo ""

# Apply migration using psql
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<'EOSQL'

-- Add updated_at column indexes for all tables
CREATE INDEX IF NOT EXISTS idx_exhibits_updated_at ON exhibits(updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_collections_updated_at ON collections(updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_notifications_updated_at ON notifications(updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_messages_updated_at ON messages(updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_guestbook_updated_at ON guestbook(updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_wishlist_updated_at ON wishlist(updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at DESC NULLS LAST);

-- Add created_at column indexes for all tables
CREATE INDEX IF NOT EXISTS idx_exhibits_created_at ON exhibits(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_guestbook_created_at ON guestbook(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_wishlist_created_at ON wishlist(created_at DESC NULLS LAST);

-- Add JSONB indexes
CREATE INDEX IF NOT EXISTS idx_exhibits_owner_jsonb ON exhibits USING btree ((data->>'owner'));
CREATE INDEX IF NOT EXISTS idx_collections_owner_jsonb ON collections USING btree ((data->>'owner'));
CREATE INDEX IF NOT EXISTS idx_wishlist_owner_jsonb ON wishlist USING btree ((data->>'owner'));
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_jsonb ON notifications USING btree ((data->>'recipient'));
CREATE INDEX IF NOT EXISTS idx_users_email_jsonb ON users USING btree (LOWER(data->>'email'));

-- Update statistics
ANALYZE exhibits;
ANALYZE collections;
ANALYZE notifications;
ANALYZE messages;
ANALYZE guestbook;
ANALYZE wishlist;
ANALYZE users;

\echo ''
\echo '✅ Migration completed successfully!'
\echo ''
\echo 'Indexes created:'
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
    AND tablename IN ('exhibits', 'collections', 'notifications', 'messages', 'guestbook', 'wishlist', 'users')
ORDER BY tablename, indexname;

EOSQL

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Database indexes applied successfully!"
else
    echo ""
    echo "❌ Migration failed with exit code $EXIT_CODE"
    exit $EXIT_CODE
fi
