import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FiTool, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import Swal from 'sweetalert2';

interface TechDashboardProps {
    techUser: any;
}

const TechDashboard: React.FC<TechDashboardProps> = ({ techUser }) => {
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMyAssets = async () => {
        try {
            setLoading(true);
            // 1. Fetch Permanent Assets from inventaris_orang 
            // ONLY select confirmed columns (kode_alat/foto_url might not exist - would cause silent error)
            const { data: permanentData, error: permError } = await supabase
                .from('inventaris_orang')
                .select('id, nama, orang, kondisi, technician_id')
                .eq('technician_id', techUser.id);

            if (permError) {
                console.error('[TechDashboard] Error fetching permanent assets:', permError);
                throw permError;
            }

            // 2. Fetch Active Loans (from peminjaman table)
            const { data: loanData, error: loanError } = await supabase
                .from('peminjaman')
                .select('*, inventaris_utama(*)')
                .eq('status', 'dipinjam')
                .ilike('peminjam', techUser.name.trim());

            if (loanError) {
                console.error('[TechDashboard] Error fetching loans:', loanError);
                throw loanError;
            }

            // 3. Map permanent assets to a consistent shape
            const permanentItems = (permanentData || []).map(item => ({
                id: item.id,
                nama: item.nama,
                kode_alat: '',       // not in inventaris_orang, use empty
                kondisi: item.kondisi,
                foto_url: null,      // not in inventaris_orang, use null
                source_type: 'permanent'
            }));


            // 4. Map loan assets
            const loanItems = (loanData || [])
                .filter(loan => loan.inventaris_utama)
                .map(loan => ({
                    ...loan.inventaris_utama,
                    id: `loan-${loan.id}`,
                    source_type: 'loan',
                    tgl_kembali: loan.tgl_kembali_rencana
                }));

            const combined = [...permanentItems, ...loanItems];
            setAssets(combined);
        } catch (error: any) {
            console.error('Error fetching tech assets:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (techUser?.id) {
            fetchMyAssets();
        }
    }, [techUser?.id]);

    const handleReportCondition = async (asset: any) => {
        const { value: formValues } = await Swal.fire({
            title: 'Lapor Kondisi Alat',
            html: `
                <div class="text-left mb-4">
                    <p class="text-sm font-semibold text-slate-500 mb-2">Alat: ${asset.nama}</p>
                    <select id="swal-kondisi" class="swal2-select w-full max-w-full text-base" style="display: flex;">
                        <option value="Bagus">Bagus</option>
                        <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                        <option value="Rusak">Rusak</option>
                    </select>
                    <textarea id="swal-catatan" class="swal2-textarea w-full max-w-full text-sm placeholder:text-slate-400 mt-4" placeholder="Detail kondisi atau masalah..." rows="3"></textarea>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Kirim Laporan',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#013220', // sgd-dark
            preConfirm: () => {
                const kondisi = (document.getElementById('swal-kondisi') as HTMLSelectElement).value;
                const catatan = (document.getElementById('swal-catatan') as HTMLTextAreaElement).value;
                return { kondisi, catatan };
            }
        });

        if (formValues) {
            try {
                // Update Asset Condition
                const { error: updateError } = await supabase
                    .from('inventaris_utama')
                    .update({ kondisi: formValues.kondisi })
                    .eq('id', asset.id);

                if (updateError) throw updateError;

                // Log Activity
                const { error: logError } = await supabase
                    .from('activity_logs')
                    .insert([{
                        action_type: 'REPORT_CONDITION',
                        details: {
                            item_id: asset.id,
                            item_name: asset.nama,
                            type: 'Lapor Kondisi',
                            teknisi: techUser.name,
                            condition: formValues.kondisi,
                            notes: formValues.catatan
                        }
                    }]);

                if (logError) throw logError;

                Swal.fire('Berhasil!', 'Laporan kondisi telah dikirim.', 'success');
                fetchMyAssets();
            } catch (error: any) {
                Swal.fire('Gagal', error.message, 'error');
            }
        }
    };

    return (
        <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sgd-500 rounded-full blur-[80px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-black mb-2">Selamat Datang, {techUser?.name}</h1>
                    <p className="text-slate-300">Portal Personel PT. Sunggiardi</p>
                </div>
            </div>

            {/* My Assets Section */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-sgd-100 text-sgd-600 rounded-xl">
                        <FiTool className="text-xl" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Aset Saya (Di Tangan)</h2>
                        <p className="text-sm text-slate-500">Daftar alat dan perlengkapan yang ditugaskan kepada Anda</p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-sgd-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400 font-bold tracking-widest uppercase text-sm">Memuat Aset...</p>
                    </div>
                ) : assets.length === 0 ? (
                    <div className="bg-white p-10 rounded-3xl text-center shadow-modern border border-slate-100">
                        <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <FiTool className="text-3xl" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Tidak Ada Aset</h3>
                        <p className="text-slate-400 mt-2">Belum ada alat tang ditugaskan kepada Anda saat ini.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {assets.map(asset => (
                            <div key={asset.id} className="relative bg-white rounded-[2rem] p-6 shadow-modern hover:shadow-modern-lg transition-all duration-300 border border-slate-100 flex flex-col group overflow-hidden">
                                {/* Decorative Background Gradient */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-sgd-50 rounded-full blur-2xl opacity-50 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-5">
                                        <div className="w-20 h-20 bg-slate-50 rounded-[1.25rem] border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:shadow-md transition-shadow">
                                            {asset.foto_url || asset.image_url ? (
                                                <img src={asset.foto_url || asset.image_url} alt={asset.nama} className="w-full h-full object-cover" />
                                            ) : (
                                                <FiTool className="text-slate-300 text-3xl" />
                                            )}
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm border ${asset.kondisi?.toLowerCase().includes('rusak') || asset.kondisi?.toLowerCase().includes('perbaikan') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                            {asset.kondisi?.toLowerCase().includes('rusak') || asset.kondisi?.toLowerCase().includes('perbaikan') ? <FiAlertCircle /> : <FiCheckCircle />}
                                            {asset.kondisi}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-black text-slate-800 line-clamp-2 leading-snug group-hover:text-sgd-600 transition-colors">{asset.nama}</h3>
                                    <div className="mt-2 mb-8 flex flex-wrap gap-2">
                                        <span className="inline-block text-[10px] font-black text-slate-500 bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200/60 shadow-sm uppercase tracking-wider">{asset.kode_alat}</span>
                                        <span className={`inline-block text-[10px] font-black px-2 py-1 rounded-lg border shadow-sm uppercase tracking-[0.1em] ${asset.source_type === 'permanent'
                                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                                            : 'bg-orange-50 text-orange-600 border-orange-100'
                                            }`}>
                                            {asset.source_type === 'permanent' ? 'TOOLKIT' : 'LOAN'}
                                        </span>
                                    </div>

                                    <div className="mt-auto pt-5 border-t border-slate-100/80">
                                        <button
                                            onClick={() => handleReportCondition(asset)}
                                            className="w-full py-3.5 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-sgd-500 hover:to-sgd-600 text-slate-600 hover:text-white rounded-2xl font-black transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-sgd-500/25 flex items-center justify-center gap-2 group/btn border border-slate-200 hover:border-transparent active:scale-95"
                                        >
                                            <FiAlertCircle className="text-lg group-hover/btn:rotate-12 transition-transform" />
                                            Lapor Kondisi
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TechDashboard;
