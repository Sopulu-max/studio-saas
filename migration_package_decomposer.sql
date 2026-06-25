-- ============================================================
-- MIGRATION: Automatic Package Decomposer (Phase 2)
-- Run this AFTER migration_sessions_table.sql has been applied.
-- Targets ONLY legacy packages where package_services is empty.
-- Safe to re-run — all inserts are guarded against duplicates.
-- ============================================================

-- ─── Step 2A: Create base services from legacy package scalar fields ───────────
-- For each package with no linked services, extract the structural attributes
-- that were stored directly on the package (now deprecated) and create a proper
-- service from them. These are the packages that predate the service catalog.

INSERT INTO services (
  studio_id,
  name,
  type,
  description,
  category_value,
  session_type,
  outfits_count,
  duration_mins,
  price,
  is_active,
  display_order
)
SELECT
  p.studio_id,
  -- Name: use the package name + a suffix so it's clear this was auto-generated
  p.name || ' (Base)',
  'service',
  'Automatically created from legacy package: ' || p.name,
  -- category_value: map the old service_type column to the new field
  COALESCE(NULLIF(p.service_type, ''), 'photo'),
  -- session_type: carry forward, default to 'any' if missing
  COALESCE(NULLIF(p.session_type, ''), 'any'),
  p.outfits_count,
  p.duration_mins,
  -- price: use package base_price as the service standalone price
  COALESCE(p.base_price, 0),
  true,
  0
FROM packages p
WHERE
  -- Only target packages with no linked services
  NOT EXISTS (
    SELECT 1 FROM package_services ps WHERE ps.package_id = p.package_id
  )
  -- Only if there's structural data worth migrating
  AND (
    p.outfits_count IS NOT NULL
    OR p.duration_mins IS NOT NULL
    OR p.session_type IS NOT NULL
    OR p.service_type IS NOT NULL
    OR p.base_price IS NOT NULL
  )
  -- Guard: don't create a duplicate if we already made this service
  AND NOT EXISTS (
    SELECT 1 FROM services s
    WHERE s.studio_id = p.studio_id
      AND s.name = p.name || ' (Base)'
  );

-- ─── Step 2B: Link the new base services to their packages ────────────────────

INSERT INTO package_services (
  package_id,
  service_id,
  is_addon,
  addon_price,
  display_order
)
SELECT
  p.package_id,
  s.service_id,
  false,   -- is_addon = false: this is the included base service
  NULL,
  0
FROM packages p
JOIN services s
  ON s.studio_id = p.studio_id
  AND s.name = p.name || ' (Base)'
WHERE
  NOT EXISTS (
    SELECT 1 FROM package_services ps WHERE ps.package_id = p.package_id
  );

-- ─── Step 2C: Migrate legacy package_addons into the services catalog ──────────
-- package_addons are free-text addons that predate the service catalog.
-- We create proper services from them and link them as is_addon=true entries.

-- Step 2C.1: Create services from package_addons that don't already exist
INSERT INTO services (
  studio_id,
  name,
  type,
  description,
  price,
  is_active,
  display_order
)
SELECT DISTINCT ON (p.studio_id, pa.name)
  p.studio_id,
  pa.name,
  'service',
  pa.description,
  COALESCE(pa.price, 0),
  true,
  0
FROM package_addons pa
JOIN packages p ON p.package_id = pa.package_id
WHERE
  -- Guard: only create if a service with this name doesn't already exist for this studio
  NOT EXISTS (
    SELECT 1 FROM services s
    WHERE s.studio_id = p.studio_id
      AND s.name = pa.name
  );

-- Step 2C.2: Link the addon services to their packages via package_services
INSERT INTO package_services (
  package_id,
  service_id,
  is_addon,
  addon_price,
  display_order
)
SELECT
  pa.package_id,
  s.service_id,
  true,          -- is_addon = true: optional upgrade
  pa.price,      -- preserve the addon-specific price
  COALESCE(pa.display_order, 0)
FROM package_addons pa
JOIN packages p ON p.package_id = pa.package_id
JOIN services s ON s.studio_id = p.studio_id AND s.name = pa.name
WHERE
  NOT EXISTS (
    SELECT 1 FROM package_services ps
    WHERE ps.package_id = pa.package_id
      AND ps.service_id = s.service_id
  );

-- ─── Decomposer summary ───────────────────────────────────────────────────────
-- After running this, verify results with:
--
-- SELECT
--   p.name AS package_name,
--   COUNT(ps.service_id) AS linked_services
-- FROM packages p
-- LEFT JOIN package_services ps ON ps.package_id = p.package_id
-- GROUP BY p.package_id, p.name
-- ORDER BY linked_services ASC;
--
-- All packages should now show at least 1 linked service.
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
