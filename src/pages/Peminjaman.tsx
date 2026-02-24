import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadImage } from '../services/imagekit';

import {
  FaExchangeAlt,
  FaHistory,
  FaClock,
  FaCheckCircle,
  FaPlus,
  FaSearch,
  FaBoxOpen,
  FaMapMarkerAlt,
  FaBarcode,
  FaChevronRight
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const Peminjaman = () => {
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'loan'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Ambil data peminjaman yang masih berstatus 'dipinjam'
      const { data: loans } = await supabase
        .from('peminjaman')
        .select('*')
        .eq('status', 'dipinjam')
        .order('tgl_pinjam', { ascending: false });

      // Ambil semua barang yang aktif (tidak terhapus)
      const { data: items } = await supabase
        .from('inventaris_utama')
        .select('id, nama, kode_alat, jumlah_tersedia, lokasi, kondisi, foto_url')
        .eq('is_deleted', false)
        .order('nama', { ascending: true });

      setActiveLoans(loans || []);
      setAvailableItems(items || []);
    } catch (error: any) {
      console.error(error.message);
      setActiveLoans([]);
      setAvailableItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePinjamModal = async (preselectedItem?: any) => {
    const itemsToBorrow = availableItems.filter(i => i.jumlah_tersedia > 0);

    // If no preselected item and no items available at all
    if (!preselectedItem && itemsToBorrow.length === 0) {
      Swal.fire('Stok Kosong', 'Tidak ada barang yang tersedia untuk dipinjam saat ini.', 'warning');
      return;
    }

    const itemOptions = itemsToBorrow.map(item =>
      `<option value="${item.id}" ${preselectedItem?.id === item.id ? 'selected' : ''}>${item.nama} ${item.lokasi ? `📍 ${item.lokasi}` : ''} (Sisa: ${item.jumlah_tersedia})</option>`
    ).join('');

    await Swal.fire({
      title: '<span class="text-[#013220] font-bold uppercase tracking-tight">Form Peminjaman Alat</span>',
      html: `
        <div class="flex flex-col gap-4 text-left p-2">
          <div class="space-y-1">
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pilih Barang</label>
            <select id="sw-item" class="swal2-input w-full m-0 mt-1 border-2 border-slate-100 rounded-xl focus:border-[#013220] outline-none font-bold text-slate-700">
              ${itemOptions}
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nama Peminjam</label>
            <input id="sw-peminjam" class="swal2-input w-full m-0 mt-1 border-2 border-slate-100 rounded-xl font-bold" placeholder="Nama Lengkap">
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nama Teknisi (Serah Terima)</label>
            <input id="sw-teknisi" class="swal2-input w-full m-0 mt-1 border-2 border-slate-100 rounded-xl font-bold" placeholder="Nama Teknisi Lapangan">
          </div>
          <div class="grid grid-cols-2 gap-3">
             <div class="space-y-1">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tgl Pinjam</label>
                <input id="sw-tgl-pinjam" type="date" class="swal2-input w-full m-0 mt-1 border-2 border-slate-100 rounded-xl font-bold" value="${new Date().toISOString().split('T')[0]}">
             </div>
             <div class="space-y-1">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Rencana Kembali</label>
                <input id="sw-kembali" type="date" class="swal2-input w-full m-0 mt-1 border-2 border-slate-100 rounded-xl font-bold">
             </div>
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Kondisi Awal</label>
            <select id="sw-kondisi" class="swal2-input w-full m-0 mt-1 border-2 border-slate-100 rounded-xl font-bold text-slate-700">
              <option value="Baik / Normal">🟢 Baik / Normal</option>
              <option value="Rusak Ringan">🟡 Rusak Ringan</option>
              <option value="Rusak Berat">🔴 Rusak Berat</option>
              <option value="Hilang">⚫ Hilang</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Foto Bukti Pinjam (Opsional)</label>
            <input type="file" id="sw-foto" accept="image/*" class="swal2-file w-full m-0 mt-1 border-2 border-slate-100 rounded-xl">
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Catatan</label>
            <textarea id="sw-catatan" class="swal2-textarea w-full m-0 mt-1 border-2 border-slate-100 rounded-xl font-medium" placeholder="Keperluan pemakaian alat..."></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Konfirmasi Pinjam',
      confirmButtonColor: '#013220',
      cancelButtonColor: '#94a3b8',
      customClass: {
        popup: 'rounded-[1.5rem]',
        confirmButton: 'rounded-xl px-10 py-3 font-bold',
        cancelButton: 'rounded-xl px-10 py-3 font-bold'
      },
      preConfirm: () => {
        const barangId = (document.getElementById('sw-item') as HTMLSelectElement).value;
        const peminjam = (document.getElementById('sw-peminjam') as HTMLInputElement).value;
        const teknisi = (document.getElementById('sw-teknisi') as HTMLInputElement)?.value || '';
        const tglPinjam = (document.getElementById('sw-tgl-pinjam') as HTMLInputElement).value;
        const tglKembali = (document.getElementById('sw-kembali') as HTMLInputElement).value;
        const kondisi = (document.getElementById('sw-kondisi') as HTMLSelectElement)?.value || 'Baik / Normal';
        const foto = (document.getElementById('sw-foto') as HTMLInputElement)?.files?.[0];
        const catatan = (document.getElementById('sw-catatan') as HTMLTextAreaElement).value;

        if (!barangId || !peminjam || !tglPinjam || !tglKembali) {
          Swal.showValidationMessage('Mohon lengkapi data wajib!');
          return false;
        }

        return {
          barang_id: barangId,
          peminjam: peminjam,
          teknisi: teknisi,
          tgl_pinjam: tglPinjam,
          tgl_kembali_rencana: tglKembali,
          kondisi: kondisi,
          foto: foto,
          catatan: catatan
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        const formValues = result.value;
        const selectedItem = availableItems.find(i => i.id == formValues.barang_id);

        try {
          Swal.fire({
            title: 'Memproses...',
            didOpen: () => Swal.showLoading()
          });

          let photoUrl = '';
          if (formValues.foto) {
            photoUrl = await uploadImage(formValues.foto);
          }

          const { data: loanData, error: loanError } = await supabase.from('peminjaman').insert([{
            barang_id: parseInt(formValues.barang_id),
            peminjam: formValues.peminjam,
            teknisi_pinjam: formValues.teknisi,
            tgl_kembali_rencana: formValues.tgl_kembali_rencana,
            barang_nama: selectedItem?.nama || 'Unknown Item',
            tgl_pinjam: formValues.tgl_pinjam,
            status: 'dipinjam',
            catatan: formValues.catatan,
            kondisi_pinjam: formValues.kondisi,
            foto_bukti_url: photoUrl
          }]).select();

          if (loanError) throw loanError;

          const newStock = (selectedItem?.jumlah_tersedia || 0) - 1;
          await supabase
            .from('inventaris_utama')
            .update({ jumlah_tersedia: newStock })
            .eq('id', parseInt(formValues.barang_id));

          await supabase
            .from('activity_logs')
            .insert([{
              user_email: 'System Tracker',
              action: 'CONDITION_LOG',
              table_name: 'peminjaman',
              record_id: loanData?.[0]?.id || 0,
              details: {
                teknisi: formValues.teknisi,
                type: 'Pinjam',
                item_id: parseInt(formValues.barang_id),
                item_name: selectedItem?.nama || 'Unknown Item',
                condition: formValues.kondisi,
                notes: formValues.catatan,
                photo_url: photoUrl,
                timestamp: new Date().toISOString()
              }
            }]);

          Swal.fire({ icon: 'success', title: 'Berhasil!', confirmButtonColor: '#013220' });
          fetchData();

        } catch (err: any) {
          Swal.fire('Error', err.message, 'error');
        }
      }
    });
  };

  const handleReturn = async (loan: any) => {
    await Swal.fire({
      title: '<span class="text-[#013220] font-bold">Form Pengembalian Alat</span>',
      html: `
        <div class="flex flex-col gap-3 text-left p-2">
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner mb-4">
            <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Objek Pinjaman</p>
            <p class="text-lg font-black text-slate-900">${loan.barang_nama}</p>
            <p class="text-sm font-bold text-slate-500">Peminjam: ${loan.peminjam}</p>
          </div>
          <div class="space-y-2">
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nama Teknisi (Penerima)</label>
            <input id="sw-teknisi-kembali" class="swal2-input w-full m-0 mt-1 border-2 border-slate-100 rounded-xl font-bold" placeholder="Nama Teknisi">
          </div>
          <div class="space-y-2">
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Kondisi Akhir</label>
            <select id="sw-kondisi-kembali" class="swal2-input w-full m-0 mt-1 border-2 border-slate-100 rounded-xl font-bold">
              <option value="Baik / Normal">🟢 Baik / Normal</option>
              <option value="Rusak Ringan">🟡 Rusak Ringan</option>
              <option value="Rusak Berat">🔴 Rusak Berat</option>
              <option value="Hilang">⚫ Hilang</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bukti Pengembalian (Opsional)</label>
            <input type="file" id="sw-foto-kembali" accept="image/*" class="swal2-file w-full m-0 mt-1">
          </div>
          <div class="space-y-2">
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Catatan Kembali</label>
            <textarea id="sw-catatan-kembali" class="swal2-textarea w-full m-0 mt-1 border-2 border-slate-100 rounded-xl" placeholder="Catatan kondisi saat dikembalikan..."></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Selesaikan Pinjaman',
      confirmButtonColor: '#013220',
      customClass: {
        popup: 'rounded-[1.5rem]',
        confirmButton: 'rounded-xl px-10 py-3 font-bold'
      },
      preConfirm: () => {
        const teknisi = (document.getElementById('sw-teknisi-kembali') as HTMLInputElement)?.value || '';
        const kondisi = (document.getElementById('sw-kondisi-kembali') as HTMLSelectElement)?.value || 'Baik / Normal';
        const foto = (document.getElementById('sw-foto-kembali') as HTMLInputElement)?.files?.[0];
        const catatan = (document.getElementById('sw-catatan-kembali') as HTMLTextAreaElement)?.value || '';
        return { teknisi, kondisi, foto, catatan };
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        const formValues = result.value;
        try {
          Swal.fire({ title: 'Memproses...', didOpen: () => Swal.showLoading() });

          let photoUrl = '';
          if (formValues.foto) {
            photoUrl = await uploadImage(formValues.foto);
          }

          const { error: loanError } = await supabase
            .from('peminjaman')
            .update({
              status: 'kembali',
              tgl_kembali_aktual: new Date().toISOString(),
              teknisi_kembali: formValues.teknisi,
              kondisi_kembali: formValues.kondisi,
              foto_kembali_url: photoUrl,
              catatan_kembali: formValues.catatan
            })
            .eq('id', loan.id);

          if (loanError) throw loanError;

          const { data: currentItem } = await supabase.from('inventaris_utama').select('jumlah_tersedia').eq('id', loan.barang_id).single();
          if (currentItem) {
            await supabase.from('inventaris_utama').update({ jumlah_tersedia: currentItem.jumlah_tersedia + 1 }).eq('id', loan.barang_id);
          }

          await supabase.from('activity_logs').insert([{
            user_email: 'System Tracker',
            action: 'CONDITION_LOG',
            table_name: 'peminjaman',
            record_id: loan.id,
            details: {
              teknisi: formValues.teknisi,
              type: 'Kembali',
              item_id: loan.barang_id,
              item_name: loan.barang_nama,
              condition: formValues.kondisi,
              notes: formValues.catatan,
              photo_url: photoUrl,
              timestamp: new Date().toISOString()
            }
          }]);

          Swal.fire({ icon: 'success', title: 'Berhasil Dikembalikan!' });
          fetchData();
        } catch (err: any) {
          Swal.fire('Error', err.message, 'error');
        }
      }
    });
  };

  // Combine data for unified view
  const combinedData = [
    ...availableItems.map(item => ({ ...item, viewType: 'available' as const })),
    ...activeLoans.map(loan => ({ ...loan, viewType: 'loan' as const }))
  ].filter(item => {
    const text = (item.nama || item.barang_nama || '').toLowerCase();
    const code = (item.kode_alat || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = text.includes(search) || code.includes(search);

    if (filterStatus === 'available') return matchesSearch && item.viewType === 'available';
    if (filterStatus === 'loan') return matchesSearch && item.viewType === 'loan';
    return matchesSearch;
  });

  return (
    <div className="space-y-6 md:space-y-10 animate-fade-in pb-20">

      {/* Modern Unified Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-white p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-modern-lg border border-gray-100/50">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-gradient rounded-full blur-[100px] opacity-10 -mr-40 -mt-40"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="p-3 md:p-4 bg-gold-gradient rounded-2xl shadow-xl ring-4 ring-sgd-500/10">
              <FaExchangeAlt className="text-white text-xl md:text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-1 md:mb-2 text-wrap">Peminjaman & Pengembalian</h1>
              <p className="text-slate-500 font-bold text-[10px] md:text-sm tracking-wide">PENGELOLAAN ALAT & ASET LAPANGAN KONTINU</p>
            </div>
          </div>
          <button
            onClick={() => handlePinjamModal()}
            className="w-full md:w-auto overflow-hidden bg-slate-900 text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-2xl hover:bg-slate-800 transition-all active:scale-95 group text-sm md:text-base"
          >
            <FaPlus className="text-sgd-400 group-hover:rotate-90 transition-transform duration-300" />
            Pinjaman Baru
          </button>
        </div>
      </div>

      {/* Unified Search and Control Bar */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-modern-lg border border-slate-100 space-y-6">
        <div className="flex flex-col xl:flex-row gap-6 items-stretch xl:items-center justify-between">
          <div className="relative group flex-1">
            <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sgd-500 transition-colors" />
            <input
              type="text"
              placeholder="Cari alat atau kode..."
              className="w-full pl-16 pr-6 py-4 md:py-5 bg-slate-50 border-2 border-transparent rounded-2xl md:rounded-[1.5rem] outline-none focus:border-sgd-500 focus:bg-white transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-6 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap ${filterStatus === 'all' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              SEMUA ({availableItems.length + activeLoans.length})
            </button>
            <button
              onClick={() => setFilterStatus('available')}
              className={`px-6 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap ${filterStatus === 'available' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-400 hover:text-emerald-500'}`}
            >
              TERSEDIA ({availableItems.length})
            </button>
            <button
              onClick={() => setFilterStatus('loan')}
              className={`px-6 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap ${filterStatus === 'loan' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:text-orange-500'}`}
            >
              SEDANG DIPINJAM ({activeLoans.length})
            </button>
          </div>
        </div>
      </div>

      {/* Unified Results Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sgd-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Sinkronisasi Aset...</p>
        </div>
      ) : combinedData.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-16 md:p-24 text-center border-2 border-dashed border-slate-100 shadow-inner">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaBoxOpen size={48} className="text-slate-100" />
          </div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-sm md:text-lg">Tidak ada alat yang ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
          {combinedData.map((item, idx) => (
            <div
              key={item.id || idx}
              className={`group bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between overflow-hidden relative ${item.viewType === 'loan' ? 'ring-2 ring-orange-500/20' : ''}`}
            >
              {/* Status Badge Top Right */}
              <div className="absolute top-6 right-6 z-20">
                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${item.viewType === 'available'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : 'bg-orange-50 text-orange-600 border-orange-100'
                  }`}>
                  {item.viewType === 'available' ? 'Siap Pinjam' : 'Sedang Dipakai'}
                </span>
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start gap-5 mb-6">
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner border border-slate-100 ${item.viewType === 'available' ? 'bg-slate-50' : 'bg-orange-50'}`}>
                    {(item.foto_url || item.foto_bukti_url) ? (
                      <img src={item.foto_url || item.foto_bukti_url} alt="Aset" className="w-full h-full object-cover" />
                    ) : (
                      <FaBarcode size={24} className={item.viewType === 'available' ? 'text-slate-300' : 'text-orange-300'} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pr-12">
                    <h4 className="text-lg md:text-xl font-black text-slate-900 group-hover:text-sgd-700 transition-colors uppercase tracking-tight line-clamp-2 leading-snug">{item.nama || item.barang_nama}</h4>
                    <p className="text-[10px] font-black text-slate-400 mt-2 tracking-widest uppercase truncate">KODE: {item.kode_alat || 'NO-CODE'}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-50 mt-auto">
                  {item.viewType === 'available' ? (
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <FaMapMarkerAlt className="text-slate-300" />
                        <span className="text-xs font-bold text-slate-500">{item.lokasi || 'Lokasi tidak diset'}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">STOK</p>
                        <p className="text-2xl font-black text-slate-900">{item.jumlah_tersedia}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 mb-4">
                      <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1.5 leading-none">Peminjam Aktif</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{item.peminjam}</p>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600">
                          <FaClock size={10} />
                          {item.tgl_pinjam ? format(new Date(item.tgl_pinjam), 'dd/MM/yy') : '-'}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => item.viewType === 'available' ? handlePinjamModal(item) : handleReturn(item)}
                    className={`w-full flex items-center justify-between p-4 md:p-5 rounded-2xl font-black transition-all shadow-xl active:scale-95 group/btn ${item.viewType === 'available'
                      ? 'bg-slate-900 text-white hover:bg-emerald-600 shadow-slate-200 hover:shadow-emerald-500/20'
                      : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'
                      }`}
                  >
                    <span className="text-xs uppercase tracking-widest">{item.viewType === 'available' ? 'PINJAM ALAT' : 'KEMBALIKAN ALAT'}</span>
                    <FaChevronRight size={10} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Peminjaman;