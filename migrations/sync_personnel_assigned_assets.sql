-- ==========================================================
-- 🔄 SYNC INVENTARIS ORANG WITH PWA ASSIGNED ASSETS
-- Purpose: Link 'inventaris_orang' table with 'technicians' table
-- and auto-sync with 'inventaris_utama.assigned_to'
-- ==========================================================

-- 1. Add technician_id to inventaris_orang to formalize the link
ALTER TABLE public.inventaris_orang 
ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL;

-- 2. Create function to sync assignment to inventaris_utama
CREATE OR REPLACE FUNCTION sync_personnel_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_tech_id UUID;
BEGIN
    -- Try to find technician ID if not provided (fallback by name)
    IF NEW.technician_id IS NULL THEN
        SELECT id INTO v_tech_id FROM public.technicians WHERE name = NEW.orang LIMIT 1;
        NEW.technician_id := v_tech_id;
    END IF;

    -- If we have a technician ID, update the master asset table
    -- This assumes 'nama' in inventaris_orang matches 'nama' in inventaris_utama
    IF NEW.technician_id IS NOT NULL THEN
        UPDATE public.inventaris_utama
        SET assigned_to = NEW.technician_id
        WHERE nama = NEW.nama;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS tr_sync_personnel_assignment ON public.inventaris_orang;
CREATE TRIGGER tr_sync_personnel_assignment
BEFORE INSERT OR UPDATE ON public.inventaris_orang
FOR EACH ROW EXECUTE FUNCTION sync_personnel_assignment();

-- 4. Initial Sync: Update existing technician_ids based on name
UPDATE public.inventaris_orang io
SET technician_id = t.id
FROM public.technicians t
WHERE io.orang = t.name
AND io.technician_id IS NULL;

-- 5. Initial Sync: Update inventaris_utama.assigned_to based on current data
UPDATE public.inventaris_utama iu
SET assigned_to = io.technician_id
FROM public.inventaris_orang io
WHERE iu.nama = io.nama
AND io.technician_id IS NOT NULL;
