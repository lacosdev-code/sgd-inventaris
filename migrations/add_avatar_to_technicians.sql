-- ==========================================================
-- 🖼️ ADD AVATAR SUPPORT TO TECHNICIANS
-- Purpose: Store profile picture URLs for personnel
-- ==========================================================

-- 1. Add avatar_url column
ALTER TABLE public.technicians 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Update RLS (if needed, though 'FOR ALL' already covers admins)
-- The existing policy for admins is:
-- CREATE POLICY "Admins can manage technicians" ON public.technicians 
-- FOR ALL TO authenticated USING (true);
-- So no changes needed for admin access to the new column.
