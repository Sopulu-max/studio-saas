-- ─── Auto-Migrate Legacy Package Visual Data to Sections ─────────────────────
-- Run this in the Supabase SQL editor to convert existing visual data into new dynamic sections.

-- 1. Create a Hero section for any package that has a cover_url or tagline
INSERT INTO package_sections (
  section_id,
  package_id,
  title,
  body,
  image_url,
  video_url,
  layout,
  display_order,
  created_at
)
SELECT 
  gen_random_uuid(),
  package_id,
  name,                -- We inject the package name as the title of the Hero section
  tagline,             -- Tagline becomes the body of the Hero section
  cover_url,           -- Cover URL becomes the background image of the Hero section
  NULL,
  'hero',              -- Layout is Hero
  0,                   -- Display Order 0 (Top)
  now()
FROM packages
WHERE cover_url IS NOT NULL OR tagline IS NOT NULL
  AND tagline != '';

-- 2. Create a Standard section for any package that has a description
INSERT INTO package_sections (
  section_id,
  package_id,
  title,
  body,
  image_url,
  video_url,
  layout,
  display_order,
  created_at
)
SELECT 
  gen_random_uuid(),
  package_id,
  'About this package', -- Generic title for the description section
  description,          -- Description becomes the body text
  NULL,
  NULL,
  'standard',           -- Standard text layout
  1,                    -- Display Order 1 (Below Hero)
  now()
FROM packages
WHERE description IS NOT NULL
  AND description != '';

-- Note: We are keeping the actual `cover_url` and `description` columns in the `packages` table.
-- `cover_url` will now act purely as the "Thumbnail Image" for list views.
-- `description` will now act purely as the "Internal Summary" for bots and invoices.
-- The `tagline` column can be ignored or dropped in the future.
