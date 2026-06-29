-- Ecosystem Public Identity Expansion
-- Adds explicit opt-in visibility flags and public-facing overrides.

-- 1. Packages
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS public_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS public_description TEXT,
ALTER COLUMN is_public SET DEFAULT false;

-- Ensure existing packages without is_public set are hidden by default
UPDATE packages SET is_public = false WHERE is_public IS NULL;

-- 2. Staff (Team)
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS public_bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512);

-- 3. Galleries (Portfolio)
-- Adding explicit is_public for storefront portfolio display (distinct from shared_link which is for the specific client)
ALTER TABLE galleries
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
