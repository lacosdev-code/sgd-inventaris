import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadImage } from '../services/imagekit';

import {
  FaExchangeAlt,
  FaHistory,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaPlus,
  FaImage,
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
  const [catalogSearch, setCatalogSearch] = useState('');

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

      // Ambil semua barang yang aktif (tidak terhapus) untuk Katalog & Dropdown Peminjaman
      const { data: items } = await supabase
        .from('inventaris_utama')
        .select('id, nama, kode_alat, jumlah_tersedia, lokasi, kondisi')
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

  const handlePinjamModal = async () => {
    const itemsToBorrow = availableItems.filter(i => i.jumlah_tersedia > 0);
    const itemOptions = itemsToBorrow.map(item =>
      `<option value="${item.id}">${item.nama} ${item.lokasi ? `📍 ${item.lokasi}` : ''} (Sisa: ${item.jumlah_tersedia})</option>`
    ).join('');

    if (itemsToBorrow.length === 0) {
      Swal.fire('Stok Kosong', 'Tidak ada barang yang tersedia untuk dipinjam saat ini.', 'warning');
      return;
    }

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
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Foto Bukti Pinjam</label>
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
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bukti Pengembalian</label>
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

  const filteredCatalog = availableItems.filter(item =>
    item.nama.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    (item.kode_alat && item.kode_alat.toLowerCase().includes(catalogSearch.toLowerCase()))
  );

  return (
    <div className="space-y-10 animate-fade-in pb-20">

      {/* Modern Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-white p-8 md:p-12 rounded-[2.5rem] shadow-modern-lg border border-gray-100/50">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-gradient rounded-full blur-[100px] opacity-10 -mr-40 -mt-40"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gold-gradient rounded-2xl shadow-xl ring-4 ring-sgd-500/10">
              <FaExchangeAlt className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">Portal Peminjaman</h1>
              <p className="text-slate-500 font-bold text-sm tracking-wide">PENGELOLAAN ALAT & ASET LAPANGAN</p>
            </div>
          </div>
          <button
            onClick={handlePinjamModal}
            className="w-full md:w-auto overflow-hidden bg-slate-900 text-white px-10 py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-2xl hover:bg-slate-800 transition-all active:scale-95 group"
          >
            <FaPlus className="text-sgd-400 group-hover:rotate-90 transition-transform duration-300" />
            Input Pinjaman Baru
          </button>
        </div>
      </div>

      {/* Active Loans Table */}
      <div className="bg-white rounded-[2.5rem] shadow-modern-lg border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sgd-100 rounded-xl text-sgd-700 shadow-inner">
              <FaHistory />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-xl tracking-tight">Pinjaman Aktif Anda</h3>
              <p className="text-xs text-slate-400 font-bold flex items-center gap-1 uppercase tracking-widest mt-1">
                <FaClock className="text-sgd-500" /> Sedang Dipinjam: {activeLoans.length} Alat
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto px-2 pb-2">
          {loading ? (
            <div className="py-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-sgd-500 border-t-transparent mx-auto mb-4"></div><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">SINKRONISASI DATA...</p></div>
          ) : activeLoans.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-green-500 text-3xl" />
              </div>
              <p className="font-black text-slate-800 text-lg uppercase tracking-tight">Status Aman</p>
              <p className="text-slate-400 font-medium text-sm">Anda tidak memiliki alat yang perlu dikembalikan.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-50">
                  <th className="px-6 py-5">Item Informasi</th>
                  <th className="px-6 py-5">Tgl Pinjam</th>
                  <th className="px-6 py-5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeLoans.map((loan) => (
                  <tr key={loan.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        {loan.foto_bukti_url ? (
                          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shadow-sm shrink-0">
                            <img src={loan.foto_bukti_url} alt="Tool" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="underline w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 shrink-0">
                            <FaImage size={20} />
                          </div>
                        )}
                        <div>
                          <p className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight">{loan.barang_nama}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Peminjam: {loan.peminjam}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <p className="text-slate-700 font-black text-sm">{format(new Date(loan.tgl_pinjam), 'dd/MM/yy')}</p>
                      <p className="text-[10px] items-center gap-1 font-bold text-red-500 mt-1 flex">
                        <FaClock size={8} /> JML: {loan.tgl_kembali_rencana ? format(new Date(loan.tgl_kembali_rencana), 'dd/MM') : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <button
                        onClick={() => handleReturn(loan)}
                        className="bg-sgd-100 text-sgd-700 px-6 py-3 rounded-xl text-xs font-black shadow-inner hover:bg-sgd-600 hover:text-white transition-all transform hover:-translate-y-1"
                      >
                        KEMBALIKAN
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Available Catalog (Master Aset for Techs) */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sgd-900 rounded-2xl shadow-xl">
              <FaBoxOpen className="text-sgd-400 text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Katalog Alat Tersedia</h2>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">Daftar Inventaris Utama</p>
            </div>
          </div>

          <div className="relative group flex-1 md:max-w-md">
            <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sgd-500 transition-colors" />
            <input
              type="text"
              placeholder="Cari nama atau kode alat..."
              className="w-full pl-16 pr-6 py-5 bg-white border-2 border-transparent rounded-[1.5rem] shadow-xl shadow-slate-200/50 outline-none focus:border-sgd-500 transition-all font-bold text-slate-700 placeholder:text-slate-300"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-300 font-black tracking-[0.3em] text-xs">LOADING CATALOG...</div>
        ) : filteredCatalog.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-slate-100">
            <FaSearch size={40} className="text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm text-center">Data alat tidak ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCatalog.map(item => (
              <div key={item.id} className="group bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between overflow-hidden relative">
                {/* Decor Background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-sgd-50 opacity-0 group-hover:opacity-100 rounded-bl-[4rem] transition-all -z-0"></div>

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl ${item.jumlah_tersedia > 0 ? 'bg-sgd-50 text-sgd-600 shadow-inner' : 'bg-red-50 text-red-400 opacity-50'}`}>
                      <FaBarcode size={24} />
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${item.jumlah_tersedia > 0 ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                      {item.jumlah_tersedia > 0 ? 'READY STOK' : 'STOK KOSONG'}
                    </div>
                  </div>

                  <div className="mb-6 flex-1">
                    <h4 className="text-xl font-black text-slate-900 group-hover:text-sgd-700 transition-colors uppercase tracking-tight line-clamp-2">{item.nama}</h4>
                    <p className="text-[10px] font-black text-slate-400 mt-2 tracking-widest uppercase">KODE: {item.kode_alat || 'NO-CODE'}</p>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FaMapMarkerAlt className="text-slate-300" />
                        <span className="text-xs font-bold text-slate-500">{item.lokasi || 'Lokasi tidak diset'}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">STOK</p>
                        <p className={`text-2xl font-black ${item.jumlah_tersedia > 0 ? 'text-slate-900' : 'text-slate-300'}`}>{item.jumlah_tersedia}</p>
                      </div>
                    </div>

                    {item.jumlah_tersedia > 0 && (
                      <button
                        onClick={handlePinjamModal}
                        className="w-full flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-sgd-600 transition-all shadow-xl shadow-slate-200 group-hover:shadow-sgd-400/20"
                      >
                        <span className="text-xs uppercase tracking-widest">Pinjam Alat</span>
                        <FaChevronRight size={10} className="text-sgd-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Peminjaman;