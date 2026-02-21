-- ==========================================================
-- 🔓 RLS POLICY UPDATE: ENABLE ANONYMOUS/TECH ACCESS
-- Purpose: Allow technicians (who use WA login) to read catalog
-- ==========================================================

-- 1. Allow 'anon' role to view tools (for the catalog view)
ALTER POLICY "Technicians can view tools" ON public.inventaris_utama 
TO anon, authenticated;

-- 2. Allow 'anon' role to view activity logs
ALTER POLICY "Technicians can view logs" ON public.activity_logs 
TO anon, authenticated;

-- 3. Allow 'anon' role to insert activity logs (during handover)
ALTER POLICY "Technicians can insert logs" ON public.activity_logs 
TO anon, authenticated;

-- 4. Allow 'anon' role to manage images
ALTER POLICY "Technicians can view images" ON public.tool_images 
TO anon, authenticated;

ALTER POLICY "Technicians can insert images" ON public.tool_images 
TO anon, authenticated;

-- 5. Final check for technicians table (to verify WA during login)
-- (Already handled in previous migration, but ensuring public can read for auth)
ALTER POLICY "Public can view technician info for login" ON public.technicians 
TO anon, authenticated;
