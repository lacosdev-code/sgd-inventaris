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

  useEffect(() => {
    fetchDataOrang();
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

  // Fungsi export PDF per orang
  const exportPersonPDF = (person: string, items: any[]) => {
    const doc = new jsPDF();

    doc.setFillColor(1, 50, 32);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN INVENTARIS PERSONEL', 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('PT Sarana Guna Dharma', 105, 22, { align: 'center' });
    doc.text('Jl. Raya Bekasi KM 18, Jakarta Timur', 105, 28, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nama Personel: ${person}`, 14, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal Cetak: ${format(new Date(), 'dd MMMM yyyy')}`, 14, 57);
    doc.text(`Total Item: ${items.length}`, 14, 64);

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
      startY: 72,
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
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 70 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 30 },
        4: { halign: 'center', cellWidth: 35 }
      }
    });

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
    <div className="space-y-6 animate-fade-in">

      {/* Modern Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-white p-8 rounded-3xl shadow-modern-lg border border-gray-100/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sgd-100 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sgd-50 rounded-xl">
              <FaUser className="text-sgd-600 text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventaris Per Orang</h1>
              <p className="text-slate-500 font-medium">Daftar aset yang dipegang oleh personel lapangan</p>
            </div>
          </div>
          <div className="relative w-full md:w-80 group">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sgd-600 transition-colors text-lg" />
            <input
              type="text"
              placeholder="Cari nama personel..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50/80 border-2 border-slate-200/50 rounded-2xl focus:border-sgd-400 focus:bg-white outline-none transition-all duration-300 text-sm font-semibold placeholder:text-slate-400 shadow-sm focus:shadow-md"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
    </div>
  );
};

export default InventarisOrang;