import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInventaris } from '../hooks/useInventaris';
import { supabase } from '../services/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { FiPlus, FiTrash, FiFileText, FiSearch, FiCamera, FiLoader, FiDownload, FiUpload, FiEdit, FiImage, FiBox, FiAlertTriangle, FiCheckCircle, FiTool, FiUserCheck } from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import QRScanner from '../components/Inventaris/QRScanner';
import ItemModal from '../components/Inventaris/ItemModal';
import AssignAssetModal from '../components/Inventaris/AssignAssetModal';

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
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [itemToAssign, setItemToAssign] = useState<any>(null);

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

  const openAssignModal = (item: any) => {
    setItemToAssign(item);
    setIsAssignModalOpen(true);
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

  // Calculate Metrics
  const totalBarang = items.length;
  const stokMenipis = items.filter(item => item.jumlah_tersedia > 0 && item.jumlah_tersedia < 5).length;
  const kondisiBagus = items.filter(item => item.kondisi?.toLowerCase() === 'bagus' || item.kondisi?.toLowerCase() === 'baik').length;
  const perluPerbaikan = items.filter(item => item.kondisi?.toLowerCase().includes('rusak')).length;

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
      <AssignAssetModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        itemToAssign={itemToAssign}
        onSuccess={handleSuccess}
      />

      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-sgd-900 p-8 rounded-3xl shadow-2xl border border-slate-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sgd-500 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-10 -ml-20 -mb-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-white">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                <FiFileText className="text-sgd-300 text-2xl" />
              </div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                Master Aset
              </h1>
            </div>
            <p className="text-slate-400 text-lg font-medium ml-1">Kelola dan pantau seluruh inventaris perusahaan secara real-time</p>
          </div>
        </div>
      </div>

      {/* --- KPI Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-modern border border-gray-100/50 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-modern-lg transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all"></div>
          <FiBox className="text-blue-500 text-3xl mb-3 relative z-10" />
          <h3 className="text-3xl font-black text-slate-800 relative z-10">{totalBarang}</h3>
          <p className="text-slate-500 text-sm font-semibold mt-1 relative z-10">Total Barang</p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-modern border border-gray-100/50 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-modern-lg transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-500/20 transition-all"></div>
          <FiAlertTriangle className="text-orange-500 text-3xl mb-3 relative z-10" />
          <h3 className="text-3xl font-black text-slate-800 relative z-10">{stokMenipis}</h3>
          <p className="text-slate-500 text-sm font-semibold mt-1 relative z-10">Stok Menipis (&lt;5)</p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-modern border border-gray-100/50 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-modern-lg transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-green-500/20 transition-all"></div>
          <FiCheckCircle className="text-green-500 text-3xl mb-3 relative z-10" />
          <h3 className="text-3xl font-black text-slate-800 relative z-10">{kondisiBagus}</h3>
          <p className="text-slate-500 text-sm font-semibold mt-1 relative z-10">Kondisi Baik</p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-modern border border-gray-100/50 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-modern-lg transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-red-500/20 transition-all"></div>
          <FiTool className="text-red-500 text-3xl mb-3 relative z-10" />
          <h3 className="text-3xl font-black text-slate-800 relative z-10">{perluPerbaikan}</h3>
          <p className="text-slate-500 text-sm font-semibold mt-1 relative z-10">Perlu Perbaikan</p>
        </div>
      </div>

      {/* --- Action Bar --- */}
      <div className="bg-white/80 backdrop-blur-xl p-5 md:p-6 rounded-3xl shadow-modern border border-gray-100/50 flex flex-col xl:flex-row gap-5 items-center justify-between">

        {/* Search */}
        <div className="w-full xl:w-[400px] relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiSearch className="text-slate-400 group-focus-within:text-sgd-500 transition-colors text-lg" />
          </div>
          <input
            type="text"
            placeholder="Cari nama, kode, kondisi, atau lokasi..."
            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-300 focus:bg-white focus:ring-4 focus:ring-sgd-100 outline-none transition-all duration-300 text-sm font-semibold placeholder:text-slate-400 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full xl:w-auto">
          <button
            onClick={() => setShowScanner(true)}
            className="flex-1 sm:flex-none justify-center group bg-white border-2 border-slate-200/60 hover:border-sgd-300 text-slate-600 hover:text-sgd-600 px-5 py-3 rounded-2xl flex gap-2.5 items-center transition-all duration-300 shadow-sm hover:shadow-md active:scale-95"
          >
            <FiCamera className="text-lg transition-transform duration-300 group-hover:scale-110" />
            <span className="font-bold text-sm">Scan QR</span>
          </button>

          <div className="hidden sm:block w-px h-10 bg-slate-200 mx-1"></div>

          <button
            onClick={downloadTemplate}
            className="flex-1 sm:flex-none justify-center group bg-slate-50 hover:bg-slate-100 text-slate-600 px-5 py-3 rounded-2xl flex gap-2.5 items-center transition-all duration-300 active:scale-95 border border-slate-200/50"
          >
            <FiDownload className="text-lg transition-transform duration-300 group-hover:-translate-y-1 group-hover:text-slate-900" />
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
            className="flex-1 sm:flex-none justify-center group bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-2xl flex gap-2.5 items-center transition-all shadow-md hover:shadow-lg active:scale-95 border border-slate-700"
          >
            <FiUpload className="text-sgd-300 text-lg transition-transform duration-300 group-hover:-translate-y-1" />
            <span className="font-bold text-sm">Import Excel</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex-1 sm:flex-none justify-center relative overflow-hidden bg-gradient-to-br from-sgd-400 to-sgd-600 text-white px-6 py-3 rounded-2xl flex gap-2.5 items-center transition-all shadow-lg shadow-sgd-500/30 hover:shadow-xl hover:shadow-sgd-500/40 active:scale-95 group border border-sgd-400/50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <FiPlus className="text-lg relative z-10 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-black text-sm relative z-10">Tambah Item</span>
          </button>
        </div>
      </div>

      {/* --- Data Table --- */}
      <div className="bg-white rounded-3xl shadow-modern-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="p-5 pl-8">Nama & Kode</th>
                <th className="p-5">Ketersediaan Stok</th>
                <th className="p-5 text-center">Kondisi</th>
                <th className="p-5">Lokasi</th>
                <th className="p-5 text-center">Foto</th>
                <th className="p-5 text-center">QR</th>
                <th className="p-5 pr-8 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="p-16 text-center text-slate-400"><div className="flex justify-center items-center gap-3"><FiLoader className="animate-spin text-2xl text-sgd-500" /> <span className="font-semibold">Memuat data...</span></div></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3"><FiBox className="text-4xl text-slate-200" /><span className="font-semibold">Tidak ada data aset ditemukan.</span></td></tr>
              ) : filtered.map((item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 transition-colors duration-200 group animate-fade-in-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="p-5 pl-8">
                    <div className="font-bold text-slate-800 text-[15px] mb-1.5">{item.nama}</div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <div className="text-[11px] text-slate-500 font-mono bg-slate-100/80 px-2.5 py-1 rounded-lg w-fit font-semibold border border-slate-200/60 shadow-sm">{item.kode_alat}</div>
                      {item.assigned_to && item.technicians && (
                        <div className="text-[10px] text-indigo-700 bg-indigo-50 flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg border border-indigo-200/60 shadow-sm" title="Ditugaskan ke Personel">
                          <FiUserCheck className="text-indigo-500" /> {item.technicians.name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="max-w-[150px]">
                      <div className="flex items-baseline justify-between gap-2 mb-2">
                        <span className={`text-xl font-black tracking-tight ${item.jumlah_tersedia < 5 ? "text-orange-500" : "text-emerald-500"}`}>{item.jumlah_tersedia}</span>
                        <span className="text-slate-400 text-xs font-semibold">/ {item.jumlah} total</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${item.jumlah_tersedia < 5 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.max(5, (item.jumlah_tersedia / Math.max(1, item.jumlah)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border ${item.kondisi?.toLowerCase().includes('rusak')
                      ? 'bg-red-50 text-red-600 border-red-200/60'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200/60'
                      }`}>
                      {item.kondisi?.toLowerCase().includes('rusak') ? <FiTool className="text-[10px]" /> : <FiCheckCircle className="text-[10px]" />}
                      <span className="uppercase tracking-wide">{item.kondisi}</span>
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
                  <td className="p-5 pr-8">
                    <div className="flex items-center justify-end gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={() => openAssignModal(item)}
                        className={`p-2.5 transition-all duration-200 rounded-xl hover:scale-105 active:scale-95 shadow-sm border border-transparent ${item.assigned_to ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200'}`}
                        title="Tugaskan Personel"
                      >
                        <FiUserCheck className="text-lg" />
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2.5 text-slate-400 hover:text-sgd-600 hover:bg-sgd-50 transition-all duration-200 rounded-xl hover:scale-105 active:scale-95 shadow-sm border border-transparent hover:border-sgd-200"
                        title="Edit Item"
                      >
                        <FiEdit className="text-lg" />
                      </button>
                      <button
                        onClick={() => item.id && deleteItem(item.id)}
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 rounded-xl hover:scale-105 active:scale-95 shadow-sm border border-transparent hover:border-red-200"
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