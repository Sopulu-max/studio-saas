-- ============================================================
-- MIGRATION — WhatsApp Message Bus
-- ============================================================

-- 1. Add WhatsApp credentials to studios table
ALTER TABLE studios ADD COLUMN IF NOT EXISTS wa_phone_number_id TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS wa_access_token TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS wa_verify_token TEXT;

-- 2. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES studios(studio_id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(client_id) ON DELETE SET NULL,
    client_phone TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(studio_id, client_phone) -- A studio has one continuous conversation thread per phone number
);

-- Enable RLS on conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view conversations for their studios" ON conversations;
CREATE POLICY "Users can view conversations for their studios" 
ON conversations FOR SELECT 
USING (studio_id IN (
    SELECT studio_id FROM studios WHERE owner_id = auth.uid()
    UNION
    SELECT studio_id FROM staff WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert conversations for their studios" ON conversations;
CREATE POLICY "Users can insert conversations for their studios" 
ON conversations FOR INSERT 
WITH CHECK (studio_id IN (
    SELECT studio_id FROM studios WHERE owner_id = auth.uid()
    UNION
    SELECT studio_id FROM staff WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update conversations for their studios" ON conversations;
CREATE POLICY "Users can update conversations for their studios" 
ON conversations FOR UPDATE 
USING (studio_id IN (
    SELECT studio_id FROM studios WHERE owner_id = auth.uid()
    UNION
    SELECT studio_id FROM staff WHERE user_id = auth.uid()
));

-- 3. Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('received', 'sent', 'delivered', 'read', 'failed')),
    external_id TEXT, -- e.g., WhatsApp message ID for tracking delivery
    requires_verification BOOLEAN NOT NULL DEFAULT FALSE, -- for payment proofs
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages for their studios" ON messages;
CREATE POLICY "Users can view messages for their studios" 
ON messages FOR SELECT 
USING (conversation_id IN (
    SELECT id FROM conversations WHERE studio_id IN (
        SELECT studio_id FROM studios WHERE owner_id = auth.uid()
        UNION
        SELECT studio_id FROM staff WHERE user_id = auth.uid()
    )
));

DROP POLICY IF EXISTS "Users can insert messages for their studios" ON messages;
CREATE POLICY "Users can insert messages for their studios" 
ON messages FOR INSERT 
WITH CHECK (conversation_id IN (
    SELECT id FROM conversations WHERE studio_id IN (
        SELECT studio_id FROM studios WHERE owner_id = auth.uid()
        UNION
        SELECT studio_id FROM staff WHERE user_id = auth.uid()
    )
));

DROP POLICY IF EXISTS "Users can update messages for their studios" ON messages;
CREATE POLICY "Users can update messages for their studios" 
ON messages FOR UPDATE 
USING (conversation_id IN (
    SELECT id FROM conversations WHERE studio_id IN (
        SELECT studio_id FROM studios WHERE owner_id = auth.uid()
        UNION
        SELECT studio_id FROM staff WHERE user_id = auth.uid()
    )
));

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';
