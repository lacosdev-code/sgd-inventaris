import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FiTool, FiCamera, FiSave, FiUser, FiSearch, FiClock } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import LogConditionModal from '../components/LogConditionModal';

const KondisiAlat = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchData();

        // Real-time subscription for activity_logs
        const channel = supabase
            .channel('activity-logs-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_logs',
                    filter: 'action=eq.CONDITION_LOG'
                },
                (payload) => {
                    console.log('Real-time update received:', payload);
                    setLogs(prevLogs => [payload.new, ...prevLogs]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Logs (Filter for CONDITION_LOG)
            const { data: logData, error: logError } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('action', 'CONDITION_LOG')
                .order('created_at', { ascending: false });

            if (logError) throw logError;
            setLogs(logData || []);

            // 2. Fetch Inventory for Dropdown
            const { data: itemData, error: itemError } = await supabase
                .from('inventaris_utama')
                .select('id, nama, kode_alat')
                .eq('is_deleted', false)
                .order('nama', { ascending: true });

            if (itemError) throw itemError;
            setItems(itemData || []);

        } catch (error: any) {
            console.error('Error fetching data:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogCondition = () => {
        setIsModalOpen(true);
    };

    const filteredLogs = logs.filter(log =>
        JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-white p-8 rounded-3xl shadow-modern-lg border border-gray-100/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sgd-100 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-sgd-50 rounded-xl">
                            <FiTool className="text-sgd-600 text-xl" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kondisi & Serah Terima</h1>
                            <p className="text-slate-500 font-medium">Log kondisi fisik alat dan pertanggungjawaban teknisi</p>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64 group">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sgd-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Cari log..."
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-sgd-500 outline-none shadow-sm"
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleLogCondition}
                            className="bg-gold-gradient text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <FiSave /> Buat Log Baru
                        </button>
                    </div>
                </div>
            </div>

            {/* Log Feed */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20 text-slate-400">Loading logs...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                        <p className="text-slate-400 font-semibold">Belum ada log kondisi alat.</p>
                    </div>
                ) : (
                    filteredLogs.map((log) => {
                        const details = log.details || {};
                        const isIssue = details.condition && details.condition.toLowerCase().includes('rusak');
                        const isLost = details.condition && details.condition.toLowerCase().includes('hilang');

                        let statusColor = 'bg-green-100 text-green-700';
                        if (isIssue) statusColor = 'bg-yellow-100 text-yellow-700';
                        if (isLost) statusColor = 'bg-red-100 text-red-700';

                        return (
                            <div key={log.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${statusColor}`}>
                                        {isLost ? '⚫' : isIssue ? '⚠️' : '✓'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-900 text-lg">{details.item_name || 'Unknown Item'}</h3>
                                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-lg ${details.type === 'Pinjam' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {details.type || 'LOG'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <FiUser /> <span className="font-semibold text-slate-700">{details.teknisi || 'Unknown'}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <FiClock /> <span>{format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}</span>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-slate-600 bg-slate-50 p-3 rounded-lg text-sm italic border border-slate-100">
                                            "{details.notes || 'Tidak ada catatan.'}"
                                        </p>
                                        <p className="mt-2 text-xs font-bold text-slate-500">Kondisi: <span className={isIssue || isLost ? 'text-red-600' : 'text-green-600'}>{details.condition}</span></p>
                                    </div>
                                </div>

                                {/* Action / Photo Placeholder */}
                                <div className="flex flex-col gap-2 shrink-0">
                                    {/* Action / Photo Placeholder */}
                                    <div className="flex flex-col gap-2 shrink-0">
                                        {details.photo_url ? (
                                            <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:scale-105 transition-transform" onClick={() => Swal.fire({ imageUrl: details.photo_url, showConfirmButton: false })}>
                                                <img src={details.photo_url} alt="Bukti" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 border border-dashed border-slate-200">
                                                <FiCamera title="Tidak ada foto" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {isModalOpen && (
                <LogConditionModal
                    items={items}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default KondisiAlat;
