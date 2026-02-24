# Panduan Kelola 2 Repository (Admin Web & PWA) 🚀

Karena sistem Anda menggunakan arsitektur **"1 Database, 2 Frontends, 2 Github"**, Anda perlu memberikan instruksi yang spesifik saat berinteraksi dengan AI (seperti Cursor) agar mereka tidak bingung.

## 1. Apa yang harus diisi di GitHub `peminjaman.git`?
Di bagian deskripsi repository (About), masukkan ini:
> "Sistem PWA (Technician Portal) untuk PT. Sunggiardi. Berfungsi sebagai frontend operasional lapangan untuk memproses peminjaman dan pengembalian alat secara real-time. Terkoneksi ke Shared Supabase Database yang sama dengan Admin Dashboard."

---

## 2. Cara Memberi Tugas ke Cursor (Untuk PWA)
Jika Anda membuka folder PWA di Cursor, gunakan **"System Prompt"** atau awal chat seperti ini agar AI mengerti konteksnya:

> "Ini adalah project **Technician Portal (PWA)** PT. Sunggiardi.
> **PENTING:** Project ini berbagi Database Supabase yang sama dengan project **Admin Web**.
> 
> **Aturan Main Berbagi Database:**
> 1. CRUD utama (Peminjaman/Pengembalian) di PWA ini harus memanggil RPC `log_tool_handover` agar sinkron dengan Admin.
> 2. PWA fokus pada User Experience (UX) lapangan: Mobile-first, QR Scan, dan Upload Foto bukti.
> 3. Data teknisi diambil dari tabel `technicians`, dan status pinjaman diambil dari tabel `peminjaman`."

---

## 3. Struktur Repository Anda Saat Ini
Berikut adalah "Peta" sistem Anda agar Anda bisa menjelaskan ke siapapun:

| Komponen | Repository Github | Peran Utama |
| :--- | :--- | :--- |
| **Admin Web** | `sgd-inventaris-management` | Manajemen Master Data, Approval, & Laporan (PDF/Excel) |
| **PWA Peminjaman** | `peminjaman` | Operasional Teknisi, Scan QR, & Laporan Kondisi Lapangan |
| **Database** | (Supabase Shared) | Sumber kebenaran data tunggal untuk kedua frontend di atas |

## 4. Tips Git Push
Saat Anda ingin push ke repository PWA (`peminjaman.git`), gunakan langkah ini:
```bash
git add .
git commit -m "feat: implement synced dashboard, avatar support, and premium branding"
git push origin main
```
*(Pastikan `origin` sudah mengarah ke link github.com/lacosdev-code/peminjaman.git)*
