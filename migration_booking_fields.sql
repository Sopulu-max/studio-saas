-- ─── Booking form fields for video/coverage/crew ──────────────────────────
-- Run this in the Supabase SQL editor.
-- Each statement is safe to re-run (ADD COLUMN IF NOT EXISTS).

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS video_duration  text,
  ADD COLUMN IF NOT EXISTS coverage_hours  integer,
  ADD COLUMN IF NOT EXISTS crew_size       integer;
