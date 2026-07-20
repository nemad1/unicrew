-- ==========================================
-- 003_add_whatsapp_session.sql
-- Adds whatsapp_session_id to internal_users
-- ==========================================

ALTER TABLE internal_users
  ADD COLUMN IF NOT EXISTS whatsapp_session_id TEXT;
