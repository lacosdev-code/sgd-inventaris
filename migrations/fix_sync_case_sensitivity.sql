-- ==========================================================
-- 🔄 IMPROVED SYNC: CASE-INSENSITIVE MATCHING
-- Purpose: Ensure synchronization works even if there are 
-- capitalization differences (e.g., 'Sunar' vs 'sunar')
-- ==========================================================

-- 1. Update function with LOWER() comparison
CREATE OR REPLACE FUNCTION sync_personnel_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_tech_id UUID;
BEGIN
    -- Try to find technician ID if not provided (CASE-INSENSITIVE + TRIM)
    IF NEW.technician_id IS NULL THEN
        SELECT id INTO v_tech_id 
        FROM public.technicians 
        WHERE TRIM(LOWER(name)) = TRIM(LOWER(NEW.orang)) 
        LIMIT 1;
        
        NEW.technician_id := v_tech_id;
    END IF;

    -- If we have a technician ID, update the master asset table
    -- Using case-insensitive match for asset name as well
    IF NEW.technician_id IS NOT NULL THEN
        UPDATE public.inventaris_utama
        SET assigned_to = NEW.technician_id
        WHERE TRIM(LOWER(nama)) = TRIM(LOWER(NEW.nama));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Initial Sync: Fix existing records with case-insensitive + trim matching
UPDATE public.inventaris_orang io
SET technician_id = t.id
FROM public.technicians t
WHERE TRIM(LOWER(io.orang)) = TRIM(LOWER(t.name))
AND io.technician_id IS NULL;

-- 3. Update master inventory based on the linked personnel
UPDATE public.inventaris_utama iu
SET assigned_to = io.technician_id
FROM public.inventaris_orang io
WHERE TRIM(LOWER(iu.nama)) = TRIM(LOWER(io.nama))
AND io.technician_id IS NOT NULL;
