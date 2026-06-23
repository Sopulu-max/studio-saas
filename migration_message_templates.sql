CREATE TABLE public.message_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID NOT NULL REFERENCES public.studios(studio_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own studio message templates"
    ON public.message_templates
    FOR ALL
    USING (
        studio_id IN (
            SELECT studio_id FROM public.staff WHERE user_id = auth.uid()
        )
    );
