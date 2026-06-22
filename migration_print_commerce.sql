-- ==============================================================================
-- Print Commerce Architecture Migration
-- Adds products, variants, and frame templates for the mock-up generator.
-- ==============================================================================

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES studios(studio_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'frame', 'print', 'canvas', 'album'
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
    variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    size_label TEXT NOT NULL, -- e.g., '8x10', '16x20'
    price_adjustment DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Frame Templates Table (for Mock-up Generator)
CREATE TABLE IF NOT EXISTS frame_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES studios(studio_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    overlay_image_url TEXT NOT NULL, -- URL to the transparent PNG of the frame
    mask_css TEXT, -- e.g., "top: 10%; left: 15%; width: 70%; height: 80%;"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Extend existing print_order_items safely
ALTER TABLE print_order_items 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(product_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(variant_id) ON DELETE SET NULL;

-- ==============================================================================
-- Row Level Security (RLS)
-- ==============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_templates ENABLE ROW LEVEL SECURITY;

-- Products Policies
DROP POLICY IF EXISTS "Users can view products for their studios" ON products;
CREATE POLICY "Users can view products for their studios" ON products
    FOR ALL USING (studio_id IN (
        SELECT studio_id FROM team_members WHERE user_id = auth.uid()
        UNION
        SELECT studio_id FROM studios WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products" ON products
    FOR SELECT USING (is_active = true);

-- Product Variants Policies
DROP POLICY IF EXISTS "Users can view variants for their studios" ON product_variants;
CREATE POLICY "Users can view variants for their studios" ON product_variants
    FOR ALL USING (product_id IN (
        SELECT product_id FROM products WHERE studio_id IN (
            SELECT studio_id FROM team_members WHERE user_id = auth.uid()
            UNION
            SELECT studio_id FROM studios WHERE user_id = auth.uid()
        )
    ));

DROP POLICY IF EXISTS "Public can view active variants" ON product_variants;
CREATE POLICY "Public can view active variants" ON product_variants
    FOR SELECT USING (product_id IN (SELECT product_id FROM products WHERE is_active = true));

-- Frame Templates Policies
DROP POLICY IF EXISTS "Users can view templates for their studios" ON frame_templates;
CREATE POLICY "Users can view templates for their studios" ON frame_templates
    FOR ALL USING (studio_id IN (
        SELECT studio_id FROM team_members WHERE user_id = auth.uid()
        UNION
        SELECT studio_id FROM studios WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Public can view templates" ON frame_templates;
CREATE POLICY "Public can view templates" ON frame_templates
    FOR SELECT USING (true);
