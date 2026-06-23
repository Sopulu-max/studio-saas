-- ============================================================
-- Legacy Unification Migration
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Ensure `booking_fields` exists on services
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_fields jsonb DEFAULT '[]'::jsonb;

-- 2. Create Legacy Photography service for studios that don't have it
INSERT INTO services (studio_id, name, description, price, booking_fields)
SELECT 
  studio_id, 
  'Legacy Photography', 
  'Imported photography service from legacy bookings', 
  0,
  '[
    {"id": "legacy_outfits", "label": "Outfits", "type": "number", "required": false},
    {"id": "legacy_edited_photos", "label": "Edited photos", "type": "number", "required": false}
  ]'::jsonb
FROM studios
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE services.studio_id = studios.studio_id AND name = 'Legacy Photography'
);

-- 3. Create Legacy Videography service for studios that don't have it
INSERT INTO services (studio_id, name, description, price, booking_fields)
SELECT 
  studio_id, 
  'Legacy Videography', 
  'Imported videography service from legacy bookings', 
  0,
  '[
    {"id": "legacy_video_duration", "label": "Desired video length", "type": "text", "required": false},
    {"id": "legacy_coverage_hours", "label": "Coverage hours", "type": "number", "required": false},
    {"id": "legacy_crew_size", "label": "Crew size", "type": "number", "required": false}
  ]'::jsonb
FROM studios
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE services.studio_id = studios.studio_id AND name = 'Legacy Videography'
);

-- 4. Migrate old data into `custom_answers`
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS custom_answers jsonb DEFAULT '{}'::jsonb;

UPDATE bookings
SET custom_answers = COALESCE(custom_answers, '{}'::jsonb) 
  || (CASE WHEN outfits_count IS NOT NULL THEN jsonb_build_object('legacy_outfits', outfits_count::text) ELSE '{}'::jsonb END)
  || (CASE WHEN edited_photos IS NOT NULL THEN jsonb_build_object('legacy_edited_photos', edited_photos::text) ELSE '{}'::jsonb END)
  || (CASE WHEN video_duration IS NOT NULL THEN jsonb_build_object('legacy_video_duration', video_duration) ELSE '{}'::jsonb END)
  || (CASE WHEN coverage_hours IS NOT NULL THEN jsonb_build_object('legacy_coverage_hours', coverage_hours::text) ELSE '{}'::jsonb END)
  || (CASE WHEN crew_size IS NOT NULL THEN jsonb_build_object('legacy_crew_size', crew_size::text) ELSE '{}'::jsonb END);

-- 5. Link Photography bookings to the Legacy Photography service
INSERT INTO booking_services (booking_id, service_id, quantity, price_at_booking)
SELECT b.booking_id, s.service_id, 1, 0
FROM bookings b
JOIN services s ON s.studio_id = b.studio_id AND s.name = 'Legacy Photography'
WHERE b.service_type IN ('photo', 'photo_video')
AND NOT EXISTS (
  SELECT 1 FROM booking_services bs WHERE bs.booking_id = b.booking_id AND bs.service_id = s.service_id
);

-- 6. Link Videography bookings to the Legacy Videography service
INSERT INTO booking_services (booking_id, service_id, quantity, price_at_booking)
SELECT b.booking_id, s.service_id, 1, 0
FROM bookings b
JOIN services s ON s.studio_id = b.studio_id AND s.name = 'Legacy Videography'
WHERE b.service_type IN ('video', 'photo_video')
AND NOT EXISTS (
  SELECT 1 FROM booking_services bs WHERE bs.booking_id = b.booking_id AND bs.service_id = s.service_id
);

-- 7. Drop the deprecated columns
ALTER TABLE bookings
  DROP COLUMN IF EXISTS outfits_count,
  DROP COLUMN IF EXISTS edited_photos,
  DROP COLUMN IF EXISTS video_duration,
  DROP COLUMN IF EXISTS coverage_hours,
  DROP COLUMN IF EXISTS crew_size,
  DROP COLUMN IF EXISTS service_type;
