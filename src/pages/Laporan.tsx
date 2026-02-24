import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FaFilePdf, FaFileExcel, FaCalendarAlt, FaDownload, FaChartPie, FaClipboardList, FaUsers, FaBoxOpen, FaCheckCircle } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const reportTypes = [
    {
        id: 'status_aset',
        title: 'Status Aset Terkini',
        icon: <FaBoxOpen className="text-sgd-500" />,
        desc: 'Daftar lengkap inventaris fisik, jumlah, lokasi, dan siapa yang memegang alat tersebut. Berguna untuk audit bulanan.',
        color: 'bg-sgd-50 border-sgd-200 hover:border-sgd-500'
    },
    {
        id: 'riwayat_pinjam',
        title: 'Riwayat Peminjaman',
        icon: <FaClipboardList className="text-amber-500" />,
        desc: 'Log semua alat yang dipinjam, status pengembalian, dan riwayat terlambat. Filter berdasarkan tanggal penting.',
        color: 'bg-amber-50 border-amber-200 hover:border-amber-500'
    },
    {
        id: 'kondisi_servis',
        title: 'Kondisi & Maintenance',
        icon: <FaChartPie className="text-blue-500" />,
        desc: 'Fokus pada alat-alat yang rusak, perlu perbaikan, atau jadwal servis rutinnya sudah mendekati / lewat.',
        color: 'bg-blue-50 border-blue-200 hover:border-blue-500'
    },
    {
        id: 'aset_personel',
        title: 'Pertanggungjawaban Teknisi',
        icon: <FaUsers className="text-purple-500" />,
        desc: 'Daftar semua alat operasional yang saat ini sedang dipegang oleh teknisi secara khusus per-orang.',
        color: 'bg-purple-50 border-purple-200 hover:border-purple-500'
    }
];

