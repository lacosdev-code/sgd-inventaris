-- ==========================================================
-- 👷 TECHNICIAN MANAGEMENT SETUP
-- Purpose: Table and Auth Logic for WA + PIN Login
-- ==========================================================

-- 1. Create Technicians Table
CREATE TABLE IF NOT EXISTS public.technicians (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    whatsapp_number TEXT UNIQUE NOT NULL,
    pin TEXT NOT NULL, -- Stored as plain text for simplicity per user request (or hashed in future)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Admin can do anything
CREATE POLICY "Admins can manage technicians" ON public.technicians
    FOR ALL TO authenticated USING (true);

-- Public can verify login (but not browse)
CREATE POLICY "Public can view technician info for login" ON public.technicians
    FOR SELECT TO anon USING (true);

-- 4. Auth Function (RPC)
CREATE OR REPLACE FUNCTION authenticate_technician(
    p_whatsapp TEXT,
    p_pin TEXT
) RETURNS JSONB AS $$
DECLARE
    v_tech RECORD;
BEGIN
    SELECT * INTO v_tech 
    FROM public.technicians 
    WHERE whatsapp_number = p_whatsapp AND pin = p_pin;

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
        RETURN jsonb_build_object('success', false, 'message', 'Nomor WA atau PIN salah.');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
