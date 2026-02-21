-- Function: log_tool_handover
-- Purpose: Atomic transaction for decrementing/incrementing stock and logging the activity.
-- Author: Lead Architect

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
    -- 1. Get current item details and lock row
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
            RETURN jsonb_build_object('success', false, 'message', 'Stok habis! Tidak bisa meminjam alat ini.');
        END IF;
        v_new_stock := v_new_stock - 1;
    ELSE
        v_new_stock := v_new_stock + 1;
    END IF;

    -- 3. Update stock
    UPDATE public.inventaris_utama
    SET 
        jumlah_tersedia = v_new_stock,
        kondisi = CASE WHEN p_kondisi LIKE '%Rusak%' THEN p_kondisi ELSE kondisi END -- Update condition if damaged
    WHERE id = p_item_id;

    -- 4. Insert Activity Log
    INSERT INTO public.activity_logs (
        user_email,
        action,
        table_name,
        record_id,
        details
    ) VALUES (
        'System Tracker',
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

    -- 5. Insert into Gallery if photo exists
    IF p_photo_url IS NOT NULL AND p_photo_url != '' THEN
        INSERT INTO public.tool_images (tool_id, image_url)
        VALUES (p_item_id, p_photo_url);
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Transaksi Berhasil',
        'new_stock', v_new_stock,
        'log_id', v_log_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
