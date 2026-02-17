import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
    FaFilePdf, FaFileExcel, FaChartBar, FaCalendarAlt,
    FaBox, FaExchangeAlt, FaTools, FaSearch
} from 'react-icons/fa';
import { FiX } from 'react-icons/fi';

const Laporan = () => {
    const [activeTab, setActiveTab] = useState('stok'); // stok, peminjaman, maintenance
    const [inventory, setInventory] = useState<any[]>([]);
    const [loans, setLoans] = useState<any[]>([]);
    const [maintenanceItems, setMaintenanceItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // State for PDF Preview
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // Date Filter
    const [startDate, setStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(
        new Date().toISOString().split('T')[0]
    );

    useEffect(() => {
        fetchData();
    }, [activeTab, startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'stok') {
                const { data, error } = await supabase.from('inventaris_utama').select('*');
                if (error) throw error;
                setInventory(data || []);
            }
            else if (activeTab === 'peminjaman') {
                const { data, error } = await supabase
                    .from('peminjaman')
                    .select('*')
                    .gte('tanggal_pinjam', startDate)
                    .lte('tanggal_pinjam', endDate)
                    .order('tanggal_pinjam', { ascending: false });
                if (error) throw error;
                setLoans(data || []);
            }
            else if (activeTab === 'maintenance') {
                const { data, error } = await supabase
                    .from('inventaris_utama')
                    .select('*')
                    .not('jadwal_servis_berikutnya', 'is', null)
                    .order('jadwal_servis_berikutnya', { ascending: true });
                if (error) throw error;

                // Filter items that actually have maintenance dates
                setMaintenanceItems(data || []);
            }
        } catch (error) {
            console.error("Error fetching report data:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- EXPORT FUNCTIONS ---

    // Helper to load image for PDF
    const loadImage = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
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
                    resolve(''); // Fallback if canvas fails
                }
            };
            img.onerror = () => resolve(''); // Fallback if load fails
        });
    };

    const generatePDF = async () => {
        const doc = new jsPDF();
        const title = activeTab === 'stok' ? 'LAPORAN STOK ASET' :
            activeTab === 'peminjaman' ? 'LAPORAN PEMINJAMAN' : 'JADWAL MAINTENANCE';

        // --- HEADER WITH LOGO ---
        try {
            const logoUrl = "https://ik.imagekit.io/Sgd/Logo%20Potrait.png?tr=w-200"; // Responsive resize
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

        // Report Title & Date
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(title, 14, 48);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Dicetak: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: idLocale })}`, 14, 54);

        if (activeTab === 'peminjaman') {
            doc.text(`Periode: ${format(new Date(startDate), 'dd MMM yyyy')} s/d ${format(new Date(endDate), 'dd MMM yyyy')}`, 14, 60);
        }

        // Data Preparation
        let head = [];
        let body = [];

        if (activeTab === 'stok') {
            head = [['Kode', 'Nama Alat', 'Kategori', 'Lokasi', 'Kondisi', 'Jumlah']];
            body = inventory.map(item => [
                item.kode_alat, item.nama, item.kategori, item.lokasi, item.kondisi,
                `${item.jumlah_tersedia}/${item.jumlah}`
            ]);
        } else if (activeTab === 'peminjaman') {
            head = [['Peminjam', 'Alat', 'Tgl Pinjam', 'Tgl Kembali', 'Status']];
            body = loans.map(loan => [
                loan.nama_peminjam, loan.nama_barang,
                format(new Date(loan.tanggal_pinjam), 'dd/MM/yy'),
                loan.tanggal_kembali ? format(new Date(loan.tanggal_kembali), 'dd/MM/yy') : '-',
                loan.status
            ]);
        } else {
            head = [['Nama Alat', 'Lokasi', 'Jadwal Servis', 'Status']];
            body = maintenanceItems.map(item => [
                item.nama, item.lokasi,
                item.jadwal_servis_berikutnya ? format(new Date(item.jadwal_servis_berikutnya), 'dd MMM yyyy', { locale: idLocale }) : '-',
                item.kondisi
            ]);
        }

        autoTable(doc, {
            startY: activeTab === 'peminjaman' ? 65 : 60,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: {
                fillColor: [1, 50, 32],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: { fontSize: 9, cellPadding: 3 },
            alternateRowStyles: { fillColor: [245, 250, 245] },
            didParseCell: (data) => {
                // Color Coding Logic
                if (data.section === 'body') {
                    const text = (data.cell.raw as string) || '';
                    const textLower = text.toLowerCase();

                    // --- STOK TAB ---
                    if (activeTab === 'stok') {
                        // Lokasi (Index 3)
                        if (data.column.index === 3) {
                            if (textLower.includes('gudang')) data.cell.styles.textColor = [105, 105, 105]; // DimGray
                            else if (textLower.includes('kantor')) data.cell.styles.textColor = [0, 80, 180]; // Strong Blue
                            else if (textLower.includes('lapangan')) data.cell.styles.textColor = [160, 82, 45]; // Sienna (Brownish)
                            else if (textLower.includes('produksi')) data.cell.styles.textColor = [200, 100, 0]; // Dark Orange
                            else if (textLower.includes('pos')) data.cell.styles.textColor = [75, 0, 130]; // Indigo
                            else data.cell.styles.textColor = [0, 0, 0]; // Default
                        }

                        // Kondisi (Index 4)
                        if (data.column.index === 4) {
                            data.cell.styles.fontStyle = 'bold';
                            if (textLower.includes('bagus') || textLower.includes('baik')) {
                                data.cell.styles.textColor = [0, 128, 0]; // Green
                            } else if (textLower.includes('rusak ringan')) {
                                data.cell.styles.textColor = [218, 165, 32]; // Goldenrod
                            } else if (textLower.includes('rusak berat') || textLower.includes('rusak')) {
                                data.cell.styles.textColor = [220, 20, 60]; // Red
                            } else if (textLower.includes('perlu perbaikan')) {
                                data.cell.styles.textColor = [147, 112, 219]; // MediumPurple
                            } else if (textLower.includes('hilang')) {
                                data.cell.styles.textColor = [128, 128, 128]; // Gray
                            }
                        }
                    }

                    // --- PEMINJAMAN TAB ---
                    if (activeTab === 'peminjaman' && data.column.index === 4) {
                        data.cell.styles.fontStyle = 'bold';
                        if (textLower === 'dipinjam') {
                            data.cell.styles.textColor = [218, 165, 32]; // Goldenrod
                        } else if (textLower === 'dikembalikan') {
                            data.cell.styles.textColor = [0, 100, 0]; // Dark Green
                        } else if (textLower === 'terlambat') {
                            data.cell.styles.textColor = [220, 20, 60]; // Red
                        }
                    }

                    // --- MAINTENANCE TAB ---
                    if (activeTab === 'maintenance') {
                        // Lokasi (Index 1)
                        if (data.column.index === 1) {
                            if (textLower.includes('gudang')) data.cell.styles.textColor = [105, 105, 105];
                            else if (textLower.includes('kantor')) data.cell.styles.textColor = [0, 80, 180];
                            else if (textLower.includes('lapangan')) data.cell.styles.textColor = [160, 82, 45];
                            else data.cell.styles.textColor = [0, 0, 0];
                        }
                        // Kondisi (Index 2)
                        if (data.column.index === 2) {
                            data.cell.styles.fontStyle = 'bold';
                            if (textLower.includes('bagus')) data.cell.styles.textColor = [0, 128, 0];
                            else if (textLower.includes('rusak')) data.cell.styles.textColor = [220, 20, 60];
                        }
                        // Status Jadwal (Index 4) - handled in map but let's color text too
                        if (data.column.index === 4) {
                            if (textLower.includes('lewat')) data.cell.styles.textColor = [220, 20, 60];
                            else if (textLower.includes('aman')) data.cell.styles.textColor = [0, 128, 0];
                        }
                    }
                }
            }
        });

        return doc;
    };

    const handlePreviewPDF = async () => {
        const doc = await generatePDF();
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setShowPdfPreview(true);
    };

    const exportPDF = async () => { // Keep for backward compatibility if needed, or just redirect
        const doc = await generatePDF();
        doc.save(`Laporan_${activeTab}_${Date.now()}.pdf`);
    };

    const exportExcel = () => {
        let data = [];
        let fileName = `Laporan_${activeTab}`;

        if (activeTab === 'stok') {
            data = inventory.map(item => ({
                'Kode Alat': item.kode_alat,
                'Nama': item.nama,
                'Kategori': item.kategori,
                'Lokasi': item.lokasi,
                'Kondisi': item.kondisi,
                'Total': item.jumlah,
                'Tersedia': item.jumlah_tersedia
            }));
        } else if (activeTab === 'peminjaman') {
            data = loans.map(loan => ({
                'Peminjam': loan.nama_peminjam,
                'Barang': loan.nama_barang,
                'Tgl Pinjam': loan.tanggal_pinjam,
                'Tgl Kembali': loan.tanggal_kembali,
                'Catatan': loan.catatan,
                'Status': loan.status
            }));
        } else {
            data = maintenanceItems.map(item => ({
                'Nama Alat': item.nama,
                'Lokasi': item.lokasi,
                'Kondisi Saat Ini': item.kondisi,
                'Jadwal Servis': item.jadwal_servis_berikutnya
            }));
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, activeTab);
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-slate-50 w-full animate-fade-in pb-20">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <FaChartBar className="text-[#013220]" /> Laporan & Analitik
                    </h1>
                    <p className="text-slate-500">Unduh laporan resmi untuk audit dan manajemen.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={exportExcel}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition shadow-sm font-semibold"
                    >
                        <FaFileExcel /> Excel
                    </button>
                    <button
                        onClick={handlePreviewPDF}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition shadow-sm font-semibold"
                    >
                        <FaFilePdf /> Preview PDF
                    </button>
                </div>
            </div>

            {/* FILTER & CONTROLS */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('stok')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'stok' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <div className="flex items-center gap-2"><FaBox /> Stok Aset</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('peminjaman')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'peminjaman' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <div className="flex items-center gap-2"><FaExchangeAlt /> Peminjaman</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'maintenance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <div className="flex items-center gap-2"><FaTools /> Maintenance</div>
                    </button>
                </div>

                {/* Date Filter (Only for Peminjaman) */}
                {activeTab === 'peminjaman' && (
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        <FaCalendarAlt className="text-slate-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium focus:ring-0 text-slate-700"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium focus:ring-0 text-slate-700"
                        />
                    </div>
                )}
            </div>

            {/* DATA TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-slate-400">Loading data...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                                <tr>
                                    {activeTab === 'stok' && (
                                        <>
                                            <th className="px-6 py-4">Kode</th>
                                            <th className="px-6 py-4">Nama Alat</th>
                                            <th className="px-6 py-4">Kategori</th>
                                            <th className="px-6 py-4">Lokasi</th>
                                            <th className="px-6 py-4">Kondisi</th>
                                            <th className="px-6 py-4 text-center">Stok</th>
                                        </>
                                    )}
                                    {activeTab === 'peminjaman' && (
                                        <>
                                            <th className="px-6 py-4">Peminjam</th>
                                            <th className="px-6 py-4">Barang</th>
                                            <th className="px-6 py-4">Tgl Pinjam</th>
                                            <th className="px-6 py-4">Tgl Kembali</th>
                                            <th className="px-6 py-4">Status</th>
                                        </>
                                    )}
                                    {activeTab === 'maintenance' && (
                                        <>
                                            <th className="px-6 py-4">Nama Alat</th>
                                            <th className="px-6 py-4">Lokasi</th>
                                            <th className="px-6 py-4">Kondisi Saat Ini</th>
                                            <th className="px-6 py-4">Jadwal Servis</th>
                                            <th className="px-6 py-4">Status Jadwal</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {activeTab === 'stok' && inventory.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{item.kode_alat}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{item.nama}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{item.kategori}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{item.lokasi}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.kondisi === 'Bagus' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {item.kondisi}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">
                                            {item.jumlah_tersedia} / {item.jumlah}
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'peminjaman' && loans.map((loan) => (
                                    <tr key={loan.id} className="hover:bg-slate-50/50 transition">
                                        <td className="px-6 py-4 font-bold text-slate-800">{loan.nama_peminjam}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{loan.nama_barang}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {format(new Date(loan.tanggal_pinjam), 'dd MMM yyyy', { locale: idLocale })}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {loan.tanggal_kembali ? format(new Date(loan.tanggal_kembali), 'dd MMM yyyy', { locale: idLocale }) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${loan.status === 'dipinjam' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {loan.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'maintenance' && maintenanceItems.map((item) => {
                                    const isLate = new Date(item.jadwal_servis_berikutnya) < new Date();
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                            <td className="px-6 py-4 font-bold text-slate-800">{item.nama}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{item.lokasi}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{item.kondisi}</td>
                                            <td className="px-6 py-4 font-mono text-slate-700">
                                                {item.jadwal_servis_berikutnya ? format(new Date(item.jadwal_servis_berikutnya), 'dd MMM yyyy', { locale: idLocale }) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isLate ? (
                                                    <span className="flex items-center gap-1 text-red-600 font-bold text-xs">
                                                        <FaSearch /> Lewat Jadwal
                                                    </span>
                                                ) : (
                                                    <span className="text-green-600 font-bold text-xs">Aman</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {((activeTab === 'stok' && inventory.length === 0) ||
                                    (activeTab === 'peminjaman' && loans.length === 0) ||
                                    (activeTab === 'maintenance' && maintenanceItems.length === 0)) && (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center text-slate-400">Tidak ada data untuk ditampilkan.</td>
                                        </tr>
                                    )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* PDF PREVIEW MODAL */}
            {showPdfPreview && pdfUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl flex flex-col shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-xl font-bold text-slate-800">Preview Laporan PDF</h3>
                            <button
                                onClick={() => setShowPdfPreview(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition"
                            >
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
                            <iframe
                                src={pdfUrl}
                                className="w-full h-full rounded-lg shadow-inner"
                                title="PDF Preview"
                            />
                        </div>

                        <div className="p-4 border-t flex justify-end gap-3 bg-white rounded-b-2xl">
                            <button
                                onClick={() => setShowPdfPreview(false)}
                                className="px-5 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition"
                            >
                                Tutup
                            </button>
                            <button
                                onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = pdfUrl;
                                    a.download = `Laporan_${activeTab}_${Date.now()}.pdf`;
                                    a.click();
                                }}
                                className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition flex items-center gap-2"
                            >
                                <FaFilePdf /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Laporan;
