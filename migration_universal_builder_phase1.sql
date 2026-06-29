-- Phase 1: Core Data Engine & Universal Layouts

-- 1. Schema Registry
ALTER TABLE studios ADD COLUMN IF NOT EXISTS schema_registry JSONB DEFAULT '{}'::jsonb;

-- 2. Custom Fields for Core Entities
ALTER TABLE clients ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- 3. Universal Layouts Table
CREATE TABLE IF NOT EXISTS layouts (
  layout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(studio_id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'storefront', 'invoice_template', 'contract_template', 'email'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published'
  blocks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure RLS on layouts
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Layouts are viewable by public if published storefront"
ON layouts FOR SELECT
USING (
  type = 'storefront' AND status = 'published'
);

CREATE POLICY "Layouts are viewable by studio team"
ON layouts FOR SELECT
USING (
  studio_id IN (
    SELECT studio_id FROM staff WHERE user_id = auth.uid()
    UNION
    SELECT studio_id FROM studios WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Layouts are insertable by studio team"
ON layouts FOR INSERT
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM staff WHERE user_id = auth.uid()
    UNION
    SELECT studio_id FROM studios WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Layouts are updatable by studio team"
ON layouts FOR UPDATE
USING (
  studio_id IN (
    SELECT studio_id FROM staff WHERE user_id = auth.uid()
    UNION
    SELECT studio_id FROM studios WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Layouts are deletable by studio team"
ON layouts FOR DELETE
USING (
  studio_id IN (
    SELECT studio_id FROM staff WHERE user_id = auth.uid()
    UNION
    SELECT studio_id FROM studios WHERE owner_id = auth.uid()
  )
);
