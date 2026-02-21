import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { FaHistory, FaUserShield, FaInfoCircle, FaSearch } from 'react-icons/fa';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Swal from 'sweetalert2';

const ActivityLog = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('activity-logs-full')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          setLogs(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const styles: any = {
      'CREATE': 'bg-green-100 text-green-700',
      'UPSERT': 'bg-white text-slate-700 border border-slate-200', // Compatible with useInventaris
      'UPDATE': 'bg-white text-slate-700 border border-slate-200',
      'DELETE (SOFT)': 'bg-red-100 text-red-700',
      'SOFT_DELETE': 'bg-red-100 text-red-700', // Compatible with useInventaris
      'RESTORE': 'bg-purple-100 text-purple-700'
    };
    return styles[action] || 'bg-slate-100 text-slate-700';
  };

  const filteredLogs = logs.filter(log =>
    (log.user_email && log.user_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 w-full animate-fade-in">

      <div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <FaHistory className="text-[#013220]" /> History Log Aktivitas
            </h1>
            <p className="text-slate-500">Audit trail semua perubahan data sistem inventaris</p>
          </div>
          <div className="relative w-full md:w-80">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari user atau aksi..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-[#013220]"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Timeline Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Aksi</th>
                  <th className="px-6 py-4">Target Data</th>
                  <th className="px-6 py-4 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="py-20 text-center text-slate-400">Menarik data log...</td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-slate-400">Belum ada aktivitas tercatat.</td></tr>
                ) : filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-slate-900">
                        {log.created_at ? format(new Date(log.created_at), 'dd MMM yyyy', { locale: idLocale }) : '-'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {log.created_at ? format(new Date(log.created_at), 'HH:mm:ss') : '-'} WIB
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaUserShield className="text-slate-400" />
                        <span className="text-sm text-slate-700 font-medium">{log.user_email || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 font-mono">
                        {log.table_name ? log.table_name.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'N/A'}
                        <span className="text-xs text-slate-400 ml-1">#{log.record_id}</span>
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          const isConditionLog = log.action === 'CONDITION_LOG';
                          const details = log.details || {};

                          if (isConditionLog) {
                            Swal.fire({
                              title: '<span class="text-2xl font-black text-slate-900">Detail Handover</span>',
                              html: `
                                <div class="text-left space-y-4 p-2">
                                  ${details.photo_url ? `
                                    <div class="mb-4 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                                      <img src="${details.photo_url}" class="w-full h-auto object-cover max-h-64" alt="Bukti Foto" 
                                           onerror="this.src='https://placehold.co/600x400?text=Foto+Tidak+Tersedia'"/>
                                    </div>
                                  ` : ''}
                                  <div class="grid grid-cols-2 gap-4">
                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                      <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Teknisi</p>
                                      <p class="text-sm font-bold text-slate-800">${details.teknisi || '-'}</p>
                                    </div>
                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                      <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Status</p>
                                      <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${details.type === 'Pinjam' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}">
                                        ${details.type || '-'}
                                      </span>
                                    </div>
                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                                      <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Nama Alat</p>
                                      <p class="text-sm font-bold text-slate-800">${details.item_name || '-'}</p>
                                    </div>
                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                                      <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Kondisi Saat Ini</p>
                                      <p class="text-sm font-semibold text-slate-700">${details.condition || '-'}</p>
                                    </div>
                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                                      <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Catatan</p>
                                      <p class="text-sm text-slate-600 italic">${details.notes || 'Tidak ada catatan'}</p>
                                    </div>
                                  </div>
                                </div>
                              `,
                              confirmButtonColor: '#C5A02D',
                              confirmButtonText: 'Tutup',
                              width: '500px',
                              customClass: {
                                popup: 'rounded-[1.5rem]',
                              }
                            });
                          } else {
                            Swal.fire({
                              title: 'Detail Perubahan',
                              html: `<div class="text-left bg-slate-100 p-4 rounded-lg text-xs font-mono overflow-auto max-h-60">
                                ${JSON.stringify(log.details, null, 2)}
                              </div>`,
                              confirmButtonColor: '#013220',
                              confirmButtonText: 'Tutup'
                            });
                          }
                        }}
                        className="text-[#013220] hover:text-[#002618] transition"
                        title="Lihat Detail"
                      >
                        <FaInfoCircle size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;