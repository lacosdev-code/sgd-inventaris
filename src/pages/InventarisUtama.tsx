import React, { useState, useRef } from 'react';
import { useInventaris } from '../hooks/useInventaris';
import { supabase } from '../services/supabase';
import { uploadToolImage } from '../actions/uploadAction';
import { QRCodeSVG } from 'qrcode.react';
import { FiPlus, FiTrash, FiFileText, FiSearch, FiCamera, FiLoader, FiDownload, FiUpload, FiEdit, FiImage } from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
// Import QRScanner
import QRScanner from '../components/Inventaris/QRScanner';

const InventarisUtama = () => {
  const { items, loading, deleteItem, upsertItem } = useInventaris();
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fungsi Import dari Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0]; // Ambil sheet pertama
        const ws = wb.Sheets[wsname];

        // Ubah data excel jadi JSON
        const data = XLSX.utils.sheet_to_json(ws);

        // Format data agar sesuai dengan kolom tabel database kita
        const formattedData = data.map((row: any) => ({
          nama: row['Nama'],
          jumlah: parseInt(row['Jumlah']) || 0,
          jumlah_tersedia: parseInt(row['Jumlah']) || 0, // Awal masuk, tersedia = jumlah total
          kondisi: row['Kondisi']?.toLowerCase() || 'bagus',
          lokasi: row['Lokasi'] || '-',
          kode_alat: row['Kode Alat']
        }));

        // Validasi: Pastikan ada kode_alat agar tidak error
        const validData = formattedData.filter(item => item.kode_alat);

        if (validData.length === 0) {
          Swal.fire('Error', 'Format Excel salah atau Kode Alat kosong!', 'error');
          return;
        }

        // Tembak ke Supabase menggunakan Bulk Upsert
        const { error } = await supabase
          .from('inventaris_utama')
          .upsert(validData, { onConflict: 'kode_alat' });

        if (error) throw error;

        Swal.fire('Berhasil!', `${validData.length} barang sukses di-import ke sistem.`, 'success');

        // Refresh tabel
        window.location.reload();
      } catch (error: any) {
        Swal.fire('Gagal Import', error.message, 'error');
      }
    };
    reader.readAsBinaryString(file);

    // Reset input file agar bisa import file yang sama lagi jika perlu
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Fungsi Download Template Kosong
  const downloadTemplate = () => {
    const templateData = [
      {
        'Nama': 'Contoh: Mesin Bor',
        'Jumlah': 5,
        'Kondisi': 'bagus',
        'Lokasi': 'Gudang Wijaya',
        'Kode Alat': 'SGD-BOR-001'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Inventaris_SGD.xlsx");
  };

  const handleScanResult = (decodedText: string) => {
    setShowScanner(false);
    setSearchTerm(decodedText);
    Swal.fire({
      icon: 'success',
      title: 'QR Code Terbaca',
      text: `Menampilkan hasil untuk: ${decodedText}`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  // Fungsi Tambah / Edit Item
  const handleAddOrEdit = async (itemToEdit?: any) => {
    const isEdit = !!itemToEdit;
    const title = isEdit ? '✏️ Edit Item' : '➕ Tambah Item Baru';
    const confirmText = isEdit ? '💾 Simpan Perubahan' : '💾 Simpan Item';

    const { value: formValues } = await Swal.fire({
      title: `<span class="text-2xl font-black text-slate-900">${title}</span>`,
      html: `
        <div class="text-left space-y-4 p-2">
          ${isEdit ? `<input type="hidden" id="sw-id" value="${itemToEdit.id}">` : ''}
          
          <div class="flex gap-4">
             <div class="flex-1">
                <label class="block text-sm font-bold text-slate-700 mb-2">Nama Barang <span class="text-red-500">*</span></label>
                <input id="sw-nama" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sgd-500 focus:outline-none transition-all" placeholder="Contoh: Mesin Bor" value="${itemToEdit?.nama || ''}" />
             </div>
             <div class="w-1/3">
                <label class="block text-sm font-bold text-slate-700 mb-2">Kode Alat <span class="text-red-500">*</span></label>
                <input id="sw-kode" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sgd-500 focus:outline-none transition-all font-mono" placeholder="KODE-001" value="${itemToEdit?.kode_alat || ''}" ${isEdit ? 'readonly class="bg-slate-100 text-slate-500 cursor-not-allowed"' : ''} />
             </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">Jumlah Total <span class="text-red-500">*</span></label>
              <input id="sw-jumlah" type="number" min="0" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sgd-500 focus:outline-none transition-all" placeholder="0" value="${itemToEdit?.jumlah || ''}" />
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">Stok Tersedia</label>
              <input id="sw-tersedia" type="number" min="0" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sgd-500 focus:outline-none transition-all" placeholder="0" value="${itemToEdit?.jumlah_tersedia || ''}" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
             <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">Kondisi</label>
              <select id="sw-kondisi" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sgd-500 focus:outline-none transition-all">
                <option value="bagus" ${itemToEdit?.kondisi === 'bagus' ? 'selected' : ''}>✓ Bagus</option>
                <option value="rusak" ${itemToEdit?.kondisi === 'rusak' ? 'selected' : ''}>⚠️ Rusak</option>
              </select>
            </div>
            <div>
               <label class="block text-sm font-bold text-slate-700 mb-2">Lokasi</label>
               <input id="sw-lokasi" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sgd-500 focus:outline-none transition-all" placeholder="Gudang A" value="${itemToEdit?.lokasi || ''}" />
            </div>
          </div>

          <div>
             <label class="block text-sm font-bold text-slate-700 mb-2">Foto Barang</label>
             <div class="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center text-slate-400 hover:bg-slate-50 cursor-pointer transition-colors relative group">
                ${itemToEdit?.foto_url ? `<img src="${itemToEdit.foto_url}" class="h-20 w-auto mx-auto mb-2 rounded-lg" />` : '<FiImage class="mx-auto text-2xl mb-2" />'}
                <span class="text-xs font-semibold" id="file-label text-slate-500">${itemToEdit?.foto_url ? 'Ganti Foto' : 'Upload Foto'}'}</span>
                <input type="file" id="sw-foto" class="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onchange="document.getElementById('file-label').innerText = this.files[0].name; document.getElementById('preview-container').style.display='none';">
                <div id="preview-container"></div>
             </div>
          </div>

        </div>
      `,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Batal',
      confirmButtonColor: '#C5A02D',
      cancelButtonColor: '#64748b',
      width: '600px',
      preConfirm: () => {
        const nama = (document.getElementById('sw-nama') as HTMLInputElement).value;
        const kode = (document.getElementById('sw-kode') as HTMLInputElement).value;
        const jumlah = parseInt((document.getElementById('sw-jumlah') as HTMLInputElement).value);
        const tersedia = parseInt((document.getElementById('sw-tersedia') as HTMLInputElement).value); // Allow editing available stock separately if needed
        const kondisi = (document.getElementById('sw-kondisi') as HTMLSelectElement).value;
        const lokasi = (document.getElementById('sw-lokasi') as HTMLInputElement).value || '-';
        const fotoFile = (document.getElementById('sw-foto') as HTMLInputElement).files?.[0];

        if (!nama || !kode || isNaN(jumlah)) {
          Swal.showValidationMessage('Nama, Kode, dan Jumlah wajib diisi!');
          return false;
        }

        return {
          nama,
          kode_alat: kode,
          jumlah,
          jumlah_tersedia: isNaN(tersedia) ? jumlah : tersedia, // If empty, default to total
          kondisi,
          lokasi,
          fotoFile
        };
      }
    });

    if (formValues) {
      try {
        let photoUrl = itemToEdit?.foto_url || null;

        if (formValues.fotoFile) {
          Swal.fire({
            title: 'Mengupload Foto...',
            text: 'Mohon tunggu sebentar',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
          });

          // Gunakan Server Action Adapter
          const formData = new FormData();
          formData.append('file', formValues.fotoFile);

          const uploadRes = await uploadToolImage(formData);

          if (!uploadRes.success || !uploadRes.url) {
            throw new Error(uploadRes.error || "Gagal upload foto");
          }
          photoUrl = uploadRes.url;

          Swal.close();
        }

        const payload = {
          ...formValues,
          foto_url: photoUrl
        };
        delete payload.fotoFile; // Don't send file object to Supabase

        await upsertItem(payload);

        // Success handled by upsertItem or useInventaris, but we can double check
        // useInventaris usually handles alert, but let's be safe.

      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyimpan',
          text: error.message,
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  const filtered = items.filter(item =>
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.kode_alat && item.kode_alat.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.lokasi && item.lokasi.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {showScanner && <QRScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />}

      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-white p-8 rounded-3xl shadow-modern-lg border border-gray-100/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sgd-100 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-sgd-50 rounded-xl">
              <FiFileText className="text-sgd-600 text-xl" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventaris Utama</h1>
          </div>
          <p className="text-slate-500 font-medium ml-14">Kelola semua aset dan stok barang di sini.</p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-modern border border-gray-100/50">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[280px] group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sgd-600 transition-colors text-lg" />
            <input
              type="text"
              placeholder="Cari alat / kode..."
              className="pl-12 pr-4 py-3.5 w-full bg-slate-50/80 border-2 border-slate-200/50 rounded-2xl focus:border-sgd-400 focus:bg-white outline-none transition-all duration-300 text-sm font-semibold placeholder:text-slate-400 shadow-sm focus:shadow-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => setShowScanner(true)}
            className="group bg-gradient-to-br from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 text-slate-700 px-5 py-3.5 rounded-2xl flex gap-2.5 items-center transition-all duration-300 hover:shadow-lg active:scale-95 border border-slate-200/50"
          >
            <FiCamera className="text-lg transition-transform duration-300 group-hover:scale-110 group-hover:text-sgd-600" />
            <span className="hidden sm:inline font-bold text-sm">Scan QR</span>
          </button>

          {/* Tombol Template */}
          <button
            onClick={downloadTemplate}
            className="group bg-white border-2 border-slate-200/50 text-slate-700 hover:border-sgd-400 hover:text-sgd-700 px-5 py-3.5 rounded-2xl flex gap-2.5 items-center transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <FiDownload className="text-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:text-sgd-600" />
            <span className="font-bold text-sm">Template</span>
          </button>

          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImportExcel}
          />
          {/* Tombol Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white px-5 py-3.5 rounded-2xl flex gap-2.5 items-center transition-all shadow-lg hover:shadow-xl active:scale-95 group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <FiUpload className="text-sgd-400 text-lg relative z-10 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm relative z-10">Import Excel</span>
          </button>

          {/* Tombol Tambah */}
          <button
            onClick={() => handleAddOrEdit()}
            className="relative overflow-hidden bg-gold-gradient text-white px-6 py-3.5 rounded-2xl flex gap-2.5 items-center transition-all shadow-lg shadow-sgd-500/30 hover:shadow-xl hover:shadow-sgd-500/40 active:scale-95 group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <FiPlus className="text-lg relative z-10 group-hover:rotate-90 transition-transform duration-300" />
            <span className="hidden sm:inline font-black text-sm relative z-10">Tambah</span>
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white to-slate-50/30 rounded-3xl shadow-modern-lg border border-gray-100/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="p-5 font-black">Nama Barang</th>
                <th className="p-5 font-black">Stok (Sisa/Total)</th>
                <th className="p-5 font-black">Kondisi</th>
                <th className="p-5 font-black">Lokasi</th>
                <th className="p-5 font-black text-center">Foto</th>
                <th className="p-5 font-black text-center">QR Code</th>
                <th className="p-5 font-black text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-16 text-center text-slate-400"><div className="flex justify-center items-center gap-3"><FiLoader className="animate-spin text-2xl text-sgd-500" /> <span className="font-semibold">Memuat data...</span></div></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-16 text-center text-slate-400 font-semibold">Data tidak ditemukan.</td></tr>
              ) : filtered.map((item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-gradient-to-r hover:from-sgd-50/30 hover:to-transparent transition-all duration-300 group animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="p-5">
                    <div className="font-black text-slate-900 text-base">{item.nama}</div>
                    <div className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded-lg w-fit mt-1.5 font-semibold">{item.kode_alat}</div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <span className={`text-2xl font-black ${item.jumlah_tersedia < 5 ? "text-orange-500" : "text-green-600"}`}>{item.jumlah_tersedia}</span>
                          <span className="text-slate-400 font-semibold">/ {item.jumlah}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${item.jumlah_tersedia < 5 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-gradient-to-r from-green-500 to-green-400'}`}
                            style={{ width: `${(item.jumlah_tersedia / item.jumlah) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase shadow-sm ${item.kondisi?.toLowerCase().includes('rusak')
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                      }`}>
                      {item.kondisi?.toLowerCase().includes('rusak') ? '⚠️' : '✓'}
                      {item.kondisi}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-sgd-500 rounded-full animate-pulse"></div>
                      <span className="text-slate-700 font-semibold">{item.lokasi}</span>
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    {item.foto_url ? (
                      <div className="w-12 h-12 mx-auto rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:scale-150 transition-transform origin-center cursor-pointer z-10 relative bg-white">
                        <img src={item.foto_url} alt={item.nama} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 mx-auto rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
                        <FiImage />
                      </div>
                    )}
                  </td>
                  <td className="p-5 flex justify-center">
                    <div className="relative group/qr">
                      <div className="absolute inset-0 bg-sgd-400 rounded-2xl blur-md opacity-0 group-hover/qr:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative bg-white p-2.5 rounded-2xl border-2 border-slate-200 group-hover/qr:border-sgd-400 group-hover/qr:scale-125 transition-all duration-300 shadow-sm group-hover/qr:shadow-lg">
                        <QRCodeSVG value={`https://inventaris.sgd-corp.com/detail/${item.kode_alat}`} size={40} />
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleAddOrEdit(item)}
                        className="group/edit p-3 text-slate-400 hover:text-white hover:bg-sgd-500 transition-all duration-300 rounded-xl hover:scale-110 active:scale-95 shadow-sm hover:shadow-lg"
                        title="Edit Item"
                      >
                        <FiEdit className="text-lg" />
                      </button>
                      <button
                        onClick={() => item.id && deleteItem(item.id)}
                        className="group/del p-3 text-slate-400 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-300 rounded-xl hover:scale-110 active:scale-95 shadow-sm hover:shadow-lg"
                        title="Hapus Item"
                      >
                        <FiTrash className="text-lg" />
                      </button>
                    </div>
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

export default InventarisUtama;