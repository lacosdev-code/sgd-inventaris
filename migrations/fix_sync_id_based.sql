-- ==========================================================
-- 🛠️ ROBUST SYNC: ID-BASED LINKING
-- Purpose: Move away from name-based matching between 
-- 'inventaris_orang' and 'inventaris_utama'
-- ==========================================================

-- 1. Add asset_id column to inventaris_orang
ALTER TABLE public.inventaris_orang 
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.inventaris_utama(id) ON DELETE SET NULL;

-- 2. Update existing data: Try to find asset_id by name (Best effort)
UPDATE public.inventaris_orang io
SET asset_id = iu.id
FROM public.inventaris_utama iu
WHERE TRIM(LOWER(io.nama)) = TRIM(LOWER(iu.nama))
AND io.asset_id IS NULL;

-- 3. Improve sync function to use asset_id
CREATE OR REPLACE FUNCTION sync_personnel_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_tech_id UUID;
BEGIN
    -- A. Find Technician ID if missing (fallback by name)
    IF NEW.technician_id IS NULL THEN
        SELECT id INTO v_tech_id 
        FROM public.technicians 
        WHERE TRIM(LOWER(name)) = TRIM(LOWER(NEW.orang)) 
        LIMIT 1;
        
        NEW.technician_id := v_tech_id;
    END IF;

    -- B. Update inventaris_utama.assigned_to
    -- Priority 1: Use direct asset_id if provided
    IF NEW.asset_id IS NOT NULL AND NEW.technician_id IS NOT NULL THEN
        UPDATE public.inventaris_utama
        SET assigned_to = NEW.technician_id
        WHERE id = NEW.asset_id;
    -- Priority 2: Fallback to name-based matching (for legacy or bulk inserts)
    ELSIF NEW.technician_id IS NOT NULL THEN
        UPDATE public.inventaris_utama
        SET assigned_to = NEW.technician_id
        WHERE TRIM(LOWER(nama)) = TRIM(LOWER(NEW.nama));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