const Laporan = () => {
    const [selectedReport, setSelectedReport] = useState(reportTypes[0].id);
    const [startDate, setStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [isGenerating, setIsGenerating] = useState(false);

    // Preview states
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // Helpers
    const formatDate = (date: Date) => format(date, 'dd MMM yyyy', { locale: idLocale });

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

    const handleGenerateExcel = async () => {
        setIsGenerating(true);
        try {
            let data: any[] = [];
            let worksheetName = "Laporan";

            if (selectedReport === 'status_aset') {
                const { data: dbData, error } = await supabase.from('inventaris_utama').select('*, technicians(name)').order('nama');
                if (error) throw error;

                data = dbData.map(item => ({
                    'Kode Alat': item.kode_alat,
                    'Nama Barang': item.nama,
                    'Total Fisik': item.jumlah,
                    'Sisa Gudang': item.jumlah_tersedia,
                    'Kondisi': item.kondisi.toUpperCase(),
                    'Lokasi': item.lokasi,
                    'PIC / Teknisi': item.technicians ? item.technicians.name : '-'
                }));
                worksheetName = "Status Aset Terkini";
            }

            else if (selectedReport === 'riwayat_pinjam') {
                let query = supabase.from('peminjaman').select('*, inventaris_utama(nama, kode_alat)').order('tgl_pinjam', { ascending: false });
                if (startDate) query = query.gte('tgl_pinjam', startDate);
                if (endDate) query = query.lte('tgl_pinjam', endDate);

                const { data: dbData, error } = await query;
                if (error) throw error;

                data = dbData.map(item => ({
                    'ID Pinjam': item.id,
                    'Tgl Pinjam': item.tgl_pinjam,
                    'Peminjam': item.peminjam,
                    'Serah Terima': item.teknisi_pinjam || '-',
                    'Alat': item.barang_nama || item.inventaris_utama?.nama,
                    'Kode': item.inventaris_utama?.kode_alat,
                    'Rencana Kembali': item.tgl_kembali_rencana,
                    'Tgl Kembali Aktual': item.tgl_kembali_aktual || '-',
                    'Status': item.status.toUpperCase()
                }));
                worksheetName = "Riwayat Peminjaman";
            }

            else if (selectedReport === 'kondisi_servis') {
                const today = new Date().toISOString().split('T')[0];
                const nextMonth = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0];

                const { data: dbData, error } = await supabase.from('inventaris_utama')
                    .select('*')
                    .or(`kondisi.ilike.%rusak%,kondisi.ilike.%perbaikan%,jadwal_servis_berikutnya.lte.${nextMonth}`)
                    .order('nama');

                if (error) throw error;

                data = dbData.map(item => ({
                    'Kode Alat': item.kode_alat,
                    'Nama Barang': item.nama,
                    'Kondisi': item.kondisi.toUpperCase(),
                    'Jadwal Servis Berikutnya': item.jadwal_servis_berikutnya || '-',
                    'Sisa Hari': item.jadwal_servis_berikutnya ? Math.ceil((new Date(item.jadwal_servis_berikutnya).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : '-',
                    'PIC / Lokasi': item.lokasi
                }));
                worksheetName = "Kondisi dan Servis";
            }

            else if (selectedReport === 'aset_personel') {
                const { data: dbData, error } = await supabase.from('inventaris_utama')
                    .select('*, technicians(name)')
                    .not('assigned_to', 'is', null)
                    .order('assigned_to');

                if (error) throw error;

                data = dbData.map(item => ({
                    'Teknisi Pemegang': item.technicians?.name || '-',
                    'Kode Alat': item.kode_alat,
                    'Nama Barang': item.nama,
                    'Kondisi': item.kondisi.toUpperCase(),
                    'Lokasi': item.lokasi || '-'
                }));
                worksheetName = "Pertanggungjawaban Teknisi";
            }

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, worksheetName);
            XLSX.writeFile(workbook, `Laporan_${selectedReport}_${format(new Date(), 'yyyyMMdd')}.xlsx`);

            Swal.fire('Berhasil', 'Laporan Excel telah diunduh.', 'success');
        } catch (error: any) {
            Swal.fire('Gagal Membuat Laporan Excel', error.message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const generatePDFDocument = async () => {
        const doc = new jsPDF();
        const activeReportInfo = reportTypes.find(r => r.id === selectedReport);

        // Header Logo
        try {
            const logoUrl = "https://ik.imagekit.io/Sgd/Logo%20Potrait.png?tr=w-200";
            const logoData = await loadImage(logoUrl);
            if (logoData) {
                doc.addImage(logoData, 'PNG', 14, 10, 25, 25);
            }
        } catch (e) {
            console.warn("Logo failed to load", e);
        }

        // Header Text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(1, 50, 32);
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

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`LAPORAN: ${activeReportInfo?.title.toUpperCase()}`, 14, 48);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Dicetak: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: idLocale })}`, 14, 54);

        if (selectedReport === 'riwayat_pinjam') {
            doc.text(`Periode: ${formatDate(new Date(startDate))} s/d ${formatDate(new Date(endDate))}`, 14, 60);
        }

        let startY = selectedReport === 'riwayat_pinjam' ? 65 : 60;
        let head: string[][] = [];
        let body: any[][] = [];

        // Fetch Data for PDF
        if (selectedReport === 'status_aset') {
            const { data, error } = await supabase.from('inventaris_utama').select('*, technicians(name)').order('nama');
            if (error) throw error;

            head = [['NO', 'KODE ALAT', 'NAMA BARANG', 'STOK', 'TERSEDIA', 'KONDISI', 'LOKASI / PIC']];
            body = data.map((item, index) => [
                index + 1,
                item.kode_alat,
                item.nama,
                item.jumlah.toString(),
                item.jumlah_tersedia.toString(),
                item.kondisi.toUpperCase(),
                item.technicians ? item.technicians.name : item.lokasi
            ]);
        }
        else if (selectedReport === 'riwayat_pinjam') {
            let query = supabase.from('peminjaman').select('*, inventaris_utama(nama, kode_alat)').order('tgl_pinjam', { ascending: false });
            if (startDate) query = query.gte('tgl_pinjam', startDate);
            if (endDate) query = query.lte('tgl_pinjam', endDate);

            const { data, error } = await query;
            if (error) throw error;

            head = [['NO', 'TGL PINJAM', 'PEMINJAM', 'ALAT', 'STATUS', 'TGL KEMBALI']];
            body = data.map((item, index) => [
                index + 1,
                format(new Date(item.tgl_pinjam), 'dd/MM/yy'),
                item.peminjam,
                item.barang_nama || item.inventaris_utama?.nama || '-',
                item.status.toUpperCase(),
                item.tgl_kembali_aktual ? format(new Date(item.tgl_kembali_aktual), 'dd/MM/yy') : '-'
            ]);
        }
        else if (selectedReport === 'kondisi_servis') {
            const nextMonth = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0];
            const { data, error } = await supabase.from('inventaris_utama')
                .select('*')
                .or(`kondisi.ilike.%rusak%,kondisi.ilike.%perbaikan%,jadwal_servis_berikutnya.lte.${nextMonth}`)
                .order('nama');
            if (error) throw error;

            head = [['NO', 'KODE', 'NAMA BARANG', 'KONDISI', 'LOKASI', 'JADWAL SERVIS']];
            body = data.map((item, index) => [
                index + 1,
                item.kode_alat,
                item.nama,
                item.kondisi.toUpperCase(),
                item.lokasi,
                item.jadwal_servis_berikutnya ? formatDate(new Date(item.jadwal_servis_berikutnya)) : '-'
            ]);
        }
        else if (selectedReport === 'aset_personel') {
            const { data, error } = await supabase.from('inventaris_utama')
                .select('*, technicians(name)')
                .not('assigned_to', 'is', null)
                .order('assigned_to');
            if (error) throw error;

            head = [['NO', 'NAMA TEKNISI', 'KODE ALAT', 'NAMA BARANG', 'KONDISI']];
            body = data.map((item, index) => [
                index + 1,
                item.technicians?.name || '-',
                item.kode_alat,
                item.nama,
                item.kondisi.toUpperCase()
            ]);
        }

        // Draw Table
        autoTable(doc, {
            startY,
            head,
            body,
            theme: 'striped',
            headStyles: {
                fillColor: [1, 50, 32],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: { fontSize: 9, cellPadding: 3 },
            alternateRowStyles: { fillColor: [245, 250, 245] },
            didParseCell: (data) => {
                // Formatting specific columns
                if (data.section === 'body') {
                    const txt = (data.cell.raw as string) || '';
                    if (txt.toLowerCase().includes('rusak')) data.cell.styles.textColor = [220, 20, 60];
                    if (txt.toLowerCase().includes('bagus') || txt.toLowerCase().includes('dikembalikan')) {
                        data.cell.styles.textColor = [0, 128, 0];
                    }
                    if (txt.toLowerCase().includes('dipinjam') || txt.toLowerCase().includes('perbaikan')) {
                        data.cell.styles.textColor = [218, 165, 32];
                    }
                }
            }
        });

        return doc;
    };

    const handlePreviewPDF = async () => {
        setIsGenerating(true);
        try {
            const doc = await generatePDFDocument();
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
            setShowPdfPreview(true);
        } catch (error: any) {
            Swal.fire('Error', 'Gagal memuat pratinjau PDF: ' + error.message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadPDF = async () => {
        setIsGenerating(true);
        try {
            const doc = await generatePDFDocument();
            doc.save(`Laporan_${selectedReport}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            Swal.fire('Berhasil', 'Laporan PDF telah diunduh.', 'success');
        } catch (error: any) {
            Swal.fire('Error', 'Gagal membuat PDF: ' + error.message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white p-8 rounded-[2rem] shadow-modern border border-slate-100">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pusat Laporan & Analitik</h1>
                <p className="text-slate-500 mt-2 font-medium">Buat dan unduh laporan resmi untuk keperluan audit dan *track record* operasional.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Kiri: Pilihan Laporan */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">1. Pilih Jenis Laporan</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {reportTypes.map((report) => (
                            <button
                                key={report.id}
                                onClick={() => setSelectedReport(report.id)}
                                className={`text-left p-6 rounded-[2rem] border-2 transition-all duration-300 flex flex-col h-full ${selectedReport === report.id
                                    ? 'border-sgd-500 bg-sgd-50/50 shadow-md ring-4 ring-sgd-500/10'
                                    : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className={`text-3xl mb-4 ${selectedReport === report.id ? 'scale-110' : ''} transition-transform`}>
                                    {report.icon}
                                </div>
                                <h4 className={`font-black text-lg ${selectedReport === report.id ? 'text-sgd-600' : 'text-slate-800'}`}>
                                    {report.title}
                                </h4>
                                <p className="text-sm text-slate-500 mt-2 flex-grow">
                                    {report.desc}
                                </p>

                                {selectedReport === report.id && (
                                    <div className="mt-6 pt-4 border-t border-sgd-200/50 flex justify-end">
                                        <div className="w-8 h-8 bg-sgd-500 text-white rounded-full flex items-center justify-center shadow-md">
                                            <FaCheckCircle className="text-sm" />
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Kanan: Filter & Aksi */}
                <div className="space-y-6">
                    {/* Render Date Filter ONLY for Riwayat Pinjam */}
                    <div className={`transition-all duration-300 ${selectedReport === 'riwayat_pinjam' ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-modern">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FaCalendarAlt /> Filter Tanggal
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Mulai Tanggal</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-sgd-500/10 focus:border-sgd-500 outline-none transition-all font-bold text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Sampai Tanggal</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-sgd-500/10 focus:border-sgd-500 outline-none transition-all font-bold text-slate-700"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 italic">Filter berdasar tanggal peminjaman dibuat.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-8 rounded-[2rem] border border-slate-800 shadow-xl overflow-hidden relative">
                        {/* Decorative circle */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-sgd-500 rounded-full blur-[60px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>

                        <div className="relative z-10">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <FaChartPie className="text-sgd-500" /> Ringkasan Cepat
                            </h3>
                            <div className="space-y-3 mb-8">
                                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                    <span className="text-xs text-slate-400 font-bold uppercase">Report Mode</span>
                                    <span className="text-xs font-black text-sgd-400 uppercase tracking-widest">{selectedReport.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                    <span className="text-xs text-slate-400 font-bold uppercase">Format</span>
                                    <span className="text-xs font-black text-slate-100 italic uppercase">PDF / Excel Ready</span>
                                </div>
                            </div>

                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <FaDownload /> Generate Format
                            </h3>

                            <div className="space-y-4">
                                <button
                                    onClick={handleGenerateExcel}
                                    disabled={isGenerating}
                                    className="w-full py-4 px-6 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all shadow-sm border border-white/10 hover:border-white/20 flex items-center justify-between group disabled:opacity-50 active:scale-95"
                                >
                                    <div className="flex items-center gap-3">
                                        <FaFileExcel className="text-emerald-400 text-2xl" />
                                        <span>Download Data Excel</span>
                                    </div>
                                    <FaDownload className="text-slate-500 group-hover:text-emerald-400 group-hover:-translate-y-1 transition-all" />
                                </button>

                                <button
                                    onClick={handlePreviewPDF}
                                    disabled={isGenerating}
                                    className="w-full py-4 px-6 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl font-black transition-all shadow-xl shadow-white/5 flex items-center justify-between group disabled:opacity-50 active:scale-95 border-2 border-transparent hover:border-red-500/20"
                                >
                                    <div className="flex items-center gap-3">
                                        <FaFilePdf className="text-red-500 text-2xl" />
                                        <span>Buka Dokumen PDF</span>
                                    </div>
                                    <FaDownload className="text-slate-300 group-hover:text-red-500 group-hover:-translate-y-1 transition-all" />
                                </button>
                            </div>

                            {isGenerating && (
                                <div className="mt-6 flex items-center justify-center gap-3 text-sgd-300 text-sm font-bold animate-pulse">
                                    <div className="w-5 h-5 border-4 border-sgd-500 border-t-transparent rounded-full animate-spin"></div>
                                    Memproses Data...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PDF PREVIEW MODAL */}
            {showPdfPreview && pdfUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-8">
                    <div className="bg-white w-full max-w-5xl h-[95vh] rounded-[2rem] flex flex-col shadow-2xl animate-scale-up overflow-hidden border border-slate-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                                    <FaFilePdf className="text-xl" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 leading-tight">Preview Laporan Resmi</h3>
                                    <p className="text-xs text-slate-500 font-medium">Bentuk tampilan saat dicetak</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPdfPreview(false)}
                                className="p-3 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 rounded-xl transition-all shadow-sm active:scale-95"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Iframe Body */}
                        <div className="flex-1 bg-slate-800 p-4 sm:p-8 overflow-hidden rounded-b-[2rem] relative">
                            <div className="absolute inset-0 bg-slate-900 opacity-50 pointer-events-none"></div>
                            <iframe
                                src={pdfUrl}
                                className="w-full h-full rounded-xl shadow-2xl relative z-10 border border-slate-700 bg-slate-100"
                                title="PDF Preview"
                            />

                            {/* Floating Download Button over PDF */}
                            <div className="absolute bottom-12 right-12 z-20">
                                <button
                                    onClick={handleDownloadPDF}
                                    className="px-6 py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-900/50 hover:bg-red-500 hover:shadow-red-900/80 hover:-translate-y-1 transition-all flex items-center gap-3 active:scale-95 border border-red-400"
                                >
                                    <FaDownload className="text-lg" /> Simpan Ke Perangkat (PDF)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Laporan;
