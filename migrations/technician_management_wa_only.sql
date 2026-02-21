-- ==========================================================
-- 👷 TECHNICIAN MANAGEMENT (ULTRA-SIMPLE: WA ONLY)
-- Purpose: Table and Auth Logic for WA-only Login
-- ==========================================================

-- 1. Create/Update Technicians Table
CREATE TABLE IF NOT EXISTS public.technicians (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    whatsapp_number TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Admins can manage technicians" ON public.technicians
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Public can view technician info for login" ON public.technicians
    FOR SELECT TO anon USING (true);

-- 4. Auth Function (RPC) - WA ONLY
CREATE OR REPLACE FUNCTION authenticate_technician(
    p_whatsapp TEXT
) RETURNS JSONB AS $$
DECLARE
    v_tech RECORD;
BEGIN
    SELECT * INTO v_tech 
    FROM public.technicians 
    WHERE whatsapp_number = p_whatsapp;

    IF v_tech.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'technician', jsonb_build_object(
                'id', v_tech.id,
                'name', v_tech.name,
                'whatsapp', v_tech.whatsapp_number
            )
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Nomor WA tidak terdaftar.');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
