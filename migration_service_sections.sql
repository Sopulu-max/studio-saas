-- ─── Service Sections ────────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor.
-- Mirrors package_sections for standalone service landing pages.

CREATE TABLE IF NOT EXISTS service_sections (
  section_id    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id    uuid        NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
  title         text        NOT NULL DEFAULT '',
  body          text,
  image_url     text,
  video_url     text,
  layout        text        NOT NULL DEFAULT 'standard',
  display_order integer     NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_sections_service_id_idx ON service_sections(service_id);
