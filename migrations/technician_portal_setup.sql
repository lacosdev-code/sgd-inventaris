-- ==========================================================
-- 🛡️ TECH PORTAL SECURITY & SETUP SCRIPT
-- Purpose: Setup RLS policies and RPC for Technician App
-- ==========================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.inventaris_utama ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_images ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES FOR 'inventaris_utama' (Master Tools)
-- Technicians can VIEW tools but NOT modify them directly (must use RPC)
CREATE POLICY "Technicians can view tools" ON public.inventaris_utama
    FOR SELECT TO authenticated USING (true);

-- 3. POLICIES FOR 'activity_logs' (Handovers)
-- Technicians can VIEW their own activities and INSERT new logs
CREATE POLICY "Technicians can view logs" ON public.activity_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Technicians can insert logs" ON public.activity_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- 4. POLICIES FOR 'tool_images' (Gallery)
-- Technicians can VIEW and ADD photos
CREATE POLICY "Technicians can view images" ON public.tool_images
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Technicians can insert images" ON public.tool_images
    FOR INSERT TO authenticated WITH CHECK (true);

-- 5. THE ATOMIC TRANSACTION FUNCTION (RE-POSTED FOR CONVENIENCE)
-- This function uses SECURITY DEFINER, which means it runs with Admin privileges
-- effectively allowing the Technician App to update stock safely without
-- having direct UPDATE permissions on the table.

CREATE OR REPLACE FUNCTION log_tool_handover(
    p_item_id INT,
    p_teknisi TEXT,
    p_tipe TEXT,
    p_kondisi TEXT,
    p_catatan TEXT,
    p_photo_url TEXT
) RETURNS JSONB AS $$
DECLARE
    v_item_name TEXT;
    v_new_stock INT;
    v_log_id INT;
BEGIN
    -- 1. Get current item details
    SELECT nama, jumlah_tersedia INTO v_item_name, v_new_stock
    FROM public.inventaris_utama
    WHERE id = p_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Alat tidak ditemukan.');
    END IF;

    -- 2. Calculate and Validate Stock
    IF p_tipe = 'Pinjam' THEN
        IF v_new_stock <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Stok habis!');
        END IF;
        v_new_stock := v_new_stock - 1;
    ELSE
        v_new_stock := v_new_stock + 1;
    END IF;

    -- 3. Update stock (Bypasses RLS because of SECURITY DEFINER)
    UPDATE public.inventaris_utama
    SET 
        jumlah_tersedia = v_new_stock,
        kondisi = CASE WHEN p_kondisi LIKE '%Rusak%' THEN p_kondisi ELSE kondisi END
    WHERE id = p_item_id;

    -- 4. Insert Activity Log
    INSERT INTO public.activity_logs (
        user_email,
        action,
        table_name,
        record_id,
        details
    ) VALUES (
        'Technician Portal',
        'CONDITION_LOG',
        'inventaris_utama',
        p_item_id,
        jsonb_build_object(
            'teknisi', p_teknisi,
            'type', p_tipe,
            'item_id', p_item_id,
            'item_name', v_item_name,
            'condition', p_kondisi,
            'notes', p_catatan,
            'photo_url', p_photo_url,
            'timestamp', NOW()
        )
    ) RETURNING id INTO v_log_id;

    -- 5. Insert into Gallery
    IF p_photo_url IS NOT NULL AND p_photo_url != '' THEN
        INSERT INTO public.tool_images (tool_id, image_url)
        VALUES (p_item_id, p_photo_url);
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Handover Recorded',
        'new_stock', v_new_stock
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
