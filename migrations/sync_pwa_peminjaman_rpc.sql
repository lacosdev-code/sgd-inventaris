-- ==========================================================
-- 🔄 PWA & WEB ADMIN SYNCHRONIZATION SCRIPT
-- Purpose: Upgrade `log_tool_handover` RPC to sync with `peminjaman` table.
-- ==========================================================

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
    v_loan_id INT;
BEGIN
    -- 1. Get current item details
    SELECT nama, jumlah_tersedia INTO v_item_name, v_new_stock
    FROM public.inventaris_utama
    WHERE id = p_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Alat tidak ditemukan.');
    END IF;

    -- 2. Calculate Stock & Handle Peminjaman Table Logic
    IF p_tipe = 'Pinjam' THEN
        -- Validation
        IF v_new_stock <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Stok habis!');
        END IF;

        -- Decrease Stock
        v_new_stock := v_new_stock - 1;

        -- Create entry in `peminjaman` table
        INSERT INTO public.peminjaman (
            barang_id,
            barang_nama,
            peminjam,
            teknisi_pinjam,
            tgl_pinjam,
            tgl_kembali_rencana,
            status,
            kondisi_pinjam,
            foto_bukti_url,
            catatan
        ) VALUES (
            p_item_id,
            v_item_name,
            'PWA Tech: ' || p_teknisi,      -- Default identifier for PWA loans
            p_teknisi,
            NOW(),
            NOW() + INTERVAL '7 days',      -- Default 7 day return expectation
            'dipinjam',                     -- Active status
            p_kondisi,
            p_photo_url,
            p_catatan
        ) RETURNING id INTO v_loan_id;

    ELSE
        -- Type: 'Kembali'
        -- Increase Stock
        v_new_stock := v_new_stock + 1;

        -- Find the active loan for this item handled by this technician or generally active
        SELECT id INTO v_loan_id
        FROM public.peminjaman
        WHERE barang_id = p_item_id AND status = 'dipinjam'
        ORDER BY tgl_pinjam ASC  -- fulfill the oldest loan first
        LIMIT 1;

        -- If an active loan is found, close it
        IF FOUND THEN
            UPDATE public.peminjaman
            SET 
                status = 'kembali',
                tgl_kembali_aktual = NOW(),
                teknisi_kembali = p_teknisi,
                kondisi_kembali = p_kondisi,
                foto_kembali_url = p_photo_url,
                catatan_kembali = p_catatan
            WHERE id = v_loan_id;
        END IF;
    END IF;

    -- 3. Update Master Stock
    UPDATE public.inventaris_utama
    SET 
        jumlah_tersedia = v_new_stock,
        kondisi = CASE WHEN p_kondisi LIKE '%Rusak%' THEN p_kondisi ELSE kondisi END
    WHERE id = p_item_id;

    -- 4. Insert standard Activity Log
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
            'peminjaman_id', v_loan_id, -- Keep reference to loan id
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
        'message', 'Handover Recorded and Synced',
        'new_stock', v_new_stock
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
