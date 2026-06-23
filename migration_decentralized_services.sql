-- Migration: Decentralized Service Configurations
-- Adds custom booking fields to services and custom answers to bookings.

-- 1. Add `booking_fields` to `services`
-- This JSONB array will store the custom questions asked when this service is booked.
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_fields jsonb DEFAULT '[]'::jsonb;

-- 2. Add `custom_answers` to `bookings`
-- This JSONB object will store the client's answers to the custom questions.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS custom_answers jsonb DEFAULT '{}'::jsonb;

-- 3. We do not need to drop `category_value` on `services` as it is now used as a free-text string.
-- We also keep `service_types` on `studios` for now (it will just be ignored by the UI) to avoid destructive data loss.
