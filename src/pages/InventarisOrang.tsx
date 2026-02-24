import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FaUser, FaToolbox, FaExclamationTriangle, FaSearch, FaWhatsapp, FaPlus, FaFilePdf, FaSync, FaEdit } from 'react-icons/fa';
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

  // Edit Personnel Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editQty, setEditQty] = useState(1);
  const [editCondition, setEditCondition] = useState('Bagus');

  useEffect(() => {
    fetchDataOrang();
    fetchAvailableItems();
  }, []);

  const fetchDataOrang = async () => {
    try {
      setLoading(true);

      // 1. Fetch technicians for avatar and sync status
      const { data: techListData } = await supabase
        .from('technicians')
        .select('id, name, avatar_url');

      const techMap = (techListData || []).reduce((acc: any, t) => {
        acc[t.name.trim().toLowerCase()] = t;
        return acc;
      }, {});

      const techIdMap = (techListData || []).reduce((acc: any, t) => {
        acc[t.id] = t;
        return acc;
      }, {});

      // 2. Fetch permanent assignments
      const { data: permanentData, error: permError } = await supabase
        .from('inventaris_orang')
        .select('id, orang, nama, jumlah, kondisi, technician_id')
        .order('orang', { ascending: true });

      if (permError) console.error('Permanent items error:', permError);

      // 3. Fetch active loans
      const { data: loanData, error: loanError } = await supabase
        .from('peminjaman')
        .select('id, peminjam, barang_nama, tgl_pinjam, tgl_kembali_rencana, kondisi_pinjam')
        .eq('status', 'dipinjam')
        .order('peminjam', { ascending: true });

      if (loanError) console.error('Loan items error:', loanError);

      // 4. Fetch assets assigned directly in inventaris_utama
      const { data: assignedAssetData, error: assignedError } = await supabase
        .from('inventaris_utama')
        .select('id, nama, assigned_to, kondisi, jumlah_tersedia, kode_alat')
        .not('assigned_to', 'is', null);

      if (assignedError) console.error('Assigned assets error:', assignedError);

      // 5. Transform permanent items with tech link
      const permanentItems = (permanentData || []).map(item => {
        const techMatch = techMap[item.orang.trim().toLowerCase()];
        return {
          ...item,
          type: 'permanent' as const,
          tech_info: techMatch || null
        };
      });

      // 6. Transform loan items with tech link
      const loanItems = (loanData || []).map(loan => {
        const techMatch = techMap[loan.peminjam.trim().toLowerCase()];
        return {
          id: `loan-${loan.id}`,
          orang: loan.peminjam,
          nama: loan.barang_nama,
          jumlah: 1,
          kondisi: loan.kondisi_pinjam || 'Tidak Diketahui',
          type: 'loan' as const,
          tgl_kembali: loan.tgl_kembali_rencana,
          loan_id: loan.id,
          tech_info: techMatch || null
        };
      });

      // 7. Transform direct assignments from inventaris_utama
      // Filter out items that are already in permanentItems to avoid duplicates
      // We look at item.nama and item.orang matches
      const assignedItems = (assignedAssetData || []).map(asset => {
        const techMatch = techIdMap[asset.assigned_to];
        if (!techMatch) return null;

        // Check if this asset is already represented in permanentItems
        const isDuplicate = permanentItems.some(p =>
          p.nama === asset.nama &&
          p.orang.trim().toLowerCase() === techMatch.name.trim().toLowerCase()
        );

        if (isDuplicate) return null;

        return {
          id: `assigned-${asset.id}`,
          orang: techMatch.name,
          nama: asset.nama,
          jumlah: 1,
          kondisi: asset.kondisi || 'Bagus',
          type: 'permanent' as const, // Treat as permanent/toolkit since it's assigned in the master list
          tech_info: techMatch || null,
          asset_info: asset
        };
      }).filter(Boolean);

      // 8. Merge all datasets
      const mergedData = [...permanentItems, ...loanItems, ...assignedItems];
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

  const handleRelinkPerson = async (personName: string) => {
    try {
      // 1. Fetch technicians for selection
      const { data: techs, error: techError } = await supabase
        .from('technicians')
        .select('id, name')
        .order('name');

      if (techError) throw techError;

      const techOptions = (techs || []).reduce((acc: any, t) => {
        acc[t.id] = t.name;
        return acc;
      }, {});

      // 2. Show Selection Modal
      const { value: selectedTechId } = await Swal.fire({
        title: 'Hubungkan ke Profil Teknisi',
        text: `Pilih profil teknisi yang sesuai untuk "${personName}" agar data tersinkron ke PWA.`,
        input: 'select',
        inputOptions: techOptions,
        inputPlaceholder: 'Pilih Teknisi...',
        showCancelButton: true,
        confirmButtonText: 'Hubungkan Sekarang',
        confirmButtonColor: '#013220',
        cancelButtonText: 'Batal',
        inputValidator: (value) => {
          if (!value) return 'Anda harus memilih teknisi!';
          return null;
        }
      });

      if (selectedTechId) {
        setLoading(true);
        // 3. Update all inventaris_orang entries for this person
        const { error: updateError } = await supabase
          .from('inventaris_orang')
          .update({ technician_id: selectedTechId })
          .eq('orang', personName);

        if (updateError) throw updateError;

        // 4. Force trigger sync for all items this person has
        // The trigger on inventaris_orang will handle updating inventaris_utama.assigned_to
        // when we update the technician_id above.

        await Swal.fire({
          icon: 'success',
          title: 'Berhasil Dihubungkan!',
          text: `Data ${personName} kini tersinkron dengan profil teknisi.`,
          timer: 2000,
          showConfirmButton: false
        });

        fetchDataOrang();
      }
    } catch (error: any) {
      Swal.fire('Gagal', error.message, 'error');
    } finally {
      setLoading(false);
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
          kondisi: assignCondition,
          asset_id: selectedItemId // Formalize the link
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

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setEditPersonName(item.orang);
    setEditQty(item.jumlah);
    setEditCondition(item.kondisi);
    setShowEditModal(true);
  };

  const handleUpdatePersonnel = async () => {
    if (!editPersonName.trim()) {
      Swal.fire('Error', 'Nama personel harus diisi', 'error');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('inventaris_orang')
        .update({
          orang: editPersonName,
          jumlah: editQty,
          kondisi: editCondition
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Data personel berhasil diperbarui',
        timer: 1500,
        showConfirmButton: false
      });

      setShowEditModal(false);
      fetchDataOrang();
    } catch (error: any) {
      Swal.fire('Error', error.message, 'error');
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
          {filteredOrang.map((nama) => {
            const items = groupedData[nama];
            const techInfo = items[0]?.tech_info;
            const isSynced = !!techInfo;

            return (
              <div key={nama} className="group bg-white rounded-[2.5rem] shadow-modern border border-slate-100 overflow-hidden hover:shadow-modern-xl transition-all duration-500 hover:-translate-y-2 flex flex-col">
                {/* Card Header - Premium Dark Design */}
                <div className="relative p-7 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden shrink-0">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-sgd-500/10 rounded-full blur-[60px] pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>
                  <div className="absolute left-1/4 bottom-0 w-32 h-32 bg-sgd-400/5 rounded-full blur-[40px] pointer-events-none"></div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-5">
                        <div className="relative group/avatar">
                          <div className="absolute inset-0 bg-gold-gradient rounded-3xl blur-md opacity-40 group-hover/avatar:opacity-60 transition-opacity"></div>
                          <div className="relative w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-3xl shadow-xl border-2 border-white/10 overflow-hidden p-0.5">
                            {techInfo?.avatar_url ? (
                              <img src={techInfo.avatar_url} alt={nama} className="w-full h-full object-cover rounded-[1.25rem]" />
                            ) : (
                              <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300 font-black">
                                {nama.charAt(0)}
                              </div>
                            )}
                          </div>
                          {isSynced && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-slate-900 rounded-full flex items-center justify-center shadow-lg" title="Technician ID Synced">
                              <FaSync size={8} className="text-white animate-spin-slow" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-black text-xl tracking-tight leading-none group-hover:text-sgd-400 transition-colors uppercase">{nama}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            {isSynced ? (
                              <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-500/20 tracking-widest uppercase">PWA Linked</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-lg border border-white/5 tracking-widest uppercase italic opacity-60">Unlinked Name</span>
                                <button
                                  onClick={() => handleRelinkPerson(nama)}
                                  className="text-[9px] font-black text-sgd-400 hover:text-sgd-300 underline uppercase tracking-tighter"
                                >
                                  Relink Profile
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => exportPersonPDF(nama, items)}
                          className="w-10 h-10 bg-white/5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-2xl transition-all duration-300 flex items-center justify-center border border-white/5 backdrop-blur-md active:scale-90"
                          title="Export PDF"
                        >
                          <FaFilePdf size={18} />
                        </button>
                        <button
                          onClick={() => shareToWA(nama, items)}
                          className="w-10 h-10 bg-white/5 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-2xl transition-all duration-300 flex items-center justify-center border border-white/5 backdrop-blur-md active:scale-90"
                          title="WhatsApp Sync"
                        >
                          <FaWhatsapp size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-white/5 border border-white/10 p-3 rounded-2xl backdrop-blur-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Aset</p>
                        <h4 className="text-lg font-black">{items.length} <span className="text-xs text-slate-500 font-bold tracking-tight">ITEM</span></h4>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-3 rounded-2xl backdrop-blur-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kondisi Aman</p>
                        <h4 className="text-lg font-black text-emerald-400">{items.filter((i: any) => i.kondisi?.toLowerCase().includes('bagus') || i.kondisi?.toLowerCase().includes('baik')).length} <span className="text-xs text-emerald-900 font-bold tracking-tight">ALAT</span></h4>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body - List of items */}
                <div className="flex-1 p-6 space-y-4 bg-slate-50/30 overflow-y-auto max-h-[400px] scrollbar-hide">
                  {items.map((item: any, idx: number) => (
                    <div key={item.id || idx} className="group/item relative flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100/50 hover:shadow-lg hover:border-sgd-200 transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-300 shadow-sm ${item.kondisi?.toLowerCase().includes('rusak')
                          ? 'bg-red-50 text-red-500 ring-1 ring-red-100'
                          : 'bg-sgd-50 text-sgd-700 ring-1 ring-sgd-100'
                          }`}>
                          {item.kondisi?.toLowerCase().includes('rusak') ? <FaExclamationTriangle /> : <FaToolbox />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 truncate pr-2 tracking-tight uppercase">{item.nama}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md tracking-[0.1em] uppercase shadow-sm border ${item.type === 'permanent'
                              ? 'bg-blue-50 text-blue-600 border-blue-100'
                              : 'bg-orange-50 text-orange-600 border-orange-100'
                              }`}>
                              {item.type === 'permanent' ? 'Toolkit' : 'Loan'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{item.jumlah} Unit</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.type === 'permanent' && (
                          <button
                            onClick={() => handleEditClick(item)}
                            className="w-8 h-8 bg-slate-50 hover:bg-sgd-50 text-slate-400 hover:text-sgd-600 rounded-lg transition-all flex items-center justify-center border border-slate-100 group/btn"
                            title="Edit"
                          >
                            <FaEdit size={12} className="group-hover/btn:scale-110" />
                          </button>
                        )}
                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${item.kondisi?.toLowerCase().includes('rusak')
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }`}>
                          {item.kondisi}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Card Footer */}
                <div className="p-4 border-t border-slate-100 bg-white">
                  <button
                    onClick={() => handleAddItem(nama)}
                    className="w-full py-3 bg-slate-50 hover:bg-sgd-500 text-slate-400 hover:text-white rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-3 group/add shadow-inner hover:shadow-lg active:scale-95"
                  >
                    <div className="w-6 h-6 rounded-lg bg-white group-hover/add:bg-white/20 flex items-center justify-center transition-colors">
                      <FaPlus size={10} className="group-hover/add:text-white" />
                    </div>
                    Tugaskan Alat Baru
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Add Personnel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sgd-100 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-4 relative z-10">
                <div className="p-3 bg-sgd-500 rounded-2xl text-white shadow-lg ring-4 ring-sgd-50">
                  <FaPlus size={20} />
                </div>
                PENUGASAN BARU
              </h2>
              <p className="text-sm text-slate-500 mt-2 font-medium tracking-wide">Lengkapi data untuk penugasan aset ke personel lapangan</p>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-white">
              {/* Personnel Name */}
              <div className="group/field">
                <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest group-focus-within/field:text-sgd-600 transition-colors">
                  Nama Personel <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/field:text-sgd-500 transition-colors" />
                  <input
                    type="text"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="Masukkan nama lengkap..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-300 focus:bg-white focus:ring-4 focus:ring-sgd-50 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Item Selection */}
              <div className="group/field">
                <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest group-focus-within/field:text-sgd-600 transition-colors">
                  Pilih Item dari Master Aset <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaToolbox className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/field:text-sgd-500 transition-colors" />
                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedItemId(id);
                      const item = availableItems.find(i => i.id === id);
                      setSelectedItemName(item?.nama || '');
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-300 focus:bg-white focus:ring-4 focus:ring-sgd-50 outline-none transition-all font-bold text-slate-700 appearance-none"
                  >
                    <option value="">-- Cari & Pilih Item --</option>
                    {availableItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.nama} (Tersedia: {item.jumlah_tersedia})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>

              {/* Quantity and Condition */}
              <div className="grid grid-cols-2 gap-6">
                <div className="group/field">
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
                    Jumlah <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={assignQty}
                    onChange={(e) => setAssignQty(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-300 focus:bg-white outline-none transition-all font-bold text-slate-700"
                  />
                </div>

                <div className="group/field">
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
                    Kondisi Awal
                  </label>
                  <select
                    value={assignCondition}
                    onChange={(e) => setAssignCondition(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-300 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none"
                  >
                    <option value="Bagus">Bagus</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>
              </div>

              {/* Info Box */}
              {selectedItemId && (
                <div className="bg-sgd-50 border border-sgd-100 rounded-2xl p-5 flex items-start gap-4 animate-fade-in-up">
                  <div className="p-2 bg-white rounded-lg text-sgd-600 shadow-sm">
                    <FaSync className="animate-spin-slow" size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-sgd-800 font-bold leading-relaxed">
                      Sistem akan otomatis mengurangi stok utama sebanyak <span className="text-sgd-600 font-black">{assignQty} unit</span> dan data akan langsung tersinkron ke PWA Teknisi.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50 shrink-0">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewPersonName('');
                  setSelectedItemId('');
                  setSelectedItemName('');
                  setAssignQty(1);
                  setAssignCondition('Bagus');
                }}
                className="flex-1 py-4 px-6 text-sm font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
              >
                Batal
              </button>
              <button
                onClick={handleSavePersonnel}
                className="flex-[2] py-4 px-6 bg-slate-900 hover:bg-sgd-600 text-white font-black rounded-2xl transition-all shadow-xl hover:shadow-sgd-200 active:scale-95 uppercase tracking-widest text-sm"
              >
                Simpan Penugasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Personnel Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden flex flex-col shadow-2xl border border-white/20">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white flex-shrink-0 text-left relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-4 relative z-10">
                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg ring-4 ring-blue-50">
                  <FaEdit size={20} />
                </div>
                EDIT PENUGASAN
              </h2>
              <p className="text-sm text-slate-500 mt-2 font-medium tracking-wide">Sesuaikan data aset yang sedang dibawa personel</p>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-white">
              {/* Personnel Name */}
              <div className="group/field">
                <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest group-focus-within/field:text-blue-600 transition-colors">
                  Nama Personel <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/field:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    value={editPersonName}
                    onChange={(e) => setEditPersonName(e.target.value)}
                    placeholder="Contoh: John Doe"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
              </div>

              {/* Item Name (Static) */}
              <div className="group/field">
                <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
                  Nama Barang (Tetap)
                </label>
                <div className="relative">
                  <FaToolbox className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-200" />
                  <input
                    type="text"
                    value={editingItem.nama}
                    disabled
                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 text-slate-400 rounded-2xl outline-none cursor-not-allowed font-bold"
                  />
                </div>
              </div>

              {/* Quantity and Condition */}
              <div className="grid grid-cols-2 gap-6">
                <div className="group/field">
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
                    Jumlah <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editQty}
                    onChange={(e) => setEditQty(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-300 focus:bg-white outline-none transition-all font-bold text-slate-700"
                  />
                </div>

                <div className="group/field">
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
                    Kondisi
                  </label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-300 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none"
                  >
                    <option value="Bagus">Bagus</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50 shrink-0">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
                className="flex-1 py-4 px-6 text-sm font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
              >
                Batal
              </button>
              <button
                onClick={handleUpdatePersonnel}
                className="flex-[2] py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl hover:shadow-blue-200 active:scale-95 uppercase tracking-widest text-sm"
              >
                Perbarui Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarisOrang;