-- ==========================================================
-- 🛠️ PWA: Dapatkan Aset Personel (Toolkit)
-- Purpose: Fungsi untuk PWA mengambil daftar aset yang
--          ditugaskan (permanen) ke Teknisi dari tabel inventaris_orang
-- FIXED: Now queries inventaris_orang (not inventaris_utama.assigned_to)
-- ==========================================================

-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS get_assigned_assets(UUID);

CREATE OR REPLACE FUNCTION get_assigned_assets(p_tech_id UUID)
RETURNS TABLE (
    id INT,
    kode_alat TEXT,
    nama_barang TEXT,
    kondisi TEXT,
    foto_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        io.id,
        COALESCE(iu.kode_alat, '') AS kode_alat,
        io.nama_barang,
        io.kondisi,
        COALESCE(iu.foto_url, '') AS foto_url
    FROM 
        public.inventaris_orang io
    LEFT JOIN
        public.inventaris_utama iu ON io.asset_id = iu.id
    WHERE 
        io.technician_id = p_tech_id
    ORDER BY io.nama_barang ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
