-- Add assigned_to column to link assets to personnel (technicians)
ALTER TABLE public.inventaris_utama 
ADD COLUMN assigned_to UUID REFERENCES public.technicians(id) ON DELETE SET NULL;

-- Create an index to improve query performance when searching by technician
CREATE INDEX idx_inventaris_assigned_to ON public.inventaris_utama(assigned_to);

-- Note: RLS logic for SELECT is already handled by "Public can view tools" in fix_rls_anonymous.sql.
-- For UPDATE, admins currently have access. In the future, if technicians need to update inventaris_utama directly,
-- we can add an appropriate UPDATE policy. For reporting conditions, they might use the logs table instead.
