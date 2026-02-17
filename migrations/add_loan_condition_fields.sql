-- Migration: Add Condition and Technician Fields to Peminjaman Table
-- Run this in Supabase SQL Editor

-- Add borrow-side fields
ALTER TABLE peminjaman 
ADD COLUMN IF NOT EXISTS teknisi_pinjam TEXT,
ADD COLUMN IF NOT EXISTS kondisi_pinjam TEXT;

-- foto_bukti_url already exists from previous work

-- Add return-side fields
ALTER TABLE peminjaman 
ADD COLUMN IF NOT EXISTS teknisi_kembali TEXT,
ADD COLUMN IF NOT EXISTS kondisi_kembali TEXT,
ADD COLUMN IF NOT EXISTS foto_kembali_url TEXT,
ADD COLUMN IF NOT EXISTS catatan_kembali TEXT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'peminjaman'
ORDER BY ordinal_position;
