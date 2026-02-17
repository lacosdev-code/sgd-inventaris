import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FaUser, FaToolbox, FaExclamationTriangle, FaSearch, FaWhatsapp, FaPlus, FaFilePdf, FaSync } from 'react-icons/fa';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const InventarisOrang = () => {
  const [dataOrang, setDataOrang] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Personnel Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [assignQty, setAssignQty] = useState(1);
  const [assignCondition, setAssignCondition] = useState('Bagus');
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  useEffect(() => {
    fetchDataOrang();
    fetchAvailableItems();
  }, []);

  const fetchDataOrang = async () => {
    try {
      setLoading(true);

      // 1. Fetch permanent assignments
      const { data: permanentData, error: permError } = await supabase
        .from('inventaris_orang')
        .select('*')
        .order('orang', { ascending: true });

      if (permError) console.error('Permanent items error:', permError);

      // 2. Fetch active loans
      const { data: loanData, error: loanError } = await supabase
        .from('peminjaman')
        .select('id, peminjam, barang_nama, tgl_pinjam, tgl_kembali_rencana, kondisi_pinjam')
        .eq('status', 'dipinjam')
        .order('peminjam', { ascending: true });

      if (loanError) console.error('Loan items error:', loanError);

      // 3. Transform permanent items
      const permanentItems = (permanentData || []).map(item => ({
        ...item,
        type: 'permanent' as const
      }));

      // 4. Transform loan items
      const loanItems = (loanData || []).map(loan => ({
        id: `loan-${loan.id}`,
        orang: loan.peminjam,
        nama: loan.barang_nama,
        jumlah: 1,
        kondisi: loan.kondisi_pinjam || 'Tidak Diketahui',
        type: 'loan' as const,
        tgl_kembali: loan.tgl_kembali_rencana,
        loan_id: loan.id
      }));

      // 5. Merge both datasets
      const mergedData = [...permanentItems, ...loanItems];
      setDataOrang(mergedData);
    } catch (error: any) {
      console.error('Error:', error.message);
      setDataOrang([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventaris_utama')
        .select('id, nama, jumlah_tersedia')
        .gt('jumlah_tersedia', 0)
        .order('nama');

      if (!error) {
        setAvailableItems(data || []);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleSavePersonnel = async () => {
    // Validation
    if (!newPersonName.trim()) {
      Swal.fire('Error', 'Nama personel harus diisi', 'error');
      return;
    }

    if (!selectedItemId) {
      Swal.fire('Error', 'Pilih item yang akan ditugaskan', 'error');
      return;
    }

    const selectedItem = availableItems.find(item => item.id === selectedItemId);
    if (!selectedItem) return;

    if (assignQty > selectedItem.jumlah_tersedia) {
      Swal.fire('Error', `Stok tidak cukup. Tersedia: ${selectedItem.jumlah_tersedia}`, 'error');
      return;
    }

    try {
      // 1. Insert to inventaris_orang
      const { error: insertError } = await supabase
        .from('inventaris_orang')
        .insert({
          orang: newPersonName.trim(),
          nama: selectedItem.nama,
          jumlah: assignQty,
          kondisi: assignCondition
        });

      if (insertError) throw insertError;

      // 2. Update inventaris_utama (reduce available quantity)
      const { error: updateError } = await supabase
        .from('inventaris_utama')
        .update({
          jumlah_tersedia: selectedItem.jumlah_tersedia - assignQty
        })
        .eq('id', selectedItemId);

      if (updateError) throw updateError;

      // 3. Success
      await Swal.fire('Berhasil!', 'Personel berhasil ditambahkan', 'success');
      setShowAddModal(false);

      // Reset form
      setNewPersonName('');
      setSelectedItemId('');
      setSelectedItemName('');
      setAssignQty(1);
      setAssignCondition('Bagus');

      // Refresh data
      fetchDataOrang();
      fetchAvailableItems();
    } catch (error: any) {
      Swal.fire('Error', error.message, 'error');
    }
  };

  const handleAddItem = async (personName: string) => {
    const { value: formValues } = await Swal.fire({
      title: `<span class="text-xl font-bold">Tambah Item untuk ${personName}</span>`,
      html: `
        <div class="flex flex-col gap-3 text-left">
          <div>
            <label class="text-sm font-semibold text-slate-600">Nama Barang</label>
            <input id="sw-nama-barang" class="swal2-input w-full m-0 mt-1" placeholder="Contoh: Obeng Set">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-semibold text-slate-600">Jumlah</label>
              <input id="sw-jumlah" type="number" min="1" class="swal2-input w-full m-0 mt-1" value="1">
            </div>
            <div>
              <label class="text-sm font-semibold text-slate-600">Kondisi</label>
              <select id="sw-kondisi" class="swal2-input w-full m-0 mt-1">
                <option value="Bagus">Bagus</option>
                <option value="Rusak">Rusak</option>
              </select>
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      confirmButtonColor: '#013220',
      preConfirm: () => {
        const nama = (document.getElementById('sw-nama-barang') as HTMLInputElement).value;
        const jumlah = (document.getElementById('sw-jumlah') as HTMLInputElement).value;
        const kondisi = (document.getElementById('sw-kondisi') as HTMLSelectElement).value;

        if (!nama || !jumlah) {
          Swal.showValidationMessage('Mohon isi nama barang dan jumlah');
          return false;
        }

        return { nama, jumlah: parseInt(jumlah), kondisi };
      }
    });

    if (formValues) {
      try {
        const { error } = await supabase
          .from('inventaris_orang')
          .insert([{
            orang: personName,
            nama: formValues.nama,
            jumlah: formValues.jumlah,
            kondisi: formValues.kondisi
          }]);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Item berhasil ditambahkan',
          timer: 1500,
          showConfirmButton: false
        });

        fetchDataOrang();
      } catch (err: any) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  // Fungsi kirim rekap barang via WhatsApp
  const shareToWA = (person: string, items: any[]) => {
    const listBarang = items.map(i => `- ${i.nama} (${i.kondisi})`).join('%0A');
    const message = `Halo ${person}, berikut adalah daftar inventaris yang Anda bawa:%0A${listBarang}`;
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  // Helper to load image for PDF
  const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
    });
  };

  // Fungsi export PDF per orang (Enhanced with logo and color coding)
  const exportPersonPDF = async (person: string, items: any[]) => {
    const doc = new jsPDF();

    // --- HEADER WITH LOGO ---
    try {
      const logoUrl = "https://ik.imagekit.io/Sgd/Logo%20Potrait.png?tr=w-200";
      const logoData = await loadImage(logoUrl);
      if (logoData) {
        doc.addImage(logoData, 'PNG', 14, 10, 25, 25);
      }
    } catch (e) {
      console.warn("Logo failed to load", e);
    }

    // Company Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(1, 50, 32); // SGD Green
    doc.text('PT. SUNGGIARDI CORPORATION', 45, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Puri Park View Apartment BC 3 / 16, Meruya Utara, Kembangan', 45, 24);
    doc.text('Jakarta Barat, DKI Jakarta 11620, ID', 45, 29);
    doc.text('Email: admin@sgd-corp.com | Telp: (021) 789-1234', 45, 34);

    // Line separator
    doc.setLineWidth(0.5);
    doc.setDrawColor(1, 50, 32);
    doc.line(14, 38, 196, 38);

    // Report Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('LAPORAN INVENTARIS PERSONEL', 14, 48);

    // Person Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nama Personel: ${person}`, 14, 54);
    doc.text(`Tanggal Cetak: ${format(new Date(), 'dd MMMM yyyy HH:mm')}`, 14, 60);
    doc.text(`Total Item: ${items.length}`, 14, 66);

    // Count by type
    const permanentCount = items.filter(i => i.type === 'permanent').length;
    const loanCount = items.filter(i => i.type === 'loan').length;
    doc.text(`(${permanentCount} Tetap, ${loanCount} Pinjaman)`, 14, 72);

    // Table data
    const tableData = items.map((item, idx) => [
      idx + 1,
      item.nama,
      item.type === 'permanent' ? 'Tetap' : 'Pinjaman',
      item.kondisi,
      item.type === 'loan' && item.tgl_kembali
        ? format(new Date(item.tgl_kembali), 'dd/MM/yyyy')
        : '-'
    ]);

    autoTable(doc, {
      startY: 78,
      head: [['No', 'Nama Barang', 'Jenis', 'Kondisi', 'Tgl Kembali']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [1, 50, 32],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      alternateRowStyles: { fillColor: [245, 250, 245] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 70 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 30 },
        4: { halign: 'center', cellWidth: 35 }
      },
      didParseCell: (data) => {
        // Color Coding Logic
        if (data.section === 'body') {
          const text = (data.cell.raw as string) || '';
          const textLower = text.toString().toLowerCase();

          // Jenis column (index 2)
          if (data.column.index === 2) {
            data.cell.styles.fontStyle = 'bold';
            if (textLower === 'tetap') {
              data.cell.styles.textColor = [0, 80, 180]; // Blue
            } else if (textLower === 'pinjaman') {
              data.cell.styles.textColor = [218, 165, 32]; // Goldenrod
            }
          }

          // Kondisi column (index 3)
          if (data.column.index === 3) {
            data.cell.styles.fontStyle = 'bold';
            if (textLower.includes('bagus') || textLower.includes('baik')) {
              data.cell.styles.textColor = [0, 128, 0]; // Green
            } else if (textLower.includes('rusak ringan')) {
              data.cell.styles.textColor = [218, 165, 32]; // Goldenrod
            } else if (textLower.includes('rusak berat') || textLower.includes('rusak')) {
              data.cell.styles.textColor = [220, 20, 60]; // Red
            } else if (textLower.includes('normal')) {
              data.cell.styles.textColor = [0, 100, 0]; // Dark Green
            }
          }
        }
      }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Halaman ${i} dari ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`Inventaris_${person.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`);

    Swal.fire({
      icon: 'success',
      title: 'PDF Berhasil Diunduh!',
      text: `Laporan inventaris ${person} telah tersimpan.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Pengelompokan data berdasarkan nama orang
  const groupedData = dataOrang.reduce((acc: any, item: any) => {
    if (!acc[item.orang]) acc[item.orang] = [];
    acc[item.orang].push(item);
    return acc;
  }, {});

  const filteredOrang = Object.keys(groupedData).filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">

      {/* Modern Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-white p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl shadow-modern-lg border border-gray-100/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sgd-100 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 md:p-2.5 bg-sgd-50 rounded-lg md:rounded-xl">
              <FaUser className="text-sgd-600 text-lg md:text-xl" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Aset Personel</h1>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">Aset yang ditugaskan ke personel lapangan</p>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3 items-center w-full md:w-auto">
            <div className="relative flex-1 md:w-80 group">
              <FaSearch className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sgd-600 transition-colors text-base md:text-lg" />
              <input
                type="text"
                placeholder="Cari nama personel..."
                className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3.5 text-sm md:text-base bg-slate-50/80 border-2 border-slate-200/50 rounded-xl md:rounded-2xl focus:border-sgd-400 focus:bg-white outline-none transition-all duration-300 font-semibold placeholder:text-slate-400 shadow-sm focus:shadow-md"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 md:gap-2 h-10 md:h-12 px-3 md:px-4 bg-[#013220] hover:bg-[#024d30] text-white font-semibold rounded-xl md:rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap text-sm md:text-base"
            >
              <FaPlus className="text-sm md:text-base" />
              <span className="hidden sm:inline">Tambah Personel</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-sgd-500 border-t-transparent"></div>
            <span className="text-slate-600 font-semibold">Memuat data personel...</span>
          </div>
        </div>
      ) : filteredOrang.length === 0 ? (
        <div className="text-center py-20 text-slate-400 flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <FaUser size={32} className="opacity-30" />
          </div>
          <p className="font-semibold text-lg">Tidak ada data personel ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrang.map((nama) => (
            <div key={nama} className="group bg-gradient-to-br from-white to-slate-50/30 rounded-3xl shadow-modern border border-gray-100/50 overflow-hidden hover:shadow-modern-lg transition-all duration-500 hover:-translate-y-1">
              {/* Card Header */}
              <div className="relative p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-sgd-400 opacity-20 rounded-full blur-3xl"></div>
                <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-sgd-500 opacity-10 rounded-full blur-2xl"></div>

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gold-gradient rounded-2xl flex items-center justify-center text-2xl shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <FaUser />
                    </div>
                    <div>
                      <h3 className="font-black text-xl mb-1">{nama}</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-sgd-400 rounded-full animate-pulse"></div>
                        <p className="text-sgd-300 text-sm font-bold">{groupedData[nama].length} Item Terdata</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportPersonPDF(nama, groupedData[nama])}
                      className="group/pdf p-3.5 bg-white/10 hover:bg-red-600 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:scale-110 active:scale-95"
                      title="Export PDF"
                    >
                      <FaFilePdf size={24} className="text-red-400 group-hover/pdf:text-white transition-colors" />
                    </button>
                    <button
                      onClick={() => shareToWA(nama, groupedData[nama])}
                      className="group/wa p-3.5 bg-white/10 hover:bg-[#25D366] rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:scale-110 active:scale-95"
                      title="Kirim Rekap WA"
                    >
                      <FaWhatsapp size={24} className="text-[#25D366] group-hover/wa:text-white transition-colors" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-3">
                {groupedData[nama].map((item: any, idx: number) => (
                  <div key={item.id || idx} className="group/item flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md hover:border-sgd-200 transition-all duration-300">
                    <div className="flex items-center gap-3.5">
                      <div className={`p-3 rounded-xl shadow-sm transition-all duration-300 group-hover/item:scale-110 ${item.kondisi?.toLowerCase().includes('rusak')
                        ? 'text-white bg-gradient-to-br from-red-500 to-red-600'
                        : 'text-sgd-700 bg-gradient-to-br from-sgd-100 to-sgd-50'
                        }`}>
                        {item.kondisi?.toLowerCase().includes('rusak') ? <FaExclamationTriangle size={18} /> : <FaToolbox size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{item.nama}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${item.type === 'permanent'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                            }`}>
                            {item.type === 'permanent' ? '📦 Tetap' : '🔄 Pinjaman'}
                          </span>
                          <p className="text-xs text-slate-500 font-semibold">
                            {item.jumlah} Unit
                            {item.type === 'loan' && item.tgl_kembali && (
                              <span className="text-orange-600"> • Kembali: {format(new Date(item.tgl_kembali), 'dd/MM/yy')}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow-sm ${item.kondisi?.toLowerCase().includes('rusak')
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                      }`}>
                      {item.kondisi?.toLowerCase().includes('rusak') ? '⚠️' : '✓'} {item.kondisi}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-white border-t border-slate-100 flex justify-center">
                <button
                  onClick={() => handleAddItem(nama)}
                  className="group/add text-xs font-black text-slate-500 hover:text-sgd-700 transition-all flex items-center gap-2.5"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-100 group-hover/add:from-sgd-500 group-hover/add:to-sgd-600 text-slate-600 group-hover/add:text-white flex items-center justify-center transition-all duration-300 group-hover/add:scale-110 shadow-sm">
                    <FaPlus size={11} />
                  </div>
                  TAMBAH ITEM UNTUK {nama.toUpperCase()}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Add Personnel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl md:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header - Fixed */}
            <div className="p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-sgd-50 to-white flex-shrink-0">
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 bg-sgd-600 rounded-lg md:rounded-xl text-white">
                  <FaPlus className="text-sm md:text-base" />
                </div>
                Tambah Personel Baru
              </h2>
              <p className="text-xs md:text-sm text-gray-500 mt-1 ml-8 md:ml-14">Tugaskan aset ke personel lapangan</p>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-4 md:p-6 space-y-4 md:space-y-5 overflow-y-auto flex-1">
              {/* Personnel Name */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2">
                  Nama Personel <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Contoh: John Doe"
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl focus:border-sgd-400 focus:ring-2 focus:ring-sgd-100 outline-none transition-all"
                />
              </div>

              {/* Item Selection */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2">
                  Pilih Item dari Master Aset <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedItemId(id);
                    const item = availableItems.find(i => i.id === id);
                    setSelectedItemName(item?.nama || '');
                  }}
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl focus:border-sgd-400 focus:ring-2 focus:ring-sgd-100 outline-none transition-all"
                >
                  <option value="">-- Pilih Item --</option>
                  {availableItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.nama} (Tersedia: {item.jumlah_tersedia})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity and Condition */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2">
                    Jumlah <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={assignQty}
                    onChange={(e) => setAssignQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl focus:border-sgd-400 focus:ring-2 focus:ring-sgd-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2">
                    Kondisi
                  </label>
                  <select
                    value={assignCondition}
                    onChange={(e) => setAssignCondition(e.target.value)}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl focus:border-sgd-400 focus:ring-2 focus:ring-sgd-100 outline-none transition-all"
                  >
                    <option value="Bagus">Bagus</option>
                    <option value="Rusak">Rusak</option>
                  </select>
                </div>
              </div>

              {/* Info Box */}
              {selectedItemId && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-4">
                  <p className="text-xs md:text-sm text-blue-800">
                    <strong>Info:</strong> Stok di Master Aset akan berkurang sebanyak <strong>{assignQty}</strong> unit setelah disimpan.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer - Fixed */}
            <div className="p-4 md:p-6 border-t border-gray-200 flex gap-2 md:gap-3 justify-end bg-gray-50 flex-shrink-0">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewPersonName('');
                  setSelectedItemId('');
                  setSelectedItemName('');
                  setAssignQty(1);
                  setAssignCondition('Bagus');
                }}
                className="h-10 md:h-12 px-4 md:px-6 text-sm md:text-base border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSavePersonnel}
                className="h-10 md:h-12 px-4 md:px-6 text-sm md:text-base bg-sgd-600 hover:bg-sgd-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarisOrang;