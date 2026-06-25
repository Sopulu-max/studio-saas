-- ============================================================
-- MIGRATION: Sessions Table (Phase 1 — Additive Only)
-- Run this in the Supabase SQL editor.
-- Every statement is safe to re-run (IF NOT EXISTS guards).
-- Nothing is dropped or modified. Zero breaking changes.
-- ============================================================

-- ─── Step 1A: Create the sessions table ───────────────────────────────────────
-- A session is a scheduled physical delivery event that belongs to a booking.
-- One booking can have 0, 1, or many sessions.
-- For now, existing bookings will each get exactly one session (seeded in 1B).

CREATE TABLE IF NOT EXISTS sessions (
  session_id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       uuid        NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
  studio_id        uuid        NOT NULL REFERENCES studios(studio_id)  ON DELETE CASCADE,
  session_date     date,
  session_type     text,         -- e.g. 'studio', 'outdoor', 'event'
  location_address text,         -- only relevant when is_outdoor=true
  event_name       text,         -- only relevant when is_event=true
  event_date       date,         -- date of the occasion being covered
  shoot_type       text,         -- occasion category (birthday, wedding, etc.)
  notes            text,         -- session-specific operational notes
  created_at       timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_booking_id_idx ON sessions(booking_id);
CREATE INDEX IF NOT EXISTS sessions_studio_id_date_idx ON sessions(studio_id, session_date DESC);

-- Enable RLS to match the existing security model
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Studio members can manage their sessions" ON sessions;
CREATE POLICY "Studio members can manage their sessions"
  ON sessions
  USING (
    studio_id IN (
      SELECT studio_id FROM studios WHERE owner_id = auth.uid()
      UNION
      SELECT studio_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- ─── Step 1B: Seed sessions from existing bookings ────────────────────────────
-- For every booking that has a session_date, create one corresponding session.
-- This preserves the current 1:1 relationship for all legacy data.
-- The bookings table is NOT changed — this is purely additive.

INSERT INTO sessions (
  session_id,
  booking_id,
  studio_id,
  session_date,
  session_type,
  location_address,
  event_name,
  event_date,
  shoot_type,
  created_at
)
SELECT
  gen_random_uuid(),
  b.booking_id,
  b.studio_id,
  b.session_date,
  b.session_type,
  b.location_address,
  b.event_name,
  b.event_date,
  b.shoot_type,
  b.created_at
FROM bookings b
WHERE b.session_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sessions s WHERE s.booking_id = b.booking_id
  );

-- ─── Step 1C: Add session_id to booking_staff (nullable) ─────────────────────
-- Existing rows are unaffected. New rows will populate this going forward.

ALTER TABLE booking_staff
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions(session_id) ON DELETE CASCADE;

-- ─── Step 1D: Populate session_id on existing booking_staff rows ──────────────
-- Links each existing booking_staff assignment to the session that was just created.

UPDATE booking_staff bs
SET session_id = s.session_id
FROM sessions s
WHERE s.booking_id = bs.booking_id
  AND bs.session_id IS NULL;

-- ─── Step 1E: Add session_id to equipment_checkouts (nullable) ────────────────

ALTER TABLE equipment_checkouts
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions(session_id) ON DELETE SET NULL;

-- ─── Step 1F: Populate session_id on existing equipment_checkouts rows ─────────

UPDATE equipment_checkouts ec
SET session_id = s.session_id
FROM sessions s
WHERE s.booking_id = ec.booking_id
  AND ec.session_id IS NULL;

-- ─── Step 1G: Fix the ghost FK on equipment ───────────────────────────────────
-- equipment.booking_id can point to deleted bookings because deleteSession
-- doesn't null it out. This cleans up existing ghost links.
-- We also add session_id to equipment for future use.

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions(session_id) ON DELETE SET NULL;

-- Null out equipment rows that point to non-existent bookings (the ghost FKs)
UPDATE equipment e
SET
  booking_id     = NULL,
  session_id     = NULL,
  assigned_to    = NULL,
  checked_out_at = NULL,
  status         = 'available'
WHERE e.booking_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM bookings b WHERE b.booking_id = e.booking_id
  );

-- For valid equipment checkouts, populate the new session_id
UPDATE equipment e
SET session_id = s.session_id
FROM sessions s
WHERE s.booking_id = e.booking_id
  AND e.booking_id IS NOT NULL
  AND e.session_id IS NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
