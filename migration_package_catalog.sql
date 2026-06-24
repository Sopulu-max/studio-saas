-- ============================================================
-- Package Catalog — Phase 1 schema additions
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. New columns on the packages table
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS cover_url     text,
  ADD COLUMN IF NOT EXISTS tagline       text,
  ADD COLUMN IF NOT EXISTS is_public     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_order integer  NOT NULL DEFAULT 0;

-- 2. Rich content sections (one package → many sections)
CREATE TABLE IF NOT EXISTS package_sections (
  section_id    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id    uuid        NOT NULL REFERENCES packages(package_id) ON DELETE CASCADE,
  title         text        NOT NULL DEFAULT '',
  body          text,
  image_url     text,
  video_url     text,
  layout        text        NOT NULL DEFAULT 'standard',
  display_order integer     NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- ADD COLUMN IF NOT EXISTS for layout (in case the table already exists)
ALTER TABLE package_sections ADD COLUMN IF NOT EXISTS layout text NOT NULL DEFAULT 'standard';

-- 3. Typed inclusions — what's in the box (service / product / digital)
--    (distinct from the existing `inclusions` text[] bullet list)
CREATE TABLE IF NOT EXISTS package_inclusions (
  inclusion_id  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id    uuid    NOT NULL REFERENCES packages(package_id) ON DELETE CASCADE,
  label         text    NOT NULL,
  type          text    NOT NULL DEFAULT 'service'
                        CHECK (type IN ('service', 'product', 'digital')),
  display_order integer NOT NULL DEFAULT 0
);

-- 4. Enable RLS on new tables (matching existing tables' security model)
ALTER TABLE package_sections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_inclusions ENABLE ROW LEVEL SECURITY;

-- 5. Policies — studio members may read/write their own studio's data
--    (adjust if your policies use a different helper function)

-- package_sections
CREATE POLICY IF NOT EXISTS "studio members can manage package sections"
  ON package_sections
  USING (
    package_id IN (
      SELECT package_id FROM packages
      WHERE studio_id IN (
        SELECT studio_id FROM studios WHERE owner_id = auth.uid()
        UNION
        SELECT studio_id FROM staff WHERE user_id = auth.uid()
      )
    )
  );

-- package_inclusions
CREATE POLICY IF NOT EXISTS "studio members can manage package inclusions"
  ON package_inclusions
  USING (
    package_id IN (
      SELECT package_id FROM packages
      WHERE studio_id IN (
        SELECT studio_id FROM studios WHERE owner_id = auth.uid()
        UNION
        SELECT studio_id FROM staff WHERE user_id = auth.uid()
      )
    )
  );
