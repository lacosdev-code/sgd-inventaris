-- 🔍 DATA HEALTH CHECK: TECHNICIAN SYNC
-- Run these queries to identify why assets are not appearing in the PWA.

-- A. FIND ORPHANED ASSIGNMENTS
-- Assignments that are not linked to a technician ID (PWA won't show these)
SELECT orang as "Personnel Name", nama as "Asset Name", COUNT(*) as "Count"
FROM public.inventaris_orang
WHERE technician_id IS NULL
GROUP BY orang, nama;

-- B. FIND MISSING ASSET LINKS
-- Assets in 'inventaris_utama' that don't have an 'assigned_to' ID
-- even though they appear in 'inventaris_orang'
SELECT iu.nama as "Asset Name", io.orang as "Assigned To (Name)", io.technician_id as "Linked Tech ID"
FROM public.inventaris_utama iu
JOIN public.inventaris_orang io ON TRIM(LOWER(iu.nama)) = TRIM(LOWER(io.nama))
WHERE iu.assigned_to IS NULL AND io.technician_id IS NOT NULL;

-- C. CHECK SUNAR / SUBAR PROFILES
-- Check if they have duplicate accounts or special characters in names
SELECT id, name, whatsapp_number, avatar_url
FROM public.technicians
WHERE TRIM(LOWER(name)) LIKE '%sunar%' OR TRIM(LOWER(name)) LIKE '%subar%';

-- D. CHECK FOR ASSETS WITH SAME NAMES (Potential sync collisions)
SELECT TRIM(LOWER(nama)) as "Asset Name", COUNT(*) as "Row Count"
FROM public.inventaris_utama
GROUP BY TRIM(LOWER(nama))
HAVING COUNT(*) > 1;

-- 🚀 PROJECTED FIX: SYNC BY ID (Recommended after running fix_sync_id_based.sql)
-- UPDATE public.inventaris_utama iu
-- SET assigned_to = io.technician_id
-- FROM public.inventaris_orang io
-- WHERE iu.id = io.asset_id
-- AND io.technician_id IS NOT NULL;
