-- ==========================================================
-- 🔓 FIX: ALLOW ANONYMOUS ACCESS (READ-ONLY)
-- Run this in Supabase SQL Editor to allow viewing data without login
-- ==========================================================

-- 1. Drop old restrictive policies
DROP POLICY IF EXISTS "Technicians can view tools" ON public.inventaris_utama;
DROP POLICY IF EXISTS "Technicians can view logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Technicians can view images" ON public.tool_images;

-- 2. Create new policies that allow BOTH anon (public) and authenticated users to VIEW
CREATE POLICY "Public can view tools" ON public.inventaris_utama
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can view logs" ON public.activity_logs
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can view images" ON public.tool_images
    FOR SELECT TO anon, authenticated USING (true);

-- 3. Allow Anyone to trigger the Handover RPC (Security Definer handles the actual update)
-- No changes needed to the function itself, but ensure public can execute it.
GRANT EXECUTE ON FUNCTION public.log_tool_handover TO anon, authenticated;
