-- Phase 4 Cleanup
-- Run this in the Supabase SQL editor.

-- 1. Drop deprecated package columns
ALTER TABLE packages
  DROP COLUMN IF EXISTS duration_mins,
  DROP COLUMN IF EXISTS outfits_count,
  DROP COLUMN IF EXISTS session_type,
  DROP COLUMN IF EXISTS service_type,
  DROP COLUMN IF EXISTS inclusions;

-- 2. Drop deprecated staff role scalar (staff.roles array is now the canonical source)
ALTER TABLE staff
  DROP COLUMN IF EXISTS role;
