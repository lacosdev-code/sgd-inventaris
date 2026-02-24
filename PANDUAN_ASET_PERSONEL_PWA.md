# Panduan Menampilkan "Aset Personel" di PWA Teknisi 🛠️

Karena repository PWA (`peminjaman`) terpisah dari Admin Web, Anda perlu menambahkan sedikit kode UI di PWA agar teknisi bisa melihat daftar "Aset Personel" (Toolkit Permanen) mereka saat login.

## Langkah 1: Jalankan SQL di Supabase
Saya telah membuatkan fungsi baru agar PWA bisa mengambil data aset personel. 
Buka **Supabase SQL Editor** dan jalankan isi file berikut yang baru saja saya buat di folder admin:
`migrations/pwa_get_assigned_assets.sql`

## Langkah 2: Update PWA (`page.tsx` atau Komponen Dashboard)
Buka project PWA Anda (`peminjaman.git`), lalu cari file Dashboard utama (biasanya di `src/app/page.tsx` atau `app/(dashboard)/page.tsx`).

Tambahkan state dan fungsi *fetching* ini di dalam komponen Dashboard:

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Sesuaikan path supabase client Anda

// ... di dalam komponen utama ...
const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
const [loadingAssets, setLoadingAssets] = useState(true);

useEffect(() => {
  // Panggil fungsi ini setelah berhasil login dan mendapatkan data teknisi
  const fetchAssignedAssets = async (techId: string) => {
    try {
      setLoadingAssets(true);
      const { data, error } = await supabase
        .rpc('get_assigned_assets', { p_tech_id: techId });

      if (error) throw error;
      setAssignedAssets(data || []);
    } catch (error) {
      console.error('Error fetching assigned assets:', error);
    } finally {
      setLoadingAssets(false);
    }
  };

  // Contoh pemanggilan (pastikan Anda punya state 'technician' dari sesi login)
  // if (technician?.id) {
  //   fetchAssignedAssets(technician.id);
  // }
}, [technician?.id]);
```

## Langkah 3: Tambahkan UI (Tampilan Kartu) di Dashboard
Di bagian JSX/Return di file yang sama, tambahkan blok UI ini di bawah (atau di atas) daftar "Pinjaman Aktif" Anda:

```tsx
{/* --- BAGIAN ASET PERSONEL (TOOLKIT) --- */}
<div className="mb-8">
  <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
    <span className="text-sgd-500">🧰</span> Kotak Perkakas Saya
  </h2>
  
  {loadingAssets ? (
    <div className="text-center text-slate-400 py-4 animate-pulse">Memuat alat...</div>
  ) : assignedAssets.length === 0 ? (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 text-center">
      <p className="text-slate-400 text-sm">Belum ada alat yang ditugaskan ke Anda.</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {assignedAssets.map((item) => (
        <div key={item.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 flex gap-4 items-center">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700 shrink-0">
            {item.foto_url ? (
              <img src={item.foto_url} alt={item.nama_barang} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-2xl">🔧</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-slate-100 font-semibold truncate">{item.nama_barang}</h3>
            <p className="text-xs text-slate-400 font-mono mt-1">{item.kode_alat}</p>
            <div className="mt-2 text-xs font-medium px-2 py-0.5 rounded-full w-fit bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Kondisi: {item.kondisi}
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

**Selesai!** 🚀 Setelah Anda memasukkan kode ini ke PWA, setiap teknisi yang login akan melihat semua alat yang ditugaskan kepada mereka langsung di dashboard HP mereka.
