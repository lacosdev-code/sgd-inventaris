import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadImage } from '../services/imagekit';
import { FiTool, FiCamera, FiSave, FiUser, FiMoreHorizontal, FiSearch, FiClock, FiLoader } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const KondisiAlat = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
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

    const handleLogCondition = async () => {
        // Generate Item Options
        const itemOptions = items.map(i => `<option value="${i.id}" data-nama="${i.nama}" data-kode="${i.kode_alat}">${i.nama} (${i.kode_alat})</option>`).join('');


        const { value: formValues } = await Swal.fire({
            title: '<span class="text-2xl font-black text-slate-900">📝 Log Kondisi & Serah Terima</span>',
            html: `
        <div class="text-left space-y-4">
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1">Nama Teknisi</label>
              <input id="sw-tech" class="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-sgd-500 outline-none" placeholder="Nama Teknisi">
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1">Tipe Transaksi</label>
              <div class="flex gap-2">
                <label class="cursor-pointer flex items-center gap-2 border rounded-lg p-2 hover:bg-slate-50 transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-blue-200">
                  <input type="radio" name="sw-type" value="Pinjam" checked> <span class="text-sm font-medium text-slate-700">Pinjam</span>
                </label>
                <label class="cursor-pointer flex items-center gap-2 border rounded-lg p-2 hover:bg-slate-50 transition-colors has-[:checked]:bg-purple-50 has-[:checked]:border-purple-200">
                  <input type="radio" name="sw-type" value="Kembali"> <span class="text-sm font-medium text-slate-700">Kembali</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">Nama Alat</label>
            <select id="sw-item" class="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-sgd-500 outline-none">
              ${itemOptions}
            </select>
          </div>

          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">Kondisi Fisik</label>
            <select id="sw-condition" class="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-sgd-500 outline-none">
              <option value="Baik / Normal">🟢 Baik / Normal</option>
              <option value="Rusak Ringan">🟡 Rusak Ringan (Perlu Service)</option>
              <option value="Rusak Berat">🔴 Rusak Berat</option>
              <option value="Hilang">⚫ Hilang</option>
            </select>
          </div>

          <div>
             <label class="block text-sm font-bold text-slate-700 mb-1">Bukti Foto</label>
             <div class="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center text-slate-400 hover:bg-slate-50 cursor-pointer transition-colors relative group">
                <FiCamera class="mx-auto text-2xl mb-2" />
                <span class="text-xs font-semibold">Upload Foto Alat</span>
                <input type="file" id="sw-photo" class="absolute inset-0 opacity-0 cursor-pointer" accept="image/*">
             </div>
             <p class="text-[10px] text-slate-400 mt-1">*Sangat disarankan untuk bukti serah terima</p>
          </div>

          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">Catatan Tambahan</label>
            <textarea id="sw-notes" class="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-sgd-500 outline-none h-20 placeholder:text-sm" placeholder="Contoh: Kabel sedikit terkelupas..."></textarea>
          </div>

        </div>
      `,
            showCancelButton: true,
            confirmButtonText: '🚀 Proses Serah Terima',
            confirmButtonColor: '#C5A02D',
            cancelButtonText: 'Batal',
            width: '600px',
            focusConfirm: false,
            preConfirm: () => {
                const teknisi = (document.getElementById('sw-tech') as HTMLInputElement).value;
                const tipe = (document.querySelector('input[name="sw-type"]:checked') as HTMLInputElement).value;
                const itemSelect = document.getElementById('sw-item') as HTMLSelectElement;
                const itemId = itemSelect.value;
                const namaAlat = itemSelect.options[itemSelect.selectedIndex].getAttribute('data-nama');
                const kondisi = (document.getElementById('sw-condition') as HTMLSelectElement).value;
                const foto = (document.getElementById('sw-photo') as HTMLInputElement).files?.[0];
                const catatan = (document.getElementById('sw-notes') as HTMLTextAreaElement).value;

                if (!teknisi) {
                    Swal.showValidationMessage('Nama Teknisi wajib diisi!');
                    return false;
                }

                return { teknisi, tipe, itemId, namaAlat, kondisi, catatan, foto };
            }
        });

        if (formValues) {
            try {
                // Show Loading
                Swal.fire({
                    title: 'Memproses Transaksi...',
                    html: 'Mohon tunggu, sedang mengupload dan update data...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                // 1. Upload Image to ImageKit (if exists)
                let photoUrl = '';
                if (formValues.foto) {
                    try {
                        photoUrl = await uploadImage(formValues.foto);
                    } catch (uploadErr) {
                        console.error('Upload failed:', uploadErr);
                        throw new Error("Gagal upload foto. Periksa koneksi internet.");
                    }
                }

                // 2. Fetch Current Item Data for Validation
                const { data: currentItem, error: fetchError } = await supabase
                    .from('inventaris_utama')
                    .select('jumlah_tersedia, jumlah')
                    .eq('id', formValues.itemId)
                    .single();

                if (fetchError || !currentItem) throw new Error("Gagal mengambil data alat.");

                // 3. Calculate New Stock
                let newStock = currentItem.jumlah_tersedia;
                if (formValues.tipe === 'Pinjam') {
                    if (newStock <= 0) throw new Error("Stok habis! Tidak bisa meminjam alat ini.");
                    newStock -= 1;
                } else if (formValues.tipe === 'Kembali') {
                    newStock += 1;
                }

                // 4. Update Stock in Supabase
                const { error: updateError } = await supabase
                    .from('inventaris_utama')
                    .update({ jumlah_tersedia: newStock })
                    .eq('id', formValues.itemId);

                if (updateError) throw new Error("Gagal update stok alat.");

                // 5. Insert Log into activity_logs
                const logDetails = {
                    teknisi: formValues.teknisi,
                    type: formValues.tipe,
                    item_id: formValues.itemId, // Store ID
                    item_name: formValues.namaAlat,
                    condition: formValues.kondisi,
                    notes: formValues.catatan,
                    photo_url: photoUrl,
                    timestamp: new Date().toISOString()
                };

                const { error: logError } = await supabase
                    .from('activity_logs')
                    .insert([{
                        user_email: 'System Tracker',
                        action: 'CONDITION_LOG',
                        table_name: 'inventaris_utama',
                        record_id: parseInt(formValues.itemId),
                        details: logDetails
                    }]);

                if (logError) {
                    console.error("Log failed", logError);
                    Swal.fire('Warning', 'Stok terupdate tapi log gagal disimpan.', 'warning');
                } else {
                    // Success!

                    // 6. ALSO INSERT INTO TOOL_IMAGES (Gallery)
                    if (photoUrl) {
                        const { error: galleryError } = await supabase
                            .from('tool_images')
                            .insert({
                                tool_id: formValues.itemId,
                                image_url: photoUrl
                            });
                        if (galleryError) console.error("Gallery insert failed:", galleryError);
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Transaksi Berhasil!',
                        text: `Alat berhasil di-${formValues.tipe.toLowerCase()} oleh ${formValues.teknisi}. Stok sekarang: ${newStock}`,
                        confirmButtonColor: '#013220',
                        timer: 3000
                    });
                }

                fetchData(); // Refresh list

            } catch (err: any) {
                Swal.fire({
                    icon: 'error',
                    title: 'Transaksi Gagal',
                    text: err.message,
                    confirmButtonColor: '#ef4444'
                });
            }
        }
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

        </div>
    );
};

export default KondisiAlat;
