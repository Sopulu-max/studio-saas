-- ============================================================
-- Service-Centric Architecture Migration
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Upgrade the `services` table to hold structural offering data
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS category_value text,       -- Links to studio_config.service_types
  ADD COLUMN IF NOT EXISTS session_type   text,       -- 'studio', 'outdoor', 'event', 'any'
  ADD COLUMN IF NOT EXISTS outfits_count  integer;

-- 2. Downgrade the `packages` table by removing structural data
-- NOTE: We are keeping the columns for now but marking them as deprecated in comments.
-- We do not want to break existing rows immediately until the code is fully migrated.
-- If you want a hard drop, uncomment the following lines:
-- ALTER TABLE packages 
--   DROP COLUMN IF EXISTS session_type,
--   DROP COLUMN IF EXISTS service_type,
--   DROP COLUMN IF EXISTS outfits_count,
--   DROP COLUMN IF EXISTS duration_mins;

-- For safety, we will just add a comment indicating they are deprecated.
COMMENT ON COLUMN packages.session_type IS 'DEPRECATED: Moved to services table';
COMMENT ON COLUMN packages.service_type IS 'DEPRECATED: Moved to services.category_value';
COMMENT ON COLUMN packages.outfits_count IS 'DEPRECATED: Moved to services table';
COMMENT ON COLUMN packages.duration_mins IS 'DEPRECATED: Moved to services table';
