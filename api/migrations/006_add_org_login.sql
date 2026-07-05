-- ============================================
-- Migration 006: Add org login (login_code + password_hash)
-- ============================================

ALTER TABLE organizations ADD COLUMN login_code TEXT;
ALTER TABLE organizations ADD COLUMN password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_organizations_login_code ON organizations (login_code);
