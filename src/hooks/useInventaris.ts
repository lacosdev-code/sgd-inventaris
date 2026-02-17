import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import Swal from 'sweetalert2';

export interface InventarisItem {
  id?: number;
  nama: string;
  jumlah: number;
  jumlah_tersedia: number;
  kondisi: string;
  lokasi: string;
  kode_alat: string;
  foto_url?: string;
}

export const useInventaris = () => {
  const [items, setItems] = useState<InventarisItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fungsi Ambil Data (Read)
  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventaris_utama')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fungsi Simpan/Update (Upsert)
  const upsertItem = async (item: InventarisItem) => {
    try {
      const { error } = await supabase
        .from('inventaris_utama')
        .upsert({
          nama: item.nama,
          jumlah: item.jumlah,
          jumlah_tersedia: item.jumlah_tersedia,
          kondisi: item.kondisi,
          lokasi: item.lokasi,
          kode_alat: item.kode_alat
        }, { onConflict: 'kode_alat' });

      if (error) throw error;
      
      Swal.fire('Berhasil!', 'Data inventaris telah diperbarui.', 'success');
      await fetchItems(); // Refresh data
    } catch (error: any) {
      Swal.fire('Gagal!', error.message, 'error');
    }
  };

  // 3. Fungsi Hapus (Delete)
  const deleteItem = async (id: number) => {
    try {
      const result = await Swal.fire({
        title: 'Hapus Item?',
        text: "Data tidak bisa dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, hapus!'
      });

      if (result.isConfirmed) {
        const { error } = await supabase
          .from('inventaris_utama')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setItems(items.filter(item => item.id !== id));
        Swal.fire('Terhapus!', 'Item berhasil dihapus.', 'success');
      }
    } catch (error: any) {
      Swal.fire('Error!', error.message, 'error');
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return { items, loading, upsertItem, deleteItem, refresh: fetchItems };
};