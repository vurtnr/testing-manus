-- Migration 003: Users table for authentication
-- Adds user identity, seeds system + demo users, backfills existing data

BEGIN;

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  organization TEXT,
  role TEXT DEFAULT 'user',
  is_demo BOOLEAN DEFAULT false,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert system user for pre-existing data
INSERT INTO users (id, email, password_hash, display_name, role)
VALUES ('00000000-0000-0000-0000-000000000000',
        'system@materialsense.cn',
        '$2b$10$unused.system.account.no.login',
        '系统',
        'system')
ON CONFLICT (email) DO NOTHING;

-- 3. Insert demo user (password: demo123)
INSERT INTO users (email, password_hash, display_name, is_demo)
VALUES ('demo@materialsense.cn',
        '$2b$10$itex2WpmT8T4SpkDjYGaWu17DEz4/1w6pTVE4daYltLekFz0VgdwW',
        '演示账号',
        true)
ON CONFLICT (email) DO NOTHING;

-- 4. Add user_id to conversations and backfill
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
UPDATE conversations SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;
ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;

-- 5. Add user_id to files and backfill
ALTER TABLE files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
UPDATE files SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;
ALTER TABLE files ALTER COLUMN user_id SET NOT NULL;

COMMIT;
