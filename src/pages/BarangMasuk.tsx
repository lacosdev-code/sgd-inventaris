import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FiPackage, FiPlus, FiCheck, FiCalendar, FiSearch, FiFilter, FiAlertCircle } from 'react-icons/fi';
import Swal from 'sweetalert2';

interface BarangMasukItem {
    id: number;
    nama_barang: string;
    jumlah: number;
    satuan: string;
    kondisi: string;
    sumber_proyek: string;
    lokasi_gudang: string;
    keterangan: string | null;
    dibawa_oleh: string | null;
    diterima_oleh: string | null;
    tanggal_masuk: string;
    status: 'pending' | 'masuk_inventaris';
    inventaris_id: number | null;
    created_at: string;
}

interface InventarisItem {
    id: number;
    nama: string;
    jumlah_tersedia: number;
}

const BarangMasuk: React.FC = () => {
    const [items, setItems] = useState<BarangMasukItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'masuk_inventaris'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [inventarisList, setInventarisList] = useState<InventarisItem[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        nama_barang: '',
        jumlah: 1,
        satuan: 'pcs',
        kondisi: 'Bagus',
        sumber_proyek: '',
        lokasi_gudang: 'Gudang Utama',
        keterangan: '',
        dibawa_oleh: '',
        diterima_oleh: '',
        tanggal_masuk: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        fetchBarangMasuk();
        fetchInventarisList();
    }, []);

    const fetchBarangMasuk = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('barang_masuk')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (error: any) {
            console.error('Error fetching barang masuk:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchInventarisList = async () => {
        const { data } = await supabase
            .from('inventaris_utama')
            .select('id, nama, jumlah_tersedia')
            .order('nama');
        setInventarisList(data || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nama_barang.trim() || !formData.sumber_proyek.trim()) {
            Swal.fire('Error', 'Nama barang dan sumber proyek wajib diisi', 'error');
            return;
        }

        try {
            const { error } = await supabase.from('barang_masuk').insert([{
                nama_barang: formData.nama_barang.trim(),
                jumlah: formData.jumlah,
                satuan: formData.satuan,
                kondisi: formData.kondisi,
                sumber_proyek: formData.sumber_proyek.trim(),
                lokasi_gudang: formData.lokasi_gudang,
                keterangan: formData.keterangan || null,
                dibawa_oleh: formData.dibawa_oleh || null,
                diterima_oleh: formData.diterima_oleh || null,
                tanggal_masuk: formData.tanggal_masuk,
                status: 'pending',
            }]);

            if (error) throw error;

            await Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Barang masuk berhasil dicatat.',
                timer: 1500,
                showConfirmButton: false,
            });

            // Reset form
            setFormData({
                nama_barang: '',
                jumlah: 1,
                satuan: 'pcs',
                kondisi: 'Bagus',
                sumber_proyek: '',
                lokasi_gudang: 'Gudang Utama',
                keterangan: '',
                dibawa_oleh: '',
                diterima_oleh: '',
                tanggal_masuk: new Date().toISOString().split('T')[0],
            });
            setShowForm(false);
            fetchBarangMasuk();
        } catch (error: any) {
            Swal.fire('Gagal', error.message, 'error');
        }
    };

    const handleMasukInventaris = async (item: BarangMasukItem) => {
        // Ask: add to existing item or create new?
        const { value: choice } = await Swal.fire({
            title: `Masukkan ke Inventaris`,
            html: `
        <div class="text-left space-y-3">
          <p class="text-sm text-slate-500">Barang: <strong>${item.nama_barang}</strong> (${item.jumlah} ${item.satuan})</p>
          <p class="text-sm font-semibold text-slate-700">Pilih cara penambahan:</p>
        </div>
      `,
            input: 'radio',
            inputOptions: {
                'new': '➕ Tambahkan sebagai item BARU di Master Aset',
                'existing': '📦 Tambahkan ke item yang SUDAH ADA di Master Aset',
            },
            inputValue: 'new',
            confirmButtonText: 'Lanjutkan',
            confirmButtonColor: '#013220',
            showCancelButton: true,
            cancelButtonText: 'Batal',
        });

        if (!choice) return;

        if (choice === 'new') {
            // Create new item in inventaris_utama
            const { isConfirmed } = await Swal.fire({
                title: 'Konfirmasi Tambah Item Baru',
                html: `
          <div class="text-left space-y-2 text-sm">
            <p><span class="font-semibold">Nama:</span> ${item.nama_barang}</p>
            <p><span class="font-semibold">Jumlah:</span> ${item.jumlah} ${item.satuan}</p>
            <p><span class="font-semibold">Kondisi:</span> ${item.kondisi}</p>
            <p><span class="font-semibold">Lokasi:</span> ${item.lokasi_gudang}</p>
            <p class="text-slate-500 text-xs mt-2">Item baru akan dibuat di Master Aset dengan status tersedia.</p>
          </div>
        `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Ya, Buat Item Baru',
                confirmButtonColor: '#013220',
                cancelButtonText: 'Batal',
            });

            if (!isConfirmed) return;

            try {
                // Insert to inventaris_utama
                const { data: newItem, error: insertError } = await supabase
                    .from('inventaris_utama')
                    .insert([{
                        nama: item.nama_barang,
                        jumlah: item.jumlah,
                        jumlah_tersedia: item.jumlah,
                        kondisi: item.kondisi,
                        lokasi: item.lokasi_gudang,
                        keterangan: `Dari sisa proyek: ${item.sumber_proyek}${item.keterangan ? ` — ${item.keterangan}` : ''}`,
                    }])
                    .select('id')
                    .single();

                if (insertError) throw insertError;

                // Update barang_masuk status
                const { error: updateError } = await supabase
                    .from('barang_masuk')
                    .update({ status: 'masuk_inventaris', inventaris_id: newItem.id })
                    .eq('id', item.id);

                if (updateError) throw updateError;

                // Log activity
                await supabase.from('activity_logs').insert([{
                    user_email: 'Admin',
                    action: 'BARANG_MASUK',
                    table_name: 'inventaris_utama',
                    record_id: newItem.id,
                    details: {
                        type: 'Barang Masuk',
                        item_name: item.nama_barang,
                        jumlah: item.jumlah,
                        sumber: item.sumber_proyek,
                    },
                }]);

                Swal.fire('Berhasil!', `${item.nama_barang} ditambahkan ke Master Aset.`, 'success');
                fetchBarangMasuk();
                fetchInventarisList();
            } catch (err: any) {
                Swal.fire('Gagal', err.message, 'error');
            }

        } else {
            // Add to existing item
            const options = inventarisList.reduce((acc: any, inv) => {
                acc[inv.id] = `${inv.nama} (Tersedia: ${inv.jumlah_tersedia})`;
                return acc;
            }, {});

            const { value: selectedId } = await Swal.fire({
                title: 'Pilih Item di Master Aset',
                input: 'select',
                inputOptions: options,
                inputPlaceholder: '-- Pilih item --',
                showCancelButton: true,
                confirmButtonText: 'Tambahkan',
                confirmButtonColor: '#013220',
                cancelButtonText: 'Batal',
                inputValidator: (value) => {
                    if (!value) return 'Pilih item terlebih dahulu!';
                    return null;
                },
            });

            if (!selectedId) return;

            try {
                const selectedItem = inventarisList.find(i => i.id === parseInt(selectedId));
                if (!selectedItem) return;

                const newQty = selectedItem.jumlah_tersedia + item.jumlah;

                const { error: updateInvError } = await supabase
                    .from('inventaris_utama')
                    .update({ jumlah_tersedia: newQty })
                    .eq('id', parseInt(selectedId));

                if (updateInvError) throw updateInvError;

                // Update barang_masuk status
                const { error: updateError } = await supabase
                    .from('barang_masuk')
                    .update({ status: 'masuk_inventaris', inventaris_id: parseInt(selectedId) })
                    .eq('id', item.id);

                if (updateError) throw updateError;

                // Log activity
                await supabase.from('activity_logs').insert([{
                    user_email: 'Admin',
                    action: 'BARANG_MASUK',
                    table_name: 'inventaris_utama',
                    record_id: parseInt(selectedId),
                    details: {
                        type: 'Tambah Stok dari Sisa Proyek',
                        item_name: selectedItem.nama,
                        jumlah_tambah: item.jumlah,
                        sumber: item.sumber_proyek,
                    },
                }]);

                Swal.fire('Berhasil!', `Stok ${selectedItem.nama} bertambah ${item.jumlah} ${item.satuan}.`, 'success');
                fetchBarangMasuk();
                fetchInventarisList();
            } catch (err: any) {
                Swal.fire('Gagal', err.message, 'error');
            }
        }
    };

    const handleDelete = async (item: BarangMasukItem) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Hapus catatan ini?',
            text: `Catatan "${item.nama_barang}" akan dihapus.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus',
            confirmButtonColor: '#ef4444',
            cancelButtonText: 'Batal',
        });

        if (!isConfirmed) return;

        const { error } = await supabase.from('barang_masuk').delete().eq('id', item.id);
        if (error) {
            Swal.fire('Gagal', error.message, 'error');
        } else {
            fetchBarangMasuk();
        }
    };

    // Filter logic
    const filtered = items.filter(item => {
        const matchStatus = filterStatus === 'all' || item.status === filterStatus;
        const q = searchQuery.toLowerCase();
        const matchSearch = !q ||
            item.nama_barang.toLowerCase().includes(q) ||
            item.sumber_proyek.toLowerCase().includes(q) ||
            (item.dibawa_oleh || '').toLowerCase().includes(q) ||
            (item.diterima_oleh || '').toLowerCase().includes(q);
        return matchStatus && matchSearch;
    });

    const pendingCount = items.filter(i => i.status === 'pending').length;
    const masukCount = items.filter(i => i.status === 'masuk_inventaris').length;

    return (
        <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#013220] rounded-full blur-[80px] opacity-20 -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                            <FiPackage className="text-[#4ade80]" />
                            Barang Masuk
                        </h1>
                        <p className="text-slate-300">Pencatatan penerimaan barang sisa proyek ke gudang</p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-5 py-3 bg-[#013220] hover:bg-[#014d30] text-white rounded-2xl font-bold transition-all duration-200 shadow-lg shadow-md active:scale-95"
                    >
                        <FiPlus className="text-lg" />
                        Catat Barang Masuk
                    </button>
                </div>

                {/* Stats */}
                <div className="relative z-10 grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
                        <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Menunggu Proses</p>
                        <p className="text-3xl font-black text-yellow-400">{pendingCount}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
                        <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Sudah Masuk Inventaris</p>
                        <p className="text-3xl font-black text-emerald-400">{masukCount}</p>
                    </div>
                </div>
            </div>

            {/* Form Tambah Barang Masuk */}
            {showForm && (
                <div className="bg-white rounded-3xl shadow-modern border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-[#d1fae5] text-[#013220] rounded-xl">
                            <FiPlus className="text-xl" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Catat Barang Masuk Baru</h2>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Nama Barang */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Nama Barang <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={formData.nama_barang}
                                onChange={e => setFormData({ ...formData, nama_barang: e.target.value })}
                                placeholder="Contoh: Pipa PVC 1 inch, Kabel NYY 4x2.5mm"
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-900/30 focus:border-[#013220] text-sm font-medium transition-all bg-slate-50 focus:bg-white"
                                required
                            />
                        </div>

                        {/* Jumlah + Satuan */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Jumlah <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min={1}
                                    value={formData.jumlah}
                                    onChange={e => setFormData({ ...formData, jumlah: parseInt(e.target.value) || 1 })}
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-900/30 focus:border-[#013220] text-sm font-medium transition-all bg-slate-50 focus:bg-white"
                                />
                                <select
                                    value={formData.satuan}
                                    onChange={e => setFormData({ ...formData, satuan: e.target.value })}
                                    className="w-28 px-3 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-900/30 focus:border-[#013220] text-sm font-medium transition-all bg-slate-50 focus:bg-white"
                                >
                                    <option>pcs</option>
                                    <option>unit</option>
                                    <option>meter</option>
                                    <option>kg</option>
                                    <option>liter</option>
                                    <option>box</option>
                                    <option>roll</option>
                                    <option>set</option>
                                </select>
                            </div>
                        </div>

                        {/* Kondisi */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Kondisi</label>
                            <select
                                value={formData.kondisi}
                                onChange={e => setFormData({ ...formData, kondisi: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-900/30 focus:border-[#013220] text-sm font-medium transition-all bg-slate-50 focus:bg-white"
                            >
                                <option>Bagus</option>
                                <option>Baik</option>
                                <option>Perlu Perbaikan</option>
                                <option>Rusak Ringan</option>
                            </select>
                        </div>

                        {/* Sumber Proyek */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Sumber Proyek <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={formData.sumber_proyek}
                                onChange={e => setFormData({ ...formData, sumber_proyek: e.target.value })}
                                placeholder="Contoh: Proyek AC Gedung A Lt.3"
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-900/30 focus:border-[#013220] text-sm font-medium transition-all bg-slate-50 focus:bg-white"
                                required
                            />
                        </div>

                        {/* Lokasi Gudang */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Lokasi Gudang</label>
                            <input
                                type="text"
                                value={formData.lokasi_gudang}
                                onChange={e => setFormData({ ...formData, lokasi_gudang: e.target.value })}
                                placeholder="Gudang Utama"
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-900/30 focus:border-[#013220] text-sm font-medium transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>

                        {/* Tanggal Masuk */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Tanggal Masuk</label>
                            <input
                                type="date"
                                value={formData.tanggal_masuk}
                                onChange={e => setFormData({ ...formData, tanggal_masuk: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-900/30 focus:border-[#013220] text-sm font-medium transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>

                        {/* Diantar/Dibawa Oleh */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Diantar/Dibawa Oleh</label>
                            <input
                                type="text"
                                value={formData.dibawa_oleh}
                                onChange={e => setFormData({ ...formData, dibawa_oleh: e.target.value })}
                                placeholder="Siapa yang mengantar barang ke gudang"
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-900/30 focus:border-[#013220] text-sm font-medium transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>

                        {/* Diterima Di Gudang Oleh */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Diterima di Gudang Oleh</label>
                            <input
                                type="text"
                                value={formData.diterima_oleh}
                                onChange={e => setFormData({ ...formData, diterima_oleh: e.target.value })}
                                placeholder="Siapa yang menerima barang di gudang"
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-900/30 focus:border-[#013220] text-sm font-medium transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>

                        {/* Keterangan */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Keterangan</label>
                            <textarea
                                value={formData.keterangan}
                                onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                                placeholder="Catatan tambahan..."
                                rows={2}
                                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-900/30 focus:border-[#013220] text-sm font-medium transition-all bg-slate-50 focus:bg-white resize-none"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                style={{ backgroundColor: '#013220' }}
                                className="px-6 py-3 text-white rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 hover:opacity-90"
                            >
                                Simpan Catatan
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari nama barang, sumber proyek..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-900/30 focus:border-[#013220] bg-white transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'pending', 'masuk_inventaris'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${filterStatus === s
                                ? 'bg-[#013220] text-white shadow-lg shadow-md'
                                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            {s === 'all' ? 'Semua' : s === 'pending' ? '⏳ Pending' : '✅ Masuk Inventaris'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table / List */}
            {loading ? (
                <div className="py-20 text-center">
                    <div className="w-10 h-10 border-4 border-sgd-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Memuat Data...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white p-14 rounded-3xl text-center shadow-modern border border-slate-100">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <FiPackage className="text-3xl text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Belum Ada Catatan</h3>
                    <p className="text-slate-400 mt-2">Klik "Catat Barang Masuk" untuk menambahkan data pertama.</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-modern border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Barang</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Jumlah</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Kondisi</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Sumber Proyek</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Gudang</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Tanggal</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{item.nama_barang}</p>
                                                {item.keterangan && (
                                                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.keterangan}</p>
                                                )}
                                                {item.dibawa_oleh && (
                                                    <p className="text-xs text-slate-400 mt-0.5">🚚 Diantar: {item.dibawa_oleh}</p>
                                                )}
                                                {item.diterima_oleh && (
                                                    <p className="text-xs text-slate-400 mt-0.5">🏭 Diterima: {item.diterima_oleh}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-black text-slate-700">{item.jumlah}</span>
                                            <span className="text-slate-400 text-xs ml-1">{item.satuan}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${item.kondisi === 'Bagus' || item.kondisi === 'Baik'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                                                }`}>
                                                {item.kondisi}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-700 font-medium max-w-[160px] line-clamp-2">{item.sumber_proyek}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-500">{item.lokasi_gudang}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-500 whitespace-nowrap">
                                                {new Date(item.tanggal_masuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.status === 'pending' ? (
                                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-600 border border-yellow-100 rounded-xl text-xs font-bold">
                                                    <FiAlertCircle className="shrink-0" />
                                                    Menunggu
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-bold">
                                                    <FiCheck className="shrink-0" />
                                                    Sudah Masuk
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {item.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleMasukInventaris(item)}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-[#013220] hover:bg-[#014d30] text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-lg shadow-md active:scale-95"
                                                    >
                                                        <FiCheck />
                                                        Masuk Inventaris
                                                    </button>
                                                )}
                                                {item.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        className="px-3 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all border border-transparent hover:border-red-100"
                                                    >
                                                        Hapus
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs text-slate-400 font-medium">
                            Menampilkan {filtered.length} dari {items.length} catatan
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BarangMasuk;
