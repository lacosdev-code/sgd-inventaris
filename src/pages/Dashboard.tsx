import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '../services/supabase';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { FaBox, FaExclamationTriangle, FaExchangeAlt, FaMapMarkerAlt, FaCheckCircle, FaSpinner, FaCalendarTimes, FaUsers } from 'react-icons/fa';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBarang: 0,
    barangBagus: 0,
    barangRusak: 0,
    totalPinjam: 0,
    maintenanceCount: 0,
    lokasiData: {} as any,
    totalPersonnel: 0,
    personnelItemsData: {} as any
  });
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();

    // Real-time subscription for activity_logs
    const channel = supabase
      .channel('dashboard-recent-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          setRecentLogs(prev => [payload.new, ...prev.slice(0, 4)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Ambil data inventaris utama
      const { data: items, error: itemsError } = await supabase.from('inventaris_utama').select('*');

      if (itemsError) throw itemsError;

      // 2. Ambil data peminjaman aktif
      const { data: loans, error: loansError } = await supabase
        .from('peminjaman')
        .select('*')
        .eq('status', 'dipinjam');

      // 3. Ambil data inventaris per orang
      const { data: personnelItems } = await supabase
        .from('inventaris_orang')
        .select('*');

      if (items) {
        // Normalisasi kondisi agar case-insensitive
        const bagus = items.filter(i => i.kondisi?.toLowerCase() === 'bagus' || i.kondisi?.toLowerCase() === 'baik').length;
        const rusak = items.filter(i => i.kondisi?.toLowerCase() === 'rusak' || i.kondisi?.toLowerCase() === 'perlu perbaikan').length;

        // Logika Maintenance Alert (Jadwal Servis)
        const today = new Date();
        const needsMaintenance = items.filter((item: any) => {
          if (!item.jadwal_servis_berikutnya) return false;
          const nextService = new Date(item.jadwal_servis_berikutnya);
          // Cek jika tanggal servis <= hari ini (sudah waktunya atau terlambat)
          return nextService <= today;
        });

        // Hitung sebaran lokasi
        const lokasiMap = items.reduce((acc: any, curr: any) => {
          const loc = curr.lokasi ? curr.lokasi.trim() : 'Gudang';
          acc[loc] = (acc[loc] || 0) + 1;
          return acc;
        }, {});

        // Hitung statistik personel
        const personnelMap: any = {};

        // Count permanent items per person
        if (personnelItems) {
          personnelItems.forEach((item: any) => {
            const person = item.orang;
            personnelMap[person] = (personnelMap[person] || 0) + (item.jumlah || 1);
          });
        }

        // Count active loans per person
        if (loans) {
          loans.forEach((loan: any) => {
            const person = loan.peminjam;
            personnelMap[person] = (personnelMap[person] || 0) + 1;
          });
        }

        // Sort by item count and take top 10
        const sortedPersonnel = Object.entries(personnelMap)
          .sort(([, a]: any, [, b]: any) => b - a)
          .slice(0, 10)
          .reduce((acc: any, [name, count]) => {
            acc[name] = count;
            return acc;
          }, {});

        setStats({
          totalBarang: items.length,
          barangBagus: bagus,
          barangRusak: rusak,
          totalPinjam: loans ? loans.length : 0,
          maintenanceCount: needsMaintenance.length,
          lokasiData: lokasiMap,
          totalPersonnel: Object.keys(personnelMap).length,
          personnelItemsData: sortedPersonnel
        });
      }

      // 4. Ambil data aktivitas terbaru
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (logs) setRecentLogs(logs);

    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const pieData = {
    labels: ['Kondisi Bagus', 'Kondisi Rusak'],
    datasets: [{
      data: [stats.barangBagus, stats.barangRusak],
      backgroundColor: [
        'rgba(16, 185, 129, 0.9)', // Modern Green
        'rgba(239, 68, 68, 0.9)'   // Modern Red
      ],
      borderColor: ['#10b981', '#ef4444'],
      borderWidth: 3,
      hoverOffset: 15,
      hoverBorderWidth: 4,
      hoverBorderColor: '#ffffff',
    }]
  };

  const barData = {
    labels: Object.keys(stats.lokasiData),
    datasets: [{
      label: 'Jumlah Barang',
      data: Object.values(stats.lokasiData),
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(197, 160, 45, 1)');
        gradient.addColorStop(1, 'rgba(197, 160, 45, 0.6)');
        return gradient;
      },
      borderRadius: 12,
      borderSkipped: false,
      hoverBackgroundColor: 'rgba(170, 133, 34, 1)',
    }]
  };

  const personnelBarData = {
    labels: Object.keys(stats.personnelItemsData),
    datasets: [{
      label: 'Jumlah Item',
      data: Object.values(stats.personnelItemsData),
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(147, 51, 234, 1)');
        gradient.addColorStop(1, 'rgba(147, 51, 234, 0.6)');
        return gradient;
      },
      borderRadius: 12,
      borderSkipped: false,
      hoverBackgroundColor: 'rgba(126, 34, 206, 1)',
    }]
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <FaSpinner className="animate-spin text-[#013220] text-4xl mx-auto mb-4" />
        <p className="text-gray-500">Menyusun Laporan...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 w-full animate-fade-in">

      <div>

        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Dashboard Inventaris</h1>
            <p className="text-gray-500">Ringkasan Aset & Operasional PT. Sunggiardi</p>
          </div>
          <div className="mt-4 md:mt-0 text-sm font-bold text-sgd-700 bg-gold-gradient-soft px-6 py-3 rounded-2xl border border-sgd-200 shadow-modern flex items-center gap-2">
            <span className="w-2 h-2 bg-sgd-500 rounded-full animate-pulse"></span>
            Live Update: {new Date().toLocaleTimeString('id-ID')}
          </div>
        </div>

        {/* Maintenance Alert Section - Only show if there are items needing maintenance */}
        {stats.maintenanceCount > 0 && (
          <div className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 p-8 rounded-3xl border border-red-200/50 shadow-modern-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-100 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-white rounded-2xl text-red-600 shadow-lg">
                  <FaCalendarTimes size={32} />
                </div>
                <div>
                  <h4 className="text-red-900 font-black flex items-center gap-2 text-xl mb-1">
                    Perlu Servis Berkala
                  </h4>
                  <p className="text-red-700 text-sm font-medium">Beberapa alat telah melewati jadwal servis rutin.</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-5xl font-black text-red-700">{stats.maintenanceCount}</p>
                <p className="text-sm font-semibold text-red-600 uppercase tracking-wider mt-1">Alat</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 1: Master Aset Perusahaan */}
        <div className="mb-3 md:mb-4">
          <h2 className="text-base md:text-lg font-bold text-slate-700 flex items-center gap-2">
            <FaBox className="text-[#013220] text-sm md:text-base" />
            Master Aset Perusahaan
          </h2>
          <p className="text-xs md:text-sm text-gray-500">Semua inventaris yang dimiliki perusahaan</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8 lg:mb-10">
          <StatCard
            icon={<FaBox />}
            title="Total Aset"
            value={stats.totalBarang}
            subtitle="Semua aset perusahaan"
            colorClass="bg-gradient-to-br from-blue-500 to-blue-600 text-white"
            onClick={() => navigate('/utama')}
          />
          <StatCard
            icon={<FaCheckCircle />}
            title="Siap Pakai"
            value={stats.barangBagus}
            subtitle="Kondisi bagus"
            colorClass="bg-gradient-to-br from-green-500 to-green-600 text-white"
            onClick={() => navigate('/utama')}
          />
          <StatCard
            icon={<FaExclamationTriangle />}
            title="Kondisi Rusak"
            value={stats.barangRusak}
            subtitle="Perlu perbaikan"
            colorClass="bg-gradient-to-br from-red-500 to-red-600 text-white"
            onClick={() => navigate('/utama')}
          />
        </div>

        {/* SECTION 2: Tracking Personel & Peminjaman */}
        <div className="mb-3 md:mb-4">
          <h2 className="text-base md:text-lg font-bold text-slate-700 flex items-center gap-2">
            <FaUsers className="text-purple-600 text-sm md:text-base" />
            Tracking Personel & Peminjaman
          </h2>
          <p className="text-xs md:text-sm text-gray-500">Aset yang dipinjam atau ditugaskan ke personel</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8">
          <StatCard
            icon={<FaExchangeAlt />}
            title="Sedang Dipinjam"
            value={stats.totalPinjam}
            subtitle="Pinjaman aktif"
            colorClass="bg-[#D4AF37]/20 text-[#D4AF37]"
            onClick={() => navigate('/peminjaman')}
          />
          <StatCard
            icon={<FaUsers />}
            title="Total Personel"
            value={stats.totalPersonnel}
            subtitle="Dengan aset tetap"
            colorClass="bg-purple-100 text-purple-600"
            onClick={() => navigate('/inventaris-orang')}
          />
        </div>

        {/* Grafik Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white to-green-50/30 p-10 rounded-3xl shadow-modern-lg border border-gray-100/50 hover:shadow-modern-xl transition-all duration-500 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
            <h3 className="relative text-xl font-black text-slate-900 mb-8 pb-4 border-b-2 border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-xl text-green-700 group-hover:scale-110 transition-transform duration-300">
                  <FaCheckCircle />
                </div>
                Persentase Kondisi Alat
              </div>
              <div className="text-sm font-semibold text-slate-500">
                Total: {stats.totalBarang} unit
              </div>
            </h3>
            <div className="h-64 relative">
              {stats.totalBarang === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 font-medium">Belum ada data</div>
              ) : (

                <Pie
                  data={pieData}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          usePointStyle: true,
                          padding: 20,
                          font: { size: 14, weight: 700, family: 'Outfit' },
                          color: '#1e293b',
                          generateLabels: (chart: any) => {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                              return data.labels.map((label: string, i: number) => {
                                const value = data.datasets[0].data[i];
                                const total = data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return {
                                  text: `${label}: ${value} (${percentage}%)`,
                                  fillStyle: data.datasets[0].backgroundColor[i],
                                  hidden: false,
                                  index: i
                                };
                              });
                            }
                            return [];
                          }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleFont: { size: 14, weight: 'bold', family: 'Outfit' },
                        bodyFont: { size: 13, family: 'Outfit' },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                          label: function (context: any) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} unit (${percentage}%)`;
                          }
                        }
                      }
                    },
                    animation: {
                      animateRotate: true,
                      animateScale: true,
                      duration: 1500,
                      easing: 'easeInOutQuart'
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white p-10 rounded-3xl shadow-modern-lg border border-gray-100/50 hover:shadow-modern-xl transition-all duration-500 group">
            <h3 className="text-xl font-black text-slate-900 mb-8 pb-4 border-b-2 border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-sgd-50 rounded-xl text-sgd-700 group-hover:scale-110 transition-transform duration-300">
                <FaMapMarkerAlt />
              </div>
              Sebaran Lokasi Alat
            </h3>
            <div className="h-64">
              {Object.keys(stats.lokasiData).length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 font-medium">Belum ada data</div>
              ) : (
                <Bar
                  data={barData}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleFont: { size: 14, weight: 'bold', family: 'Outfit' },
                        bodyFont: { size: 13, family: 'Outfit' },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                          label: function (context: any) {
                            return `Jumlah: ${context.parsed.y} unit`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(148, 163, 184, 0.1)',
                          lineWidth: 1
                        },
                        ticks: {
                          font: { size: 12, weight: 600, family: 'Outfit' },
                          color: '#64748b',
                          padding: 8
                        },
                        border: { display: false }
                      },
                      x: {
                        grid: { display: false },
                        ticks: {
                          font: { size: 12, weight: 700, family: 'Outfit' },
                          color: '#1e293b',
                          padding: 8
                        },
                        border: { display: false }
                      }
                    },
                    animation: {
                      duration: 1500,
                      easing: 'easeInOutQuart'
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Personnel Bar Chart */}
          <div className="bg-white p-10 rounded-3xl shadow-modern-lg border border-gray-100/50 hover:shadow-modern-xl transition-all duration-500 group">
            <h3 className="text-xl font-black text-slate-900 mb-8 pb-4 border-b-2 border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-xl text-purple-700 group-hover:scale-110 transition-transform duration-300">
                <FaUsers />
              </div>
              Distribusi Item Per Personel
            </h3>
            <div className="h-64">
              {Object.keys(stats.personnelItemsData).length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 font-medium">Belum ada data</div>
              ) : (
                <Bar
                  data={personnelBarData}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleFont: { size: 14, weight: 'bold', family: 'Outfit' },
                        bodyFont: { size: 13, family: 'Outfit' },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                          label: function (context: any) {
                            return `Jumlah: ${context.parsed.y} item`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(148, 163, 184, 0.1)',
                          lineWidth: 1
                        },
                        ticks: {
                          font: { size: 12, weight: 600, family: 'Outfit' },
                          color: '#64748b',
                          padding: 8
                        },
                        border: { display: false }
                      },
                      x: {
                        grid: { display: false },
                        ticks: {
                          font: { size: 12, weight: 700, family: 'Outfit' },
                          color: '#1e293b',
                          padding: 8
                        },
                        border: { display: false }
                      }
                    },
                    animation: {
                      duration: 1500,
                      easing: 'easeInOutQuart'
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Real-time Activity Feed Section */}
        <div className="mt-8 bg-white p-6 md:p-8 rounded-3xl shadow-modern border border-gray-100/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                Aktivitas Terbaru (Real-time)
              </h3>
              <p className="text-sm text-gray-500 mt-1">Monitoring langsung pergerakan alat di lapangan</p>
            </div>
            <button
              onClick={() => navigate('/log')}
              className="text-sm font-semibold text-[#C5A02D] hover:text-[#AA8522] transition-colors"
            >
              Lihat Semua Log
            </button>
          </div>

          <div className="space-y-4">
            {recentLogs.length === 0 ? (
              <div className="py-10 text-center text-gray-400 italic">
                Belum ada aktivitas terekam...
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${log.details?.type === 'Pinjam' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                    <FaExchangeAlt />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <p className="font-bold text-slate-800 truncate">
                        {log.details?.item_name || 'Alat'}
                      </p>
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                        {log.created_at ? format(new Date(log.created_at), 'HH:mm:ss') : '-'} WIB
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${log.details?.type === 'Pinjam' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                        {log.details?.type || 'Log'}
                      </span>
                      <p className="text-xs text-slate-500">
                        Oleh <span className="font-semibold">{log.details?.teknisi || 'System'}</span>
                      </p>
                      <span className="text-gray-300">•</span>
                      <p className="text-xs text-slate-400 italic truncate max-w-[200px]">
                        "{log.details?.notes || log.details?.condition || 'No notes'}"
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-komponen untuk Card Statistik
const StatCard = ({ icon, title, value, subtitle, colorClass, onClick }: any) => {
  return (
    <div onClick={onClick} className="group bg-white p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl shadow-modern hover:shadow-modern-lg border border-gray-100/50 flex items-center gap-3 md:gap-4 lg:gap-6 transition-all duration-500 hover:-translate-y-2 cursor-pointer overflow-hidden relative">
      <div className="absolute inset-0 bg-gold-gradient-soft opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className={`relative z-10 w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl lg:text-3xl shadow-lg ${colorClass} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-xs md:text-sm text-gray-500 font-semibold uppercase tracking-wider mb-0.5 md:mb-1">{title}</p>
        <h3 className="text-2xl md:text-3xl font-black text-slate-900">{value}</h3>
        {subtitle && (
          <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;