import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { FiArrowLeft, FiTool, FiCheckCircle, FiAlertTriangle, FiXCircle, FiSave, FiClock, FiMapPin, FiBox, FiChevronRight } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import HandoverModal from '../components/HandoverModal';

const DetailAlat = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchItemDetails = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventaris_utama')
                .select('*')
                .or(`kode_alat.eq.${id},id.eq.${id}`)
                .single();

            if (error) throw error;
            setItem(data);

            const { data: logData } = await supabase
                .from('peminjaman')
                .select('*')
                .eq('barang_id', data.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (logData) {
                const mappedLogs = logData.map(l => ({
                    id: l.id,
                    created_at: l.created_at,
                    details: {
                        teknisi: l.peminjam,
                        type: l.status === 'dipinjam' ? 'Pinjam' : 'Kembali',
                        condition: l.status === 'dipinjam' ? l.kondisi_pinjam : l.kondisi_kembali,
                        status: l.status // keep original for logic if needed
                    }
                }));
                setLogs(mappedLogs);
            }

        } catch (error) {
            console.error("Error fetching item:", error);
            Swal.fire("Error", "Alat tidak ditemukan", "error");
            navigate('/utama');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchItemDetails();
        }
    }, [id]);

    const handleSuccessHandover = () => {
        setIsModalOpen(false);
        fetchItemDetails();
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-[3px] border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
            </div>
        </div>
    );

    if (!item) return null;

    const isAvailable = item.jumlah_tersedia > 0;

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-slate-900 font-sans selection:bg-slate-200 pb-32">

            {/* Navbar / Header */}
            <div className="fixed top-0 w-full z-20 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between transition-all">
                <button
                    onClick={() => navigate('/utama')}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100/80 transition-colors text-slate-800"
                >
                    <FiArrowLeft size={22} strokeWidth={2.5} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Inventory</span>
                    <span className="text-sm font-semibold tracking-tight text-slate-800">Detail Alat</span>
                </div>
                <div className="w-10"></div> {/* Spacer for balance */}
            </div>

            {/* Spacer for Fixed Header */}
            <div className="h-24"></div>

            {/* Main Content Area */}
            <div className="px-6 max-w-md mx-auto space-y-6">

                {/* 1. Main Card - Apple Style */}
                <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">

                    {/* Hero Image */}
                    <div className="h-64 bg-slate-50 relative group">
                        {item.foto_url ? (
                            <img src={item.foto_url} alt={item.nama} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                                <FiTool className="text-slate-300 text-6xl drop-shadow-sm" />
                            </div>
                        )}

                        {/* Gradient Overlay for Text Readability if needed, though we use clean white below */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-50"></div>

                        {/* Status Pill - Floating */}
                        <div className={`absolute top-6 right-6 px-4 py-1.5 rounded-full backdrop-blur-xl border border-white/20 shadow-sm flex items-center gap-2 ${isAvailable ? 'bg-white/90 text-emerald-600' : 'bg-white/90 text-amber-600'}`}>
                            <span className={`relative flex h-2.5 w-2.5`}>
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAvailable ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            </span>
                            <span className="text-[11px] font-bold tracking-wider uppercase">{isAvailable ? 'Tersedia' : 'Dipinjam'}</span>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-8 pt-6">
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2 leading-tight">{item.nama}</h1>
                            <div className="flex items-center gap-2">
                                <span className="bg-slate-100 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                                    {item.kode_alat}
                                </span>
                            </div>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-1 gap-6">

                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-blue-500">
                                    <FiMapPin size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Lokasi</p>
                                    <p className="font-semibold text-slate-700 text-lg">{item.lokasi || '-'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-purple-500">
                                    <FiCheckCircle size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Kondisi Fisik</p>
                                    <p className="font-semibold text-slate-700 text-lg capitalize">{item.kondisi || '-'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-orange-500">
                                    <FiBox size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Stok</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-bold text-slate-900 text-xl">{item.jumlah_tersedia}</span>
                                        <span className="text-slate-400 text-sm font-medium">/ {item.jumlah} Unit</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* 2. Log History - Minimalist List */}
                {logs.length > 0 && (
                    <div className="pt-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Aktivitas Terakhir</h3>
                        <div className="space-y-3">
                            {logs.map((log: any) => (
                                <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${log.details.type === 'Pinjam' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                            {log.details.type === 'Pinjam' ? '📤' : '📥'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{log.details.teknisi}</p>
                                            <p className="text-[11px] text-slate-400 font-medium">
                                                {format(new Date(log.created_at), 'dd MMM, HH:mm', { locale: idLocale })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${log.details.type === 'Pinjam' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                                            }`}>
                                            {log.details.type}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Action Bar (Glassmorphism) */}
            <div className="fixed bottom-0 left-0 w-full p-6 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 z-40 transition-all duration-300">
                <div className="max-w-md mx-auto">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm tracking-wide shadow-xl active:scale-[0.98] transition-all hover:bg-slate-800 hover:shadow-2xl flex items-center justify-center gap-3"
                    >
                        <FiSave size={18} />
                        <span>UPDATE STATUS / SERAH TERIMA</span>
                    </button>
                    {/* Safe Area for Home Indicator on iOS */}
                    <div className="h-2"></div>
                </div>
            </div>

            {/* Modal Injection */}
            {isModalOpen && (
                <HandoverModal
                    tool={item}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccessHandover}
                />
            )}

        </div>
    );
};

export default DetailAlat;
