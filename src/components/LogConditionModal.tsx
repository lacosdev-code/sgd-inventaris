import React, { useState } from 'react';
import { FiCamera, FiX } from 'react-icons/fi';
import { supabase } from '../services/supabase';
import { uploadImage } from '../services/imagekit';
import Swal from 'sweetalert2';

interface LogConditionModalProps {
    items: any[];
    onSuccess: () => void;
    onClose: () => void;
}

const LogConditionModal: React.FC<LogConditionModalProps> = ({ items, onSuccess, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        teknisi: '',
        tipe: 'Pinjam',
        itemId: items[0]?.id || '',
        kondisi: 'Baik / Normal',
        catatan: ''
    });
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.teknisi) {
            Swal.fire('Error', 'Nama Teknisi wajib diisi!', 'error');
            return;
        }

        setLoading(true);
        try {
            // 1. Upload Image (Client-side)
            let photoUrl = '';
            if (file) {
                photoUrl = await uploadImage(file);
            }

            // 2. Call Atomic RPC Transaction
            const { data, error: rpcError } = await supabase.rpc('log_tool_handover', {
                p_item_id: parseInt(formData.itemId),
                p_teknisi: formData.teknisi,
                p_tipe: formData.tipe,
                p_kondisi: formData.kondisi,
                p_catatan: formData.catatan,
                p_photo_url: photoUrl
            });

            if (rpcError) throw rpcError;
            if (data && !data.success) throw new Error(data.message);

            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: `Log kondisi tersimpan. Stok baru: ${data.new_stock}`,
                timer: 2000,
                showConfirmButton: false
            });
            onSuccess();
        } catch (error: any) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-900">📝 Log Kondisi & Serah Terima</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <FiX className="text-xl text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Nama Teknisi</label>
                            <input
                                required
                                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-sgd-500 outline-none transition-all"
                                placeholder="Nama Teknisi"
                                value={formData.teknisi}
                                onChange={e => setFormData({ ...formData, teknisi: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Tipe Transaksi</label>
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                                {['Pinjam', 'Kembali'].map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, tipe: t })}
                                        className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${formData.tipe === t ? 'bg-white shadow-sm text-sgd-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Pilih Alat</label>
                        <select
                            className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-sgd-500 outline-none"
                            value={formData.itemId}
                            onChange={e => setFormData({ ...formData, itemId: e.target.value })}
                        >
                            {items.map(i => (
                                <option key={i.id} value={i.id}>{i.nama} ({i.kode_alat})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Kondisi Fisik</label>
                        <select
                            className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-sgd-500 outline-none"
                            value={formData.kondisi}
                            onChange={e => setFormData({ ...formData, kondisi: e.target.value })}
                        >
                            <option value="Baik / Normal">🟢 Baik / Normal</option>
                            <option value="Rusak Ringan">🟡 Rusak Ringan</option>
                            <option value="Rusak Berat">🔴 Rusak Berat</option>
                            <option value="Hilang">⚫ Hilang</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Bukti Foto</label>
                        {!preview ? (
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 text-slate-400 hover:bg-slate-50 cursor-pointer transition-colors group">
                                <FiCamera className="text-3xl mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold">Ambil / Upload Foto</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        ) : (
                            <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 aspect-video">
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => { setFile(null); setPreview(null); }}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <FiX />
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Catatan</label>
                        <textarea
                            className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-sgd-500 outline-none h-20 resize-none"
                            placeholder="Catatan tambahan..."
                            value={formData.catatan}
                            onChange={e => setFormData({ ...formData, catatan: e.target.value })}
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gold-gradient shadow-lg shadow-sgd-500/20 hover:shadow-xl transition-all disabled:opacity-50"
                        >
                            {loading ? 'Memproses...' : '🚀 Simpan Log'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LogConditionModal;
