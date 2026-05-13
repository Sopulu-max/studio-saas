-- ─── Services catalog ─────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor.
-- Each statement is safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- 1. Services catalog table
CREATE TABLE IF NOT EXISTS services (
  service_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     uuid NOT NULL REFERENCES studios(studio_id) ON DELETE CASCADE,
  name          text NOT NULL,
  type          text NOT NULL DEFAULT 'service' CHECK (type IN ('service', 'product', 'digital')),
  description   text,
  price         numeric,
  duration_mins integer,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- 2. Package ↔ Services join (is_addon=false means included, true means optional add-on)
CREATE TABLE IF NOT EXISTS package_services (
  package_service_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id    uuid NOT NULL REFERENCES packages(package_id) ON DELETE CASCADE,
  service_id    uuid NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
  is_addon      boolean NOT NULL DEFAULT false,
  addon_price   numeric,
  display_order integer NOT NULL DEFAULT 0,
  UNIQUE (package_id, service_id)
);

-- 3. Booking ↔ Services join (for standalone service bookings)
CREATE TABLE IF NOT EXISTS booking_services (
  booking_service_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
  service_id    uuid NOT NULL REFERENCES services(service_id),
  quantity      integer NOT NULL DEFAULT 1,
  price_at_booking numeric
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS services_studio_id_idx         ON services(studio_id);
CREATE INDEX IF NOT EXISTS package_services_package_id_idx ON package_services(package_id);
CREATE INDEX IF NOT EXISTS package_services_service_id_idx ON package_services(service_id);
CREATE INDEX IF NOT EXISTS booking_services_booking_id_idx ON booking_services(booking_id);
