-- Migration: Tabel Barang Masuk Sisa Proyek
-- Jalankan di Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.barang_masuk (
  id              SERIAL PRIMARY KEY,
  nama_barang     TEXT NOT NULL,
  jumlah          INTEGER NOT NULL DEFAULT 1,
  satuan          TEXT DEFAULT 'pcs',
  kondisi         TEXT DEFAULT 'Bagus',
  sumber_proyek   TEXT NOT NULL,
  lokasi_gudang   TEXT DEFAULT 'Gudang Utama',
  keterangan      TEXT,
  dibawa_oleh     TEXT,           -- orang yang mengantarkan barang dari proyek ke gudang
  diterima_oleh   TEXT,           -- orang yang menerima barang di gudang
  tanggal_masuk   DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'masuk_inventaris')),
  inventaris_id   INTEGER REFERENCES public.inventaris_utama(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add 'dibawa_oleh' column if it doesn't exist (for idempotency in case of schema evolution)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'barang_masuk' AND column_name = 'dibawa_oleh') THEN
        ALTER TABLE public.barang_masuk ADD COLUMN dibawa_oleh TEXT;
    END IF;
END
$$;

-- Index untuk performa query by status and tanggal
CREATE INDEX IF NOT EXISTS idx_barang_masuk_status ON public.barang_masuk(status);
CREATE INDEX IF NOT EXISTS idx_barang_masuk_tanggal ON public.barang_masuk(tanggal_masuk DESC);

-- RLS (Row Level Security) - biarkan semua operasi untuk anon key (bisa diperketat nanti)
ALTER TABLE public.barang_masuk ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists before recreating it for idempotency
DROP POLICY IF EXISTS "Allow all for anon" ON public.barang_masuk;
CREATE POLICY "Allow all for anon" ON public.barang_masuk
  FOR ALL USING (true) WITH CHECK (true);
