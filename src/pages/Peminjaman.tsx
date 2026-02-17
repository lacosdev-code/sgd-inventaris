import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadImage } from '../services/imagekit';

import { FaExchangeAlt, FaHistory, FaClock, FaCheckCircle, FaExclamationCircle, FaPlus, FaImage } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const Peminjaman = () => {
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Ambil barang yang stoknya > 0
      const { data: items } = await supabase
        .from('inventaris_utama')
        .select('id, nama, jumlah_tersedia, lokasi')
        .gt('jumlah_tersedia', 0)
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
    // Generate options for the select element
    const itemOptions = availableItems.map(item =>
      `<option value="${item.id}">${item.nama} ${item.lokasi ? `📍 ${item.lokasi}` : ''} (Sisa: ${item.jumlah_tersedia})</option>`
    ).join('');

    if (availableItems.length === 0) {
      Swal.fire('Stok Kosong', 'Tidak ada barang yang tersedia untuk dipinjam saat ini.', 'warning');
      return;
    }

    await Swal.fire({
      title: '<span class="text-[#013220] font-bold">Form Peminjaman Alat</span>',
      html: `
        <div class="flex flex-col gap-3 text-left">
          <div>
            <label class="text-sm font-semibold text-gray-600">Pilih Barang</label>
            <select id="sw-item" class="swal2-input w-full m-0 mt-1 border-gray-300 focus:ring-[#013220] focus:border-[#013220]">
              ${itemOptions}
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Nama Peminjam</label>
            <input id="sw-peminjam" class="swal2-input w-full m-0 mt-1" placeholder="Nama Lengkap">
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Nama Teknisi (Serah Terima)</label>
            <input id="sw-teknisi" class="swal2-input w-full m-0 mt-1" placeholder="Nama Teknisi">
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Tanggal Pinjam</label>
            <input id="sw-tgl-pinjam" type="date" class="swal2-input w-full m-0 mt-1" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Rencana Kembali</label>
            <input id="sw-kembali" type="date" class="swal2-input w-full m-0 mt-1">
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Kondisi Awal</label>
            <select id="sw-kondisi" class="swal2-input w-full m-0 mt-1 border-gray-300 focus:ring-[#013220] focus:border-[#013220]">
              <option value="Baik / Normal">🟢 Baik / Normal</option>
              <option value="Rusak Ringan">🟡 Rusak Ringan</option>
              <option value="Rusak Berat">🔴 Rusak Berat</option>
              <option value="Hilang">⚫ Hilang</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Foto Bukti Pinjam</label>
            <input type="file" id="sw-foto" accept="image/*" class="swal2-input w-full m-0 mt-1 border-gray-300 focus:ring-[#013220] focus:border-[#013220]">
            <p class="text-xs text-gray-400 mt-1">*Opsional, untuk bukti kondisi saat dipinjam</p>
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Catatan</label>
            <textarea id="sw-catatan" class="swal2-textarea w-full m-0 mt-1" placeholder="Keperluan / Kondisi awal..."></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Konfirmasi Pinjam',
      confirmButtonColor: '#013220',
      cancelButtonColor: '#94a3b8',
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
          Swal.showValidationMessage('Mohon lengkapi semua data wajib!');
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
          // Show loading
          Swal.fire({
            title: 'Memproses...',
            html: 'Mengupload foto dan menyimpan data...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
          });

          // 1. Upload Photo (if exists)
          let photoUrl = '';
          if (formValues.foto) {
            try {
              photoUrl = await uploadImage(formValues.foto);
            } catch (uploadErr) {
              console.error('Upload failed:', uploadErr);
              throw new Error("Gagal upload foto. Periksa koneksi internet.");
            }
          }

          // 2. Insert Loan Record with new fields
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

          // 3. Reduce Stock
          const newStock = (selectedItem?.jumlah_tersedia || 0) - 1;
          const { error: stockError } = await supabase
            .from('inventaris_utama')
            .update({ jumlah_tersedia: newStock })
            .eq('id', parseInt(formValues.barang_id));

          if (stockError) console.error("Gagal update stok:", stockError);

          // 4. Create Activity Log
          const logDetails = {
            teknisi: formValues.teknisi,
            type: 'Pinjam',
            item_id: parseInt(formValues.barang_id),
            item_name: selectedItem?.nama || 'Unknown Item',
            condition: formValues.kondisi,
            notes: formValues.catatan,
            photo_url: photoUrl,
            timestamp: new Date().toISOString()
          };

          const { error: logError } = await supabase
            .from('activity_logs')
            .insert([{
              user_email: 'System Tracker',
              action: 'CONDITION_LOG',
              table_name: 'peminjaman',
              record_id: loanData?.[0]?.id || 0,
              details: logDetails
            }]);

          if (logError) console.error("Log failed", logError);

          // 5. Add photo to gallery
          if (photoUrl) {
            const { error: galleryError } = await supabase
              .from('tool_images')
              .insert({
                tool_id: parseInt(formValues.barang_id),
                image_url: photoUrl
              });
            if (galleryError) console.error("Gallery insert failed:", galleryError);
          }

          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: 'Peminjaman tercatat & stok dikurangi.',
            confirmButtonColor: '#013220'
          });

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
        <div class="flex flex-col gap-3 text-left">
          <div class="bg-slate-50 p-3 rounded-lg mb-2">
            <p class="text-sm"><b>Barang:</b> ${loan.barang_nama}</p>
            <p class="text-sm"><b>Peminjam:</b> ${loan.peminjam}</p>
            ${loan.foto_bukti_url ? `<p class="text-xs text-gray-500 mt-2">Foto Pinjam:</p><img src="${loan.foto_bukti_url}" class="w-24 h-24 object-cover rounded-lg border mt-1" />` : ''}
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Nama Teknisi (Penerima)</label>
            <input id="sw-teknisi-kembali" class="swal2-input w-full m-0 mt-1" placeholder="Nama Teknisi">
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Kondisi Saat Kembali</label>
            <select id="sw-kondisi-kembali" class="swal2-input w-full m-0 mt-1 border-gray-300 focus:ring-[#013220] focus:border-[#013220]">
              <option value="Baik / Normal">🟢 Baik / Normal</option>
              <option value="Rusak Ringan">🟡 Rusak Ringan</option>
              <option value="Rusak Berat">🔴 Rusak Berat</option>
              <option value="Hilang">⚫ Hilang</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Foto Bukti Kembali</label>
            <input type="file" id="sw-foto-kembali" accept="image/*" class="swal2-input w-full m-0 mt-1 border-gray-300 focus:ring-[#013220] focus:border-[#013220]">
            <p class="text-xs text-gray-400 mt-1">*Opsional, untuk bukti kondisi saat dikembalikan</p>
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-600">Catatan Pengembalian</label>
            <textarea id="sw-catatan-kembali" class="swal2-textarea w-full m-0 mt-1" placeholder="Kondisi saat dikembalikan..."></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Konfirmasi Pengembalian',
      confirmButtonColor: '#013220',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const teknisi = (document.getElementById('sw-teknisi-kembali') as HTMLInputElement)?.value || '';
        const kondisi = (document.getElementById('sw-kondisi-kembali') as HTMLSelectElement)?.value || 'Baik / Normal';
        const foto = (document.getElementById('sw-foto-kembali') as HTMLInputElement)?.files?.[0];
        const catatan = (document.getElementById('sw-catatan-kembali') as HTMLTextAreaElement)?.value || '';

        return {
          teknisi,
          kondisi,
          foto,
          catatan
        };
      }
    }).then(async (result) => {

      if (result.isConfirmed && result.value) {
        const formValues = result.value;
        try {
          // Show loading
          Swal.fire({
            title: 'Memproses...',
            html: 'Mengupload foto dan menyimpan data...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
          });

          // 1. Upload Return Photo (if exists)
          let photoUrl = '';
          if (formValues.foto) {
            try {
              photoUrl = await uploadImage(formValues.foto);
            } catch (uploadErr) {
              console.error('Upload failed:', uploadErr);
              throw new Error("Gagal upload foto. Periksa koneksi internet.");
            }
          }

          // 2. Update Loan Status with return fields
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

          // 3. Restore Stock
          const { data: currentItem } = await supabase
            .from('inventaris_utama')
            .select('jumlah_tersedia')
            .eq('id', loan.barang_id)
            .single();

          if (currentItem) {
            const { error: stockError } = await supabase
              .from('inventaris_utama')
              .update({ jumlah_tersedia: currentItem.jumlah_tersedia + 1 })
              .eq('id', loan.barang_id);

            if (stockError) console.error("Gagal kembalikan stok:", stockError);
          }

          // 4. Create Activity Log for Return
          const logDetails = {
            teknisi: formValues.teknisi,
            type: 'Kembali',
            item_id: loan.barang_id,
            item_name: loan.barang_nama,
            condition: formValues.kondisi,
            notes: formValues.catatan,
            photo_url: photoUrl,
            timestamp: new Date().toISOString()
          };

          const { error: logError } = await supabase
            .from('activity_logs')
            .insert([{
              user_email: 'System Tracker',
              action: 'CONDITION_LOG',
              table_name: 'peminjaman',
              record_id: loan.id,
              details: logDetails
            }]);

          if (logError) console.error("Log failed", logError);

          // 5. Add return photo to gallery
          if (photoUrl) {
            const { error: galleryError } = await supabase
              .from('tool_images')
              .insert({
                tool_id: loan.barang_id,
                image_url: photoUrl
              });
            if (galleryError) console.error("Gallery insert failed:", galleryError);
          }

          // 6. Also add borrow photo to gallery if it exists
          if (loan.foto_bukti_url) {
            const { error: galleryError } = await supabase
              .from('tool_images')
              .insert({
                tool_id: loan.barang_id,
                image_url: loan.foto_bukti_url
              });
            if (galleryError) console.error("Gallery insert failed:", galleryError);
          }

          Swal.fire({
            icon: 'success',
            title: 'Dikembalikan!',
            text: 'Stok barang otomatis bertambah.',
            confirmButtonColor: '#013220'
          });
          fetchData();
        } catch (err: any) {
          Swal.fire('Error', err.message, 'error');
        }
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Modern Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-white p-8 rounded-3xl shadow-modern-lg border border-gray-100/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sgd-100 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sgd-50 rounded-xl">
              <FaExchangeAlt className="text-sgd-600 text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Transaksi Peminjaman</h1>
              <p className="text-slate-500 font-medium">Pantau alat yang sedang digunakan di lapangan</p>
            </div>
          </div>
          <button
            onClick={handlePinjamModal}
            className="relative overflow-hidden bg-gold-gradient text-white px-6 py-3.5 rounded-2xl font-black flex items-center gap-2.5 transition-all shadow-lg shadow-sgd-500/30 hover:shadow-xl hover:shadow-sgd-500/40 active:scale-95 group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <FaPlus className="relative z-10 group-hover:rotate-90 transition-transform duration-300" />
            <span className="relative z-10">Buat Pinjaman Baru</span>
          </button>
        </div>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group bg-gradient-to-br from-white to-slate-50/30 p-6 rounded-3xl shadow-modern border border-gray-100/50 hover:shadow-modern-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-sgd-100 to-sgd-50 text-sgd-700 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <FaClock />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-semibold">Sedang Dipinjam</p>
              <h3 className="text-3xl font-black text-slate-900">{activeLoans.length} <span className="text-lg font-bold text-slate-500">Alat</span></h3>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Table */}
      <div className="bg-gradient-to-br from-white to-slate-50/30 rounded-3xl shadow-modern-lg border border-gray-100/50 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-white/50 backdrop-blur-sm">
          <div className="p-2 bg-sgd-50 rounded-lg">
            <FaHistory className="text-sgd-600" />
          </div>
          <h3 className="font-black text-slate-900 text-lg">Daftar Pinjaman Aktif</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-5 font-black">Barang / ID</th>
                <th className="px-6 py-5 font-black">Peminjam</th>
                <th className="px-6 py-5 font-black">Foto</th>
                <th className="px-6 py-5 font-black">Tgl Pinjam</th>
                <th className="px-6 py-5 font-black">Rencana Kembali</th>
                <th className="px-6 py-5 text-center font-black">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-400"><div className="flex justify-center items-center gap-3"><div className="animate-spin rounded-full h-12 w-12 border-4 border-sgd-500 border-t-transparent"></div><span className="font-semibold">Memuat data transaksi...</span></div></td></tr>
              ) : activeLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <FaCheckCircle size={32} className="text-green-500" />
                      </div>
                      <p className="font-semibold text-lg">Semua barang aman di gudang.</p>
                    </div>
                  </td>
                </tr>
              ) : activeLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-gradient-to-r hover:from-sgd-50/30 hover:to-transparent transition-all duration-300 group">
                  <td className="px-6 py-5">
                    <p className="font-black text-slate-900 text-base">{loan.barang_nama}</p>
                    <p className="text-[10px] text-slate-500 font-mono font-semibold mt-0.5">ID: #{loan.id}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-sgd-100 to-sgd-50 text-sgd-700 rounded-full flex items-center justify-center text-sm font-black uppercase border-2 border-sgd-200 shadow-sm">
                        {loan.peminjam ? loan.peminjam.charAt(0) : '?'}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{loan.peminjam}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {loan.foto_bukti_url ? (
                      <a href={loan.foto_bukti_url} target="_blank" rel="noreferrer" className="block w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-200 hover:border-sgd-400 hover:scale-150 transition-all origin-left shadow-sm hover:shadow-md">
                        <img src={loan.foto_bukti_url} alt="Bukti" className="w-full h-full object-cover" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic font-semibold">No Image</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-700 font-semibold">
                    {loan.tgl_pinjam ? format(new Date(loan.tgl_pinjam), 'dd MMM yyyy', { locale: idLocale }) : '-'}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <FaExclamationCircle className="text-sgd-600" />
                      <span className="text-sm text-slate-700 font-semibold">
                        {loan.tgl_kembali_rencana ? format(new Date(loan.tgl_kembali_rencana), 'dd MMM yyyy', { locale: idLocale }) : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button
                      onClick={() => handleReturn(loan)}
                      className="bg-gold-gradient text-white px-5 py-2.5 rounded-xl text-xs font-black hover:shadow-lg hover:shadow-sgd-500/30 transition-all active:scale-95"
                    >
                      ✓ Selesaikan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Peminjaman;