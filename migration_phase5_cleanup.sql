-- migration_phase5_cleanup.sql

-- WARNING: Ensure Phase 5 data migration is fully verified before running this!
-- This migration DROPS the logistics columns from the `bookings` table.

BEGIN;

-- Drop deprecated logistics columns from bookings
ALTER TABLE bookings
  DROP COLUMN IF EXISTS session_date,
  DROP COLUMN IF EXISTS session_type,
  DROP COLUMN IF EXISTS location_address,
  DROP COLUMN IF EXISTS event_name,
  DROP COLUMN IF EXISTS event_date,
  DROP COLUMN IF EXISTS shoot_type;

COMMIT;
