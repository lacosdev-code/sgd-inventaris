import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInventaris } from '../hooks/useInventaris';
import { supabase } from '../services/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { FiPlus, FiTrash, FiFileText, FiSearch, FiCamera, FiLoader, FiDownload, FiUpload, FiEdit, FiImage } from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import QRScanner from '../components/Inventaris/QRScanner';
import ItemModal from '../components/Inventaris/ItemModal';

const InventarisUtama = () => {
  const { items, loading, deleteItem, upsertItem } = useInventaris();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [showScanner, setShowScanner] = useState(false);

  // Update term if URL changes (optional, but good for back/forward navigation)
  useEffect(() => {
    const query = searchParams.get('search');
    if (query) {
      setSearchTerm(query);
    }
  }, [searchParams]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<any>(null);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const formattedData = data.map((row: any) => ({
          nama: row['Nama'],
          jumlah: parseInt(row['Jumlah']) || 0,
          jumlah_tersedia: parseInt(row['Jumlah']) || 0,
          kondisi: row['Kondisi']?.toLowerCase() || 'bagus',
          lokasi: row['Lokasi'] || '-',
          kode_alat: row['Kode Alat']
        }));

        const validData = formattedData.filter(item => item.kode_alat);

        if (validData.length === 0) {
          Swal.fire('Error', 'Format Excel salah atau Kode Alat kosong!', 'error');
          return;
        }

        const { error } = await supabase
          .from('inventaris_utama')
          .upsert(validData, { onConflict: 'kode_alat' });

        if (error) throw error;

        Swal.fire('Berhasil!', `${validData.length} barang sukses di-import ke sistem.`, 'success');
        window.location.reload();
      } catch (error: any) {
        Swal.fire('Gagal Import', error.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const openAddModal = () => {
    setItemToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (item: any) => {
    // Need to fetch full item details including images to be sure
    // Or just pass the item if we trust the list view has enough data?
    // List view usually doesn't join tool_images. 
    // Let's safe fetch or just pass 'item' and rely on ItemModal to fetch if needed?
    // For speed, let's fetch the images here or inside the modal. 
    // Actually, ItemModal logic assumed item passed has tool_images array. 
    // The current `useInventaris` might NOT be fetching `tool_images`.
    // Let's do a quick fetch single here to be safe.

    try {
      const { data, error } = await supabase
        .from('inventaris_utama')
        .select('*, tool_images(image_url)')
        .eq('id', item.id)
        .single();

      if (data) {
        setItemToEdit(data);
        setIsModalOpen(true);
      }
    } catch (e) {
      console.error("Error fetching detail for edit", e);
      // Fallback to basic item if fetch fails?
      setItemToEdit(item);
      setIsModalOpen(true);
    }
  };

  const handleSuccess = () => {
    window.location.reload(); // Simple refresh to show new data
  };

  const filtered = items.filter(item =>
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.kode_alat && item.kode_alat.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.lokasi && item.lokasi.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.kondisi && item.kondisi.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {showScanner && <QRScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />}

      {/* New React Modal */}
      <ItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        itemToEdit={itemToEdit}
      />

      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-white p-8 rounded-3xl shadow-modern-lg border border-gray-100/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sgd-100 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-sgd-50 rounded-xl">
              <FiFileText className="text-sgd-600 text-xl" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Master Aset</h1>
          </div>
          <p className="text-gray-500 mt-1">Kelola semua inventaris perusahaan</p>
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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white px-5 py-3.5 rounded-2xl flex gap-2.5 items-center transition-all shadow-lg hover:shadow-xl active:scale-95 group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <FiUpload className="text-sgd-400 text-lg relative z-10 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm relative z-10">Import Excel</span>
          </button>

          <button
            onClick={openAddModal}
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
                            className={`h-full rounded-full transition-all duration-500 ${item.jumlah_tersedia < 5 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-gradient-to-r from-green-500 to-green-600'}`}
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
                        onClick={() => openEditModal(item)}
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