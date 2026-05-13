-- Equipment checkout: proper tracking columns + history table
-- Run once in the Supabase SQL editor

-- 1. Add checkout columns to equipment table
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS assigned_to    text,
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS booking_id     uuid REFERENCES bookings(booking_id) ON DELETE SET NULL;

-- 2. Migrate existing text-note checkouts: extract name from notes prefix
--    "[Checked out to: Jane on 12 May 2026]" → assigned_to = 'Jane'
UPDATE equipment
SET
  assigned_to    = (regexp_match(notes, '^\[Checked out to: (.+?) on .+?\]'))[1],
  checked_out_at = now()
WHERE
  status = 'in_use'
  AND notes IS NOT NULL
  AND notes LIKE '[Checked out to:%';

-- 3. Checkout history table
CREATE TABLE IF NOT EXISTS equipment_checkouts (
  checkout_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id   uuid NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
  studio_id      uuid NOT NULL REFERENCES studios(studio_id) ON DELETE CASCADE,
  assigned_to    text NOT NULL,
  booking_id     uuid REFERENCES bookings(booking_id) ON DELETE SET NULL,
  checked_out_at timestamptz NOT NULL DEFAULT now(),
  checked_in_at  timestamptz,
  notes          text
);

CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_equipment ON equipment_checkouts(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_studio    ON equipment_checkouts(studio_id, checked_out_at DESC);
