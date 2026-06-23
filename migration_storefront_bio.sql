-- Add bio column for the studio storefront
ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS bio TEXT;
