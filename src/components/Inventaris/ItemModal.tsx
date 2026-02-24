import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiUpload, FiTrash, FiPlus, FiImage, FiLoader, FiCheck, FiBox, FiEdit3 } from 'react-icons/fi';
import { supabase } from '../../services/supabase';
import { uploadToolImage } from '../../actions/uploadAction';
import Swal from 'sweetalert2';

interface ItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    itemToEdit?: any;
}

export default function ItemModal({ isOpen, onClose, onSuccess, itemToEdit }: ItemModalProps) {
    const [loading, setLoading] = useState(false);

    // Form States
    const [nama, setNama] = useState('');
    const [kode, setKode] = useState('');
    const [jumlah, setJumlah] = useState(0);
    const [tersedia, setTersedia] = useState(0);
    const [kondisi, setKondisi] = useState('bagus');
    const [lokasi, setLokasi] = useState('');

    // Image States
    const [existingImages, setExistingImages] = useState<string[]>([]); // URLs from DB
    const [newFiles, setNewFiles] = useState<File[]>([]); // Files to upload
    const [deletedImages, setDeletedImages] = useState<string[]>([]); // URLs to remove from DB link
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEdit = !!itemToEdit;

    useEffect(() => {
        if (isOpen) {
            if (itemToEdit) {
                setNama(itemToEdit.nama || '');
                setKode(itemToEdit.kode_alat || '');
                setJumlah(itemToEdit.jumlah || 0);
                setTersedia(itemToEdit.jumlah_tersedia || 0);
                setKondisi(itemToEdit.kondisi || 'bagus');
                setLokasi(itemToEdit.lokasi || '');

                // Initialize Images
                // Combine main photo (if any) and tool_images, avoiding duplicates
                const gallery = itemToEdit.tool_images?.map((img: any) => img.image_url) || [];
                const mainPhoto = itemToEdit.foto_url;
                const uniqueImages = new Set<string>();

                if (mainPhoto) uniqueImages.add(mainPhoto);
                gallery.forEach((url: string) => uniqueImages.add(url));

                setExistingImages(Array.from(uniqueImages));
            } else {
                // Reset for Add
                setNama('');
                setKode('');
                setJumlah(0);
                setTersedia(0);
                setKondisi('bagus');
                setLokasi('');
                setExistingImages([]);
            }
            // Always reset new files/deletions on open
            setNewFiles([]);
            setDeletedImages([]);
        }
    }, [isOpen, itemToEdit]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const totalImages = existingImages.length + newFiles.length + files.length;

            if (totalImages > 5) {
                Swal.fire("Batas Maksimal", "Maksimal 5 foto per barang.", "warning");
                return;
            }

            setNewFiles(prev => [...prev, ...files]);
        }
        // Reset input value to allow re-selecting same file if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeNewFile = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (url: string) => {
        setExistingImages(prev => prev.filter(img => img !== url));
        setDeletedImages(prev => [...prev, url]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nama || !kode || jumlah < 0) {
            Swal.fire("Validasi", "Nama, Kode, dan Jumlah wajib diisi dengan benar.", "warning");
            return;
        }

        setLoading(true);

        try {
            // 1. Upload New Files
            let uploadedUrls: string[] = [];
            if (newFiles.length > 0) {
                const formData = new FormData();
                newFiles.forEach(file => formData.append('files', file));

                const uploadRes = await uploadToolImage(formData);
                if (!uploadRes.success || !uploadRes.urls) {
                    throw new Error(uploadRes.error || "Gagal upload foto");
                }
                uploadedUrls = uploadRes.urls;
            }

            // 2. Prepare Main Photo URL
            // Logic: prefer first new upload, then first existing, then null
            // Or prioritize existing main photo if not deleted? 
            // Let's just take the first available image from the final set as "main"
            const finalImages = [...existingImages, ...uploadedUrls];
            const mainPhotoUrl = finalImages.length > 0 ? finalImages[0] : null;

            // 3. Upsert Item Data
            const payload = {
                nama,
                kode_alat: kode,
                jumlah,
                jumlah_tersedia: tersedia, // Or logic to auto-calc? Let's trust input for now or default to jumlah if 0/undefined on create
                kondisi,
                lokasi,
                foto_url: mainPhotoUrl
            };

            // Handle create logic for jumlah_tersedia if new
            if (!isEdit && (payload.jumlah_tersedia === 0 || isNaN(payload.jumlah_tersedia))) {
                payload.jumlah_tersedia = jumlah;
            }

            const { data: toolData, error: toolError } = await supabase
                .from('inventaris_utama')
                .upsert(isEdit ? { ...payload, id: itemToEdit.id } : payload)
                .select()
                .single();

            if (toolError) throw toolError;
            if (!toolData) throw new Error("Gagal menyimpan data alat.");

            const toolId = toolData.id;

            // 4. Handle Tool Images (Gallery)

            // A. Insert New Uploads
            if (uploadedUrls.length > 0) {
                const newImageRecords = uploadedUrls.map(url => ({
                    tool_id: toolId,
                    image_url: url
                }));
                const { error: insertError } = await supabase.from('tool_images').insert(newImageRecords);
                if (insertError) console.error("Error inserting new images:", insertError);
            }

            // B. Delete Removed Images
            if (deletedImages.length > 0) {
                const { error: deleteError } = await supabase
                    .from('tool_images')
                    .delete()
                    .eq('tool_id', toolId)
                    .in('image_url', deletedImages);
                if (deleteError) console.error("Error deleting old images from gallery:", deleteError);
            }

            // Also need to handle case where an image was in existingImages but NOT in tool_images (e.g. legacy foto_url only)
            // If it's now meant to be in gallery, we should insert it? 
            // For now, let's assume legacy flow: existingImages comes from (foto_url U tool_images).
            // If we deleted it, we removed it from the list.
            // If we didn't delete it, it's either already in tool_images OR it was just foto_url.
            // To be safe/clean: we could ensure all current `existingImages` are in `tool_images`.
            // But checking each might be expensive. 
            // Let's stick to: "Insert new uploads" and "Delete removed ones".
            // Legacy `foto_url` migration is an edge case we can handle if needed, but usually new system prefers `tool_images` as source of truth.

            await Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Data alat berhasil disimpan.',
                timer: 1500,
                showConfirmButton: false
            });

            onSuccess(); // Trigger parent refresh
            onClose();

        } catch (err: any) {
            Swal.fire("Error", err.message || "Gagal menyimpan.", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl animate-scale-up relative overflow-hidden flex flex-col max-h-[95vh] border border-white/20">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                            {isEdit ? <FiEdit3 className="text-sgd-300 text-xl" /> : <FiBox className="text-sgd-300 text-xl" />}
                        </div>
                        <div>
                            <h3 className="font-black text-xl tracking-tight leading-none">{isEdit ? 'Edit Data Aset' : 'Tambah Aset Baru'}</h3>
                            <p className="text-slate-400 text-xs mt-1 font-medium">{isEdit ? 'Perbarui informasi aset yang dipilih' : 'Masukkan detail aset baru ke dalam sistem'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/10 rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-all text-slate-300 group">
                        <FiX className="text-xl group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-slate-700">Nama Barang <span className="text-red-500">*</span></label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-400 focus:bg-white focus:ring-4 focus:ring-sgd-50 outline-none transition-all font-semibold text-slate-800 placeholder:text-slate-400"
                                    placeholder="Contoh: Mesin Bor"
                                    value={nama} onChange={e => setNama(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-slate-700">Kode Alat <span className="text-red-500">*</span></label>
                                <input
                                    className={`w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-400 focus:bg-white focus:ring-4 focus:ring-sgd-50 outline-none transition-all font-mono font-bold text-slate-800 placeholder:text-slate-400 ${isEdit ? 'bg-slate-100/80 text-slate-500 cursor-not-allowed border-transparent' : ''}`}
                                    placeholder="KODE-001"
                                    value={kode} onChange={e => !isEdit && setKode(e.target.value)}
                                    readOnly={isEdit}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-slate-700">Jumlah Total <span className="text-red-500">*</span></label>
                                <input type="number" min="0"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-400 focus:bg-white focus:ring-4 focus:ring-sgd-50 outline-none transition-all font-semibold text-slate-800"
                                    value={jumlah} onChange={e => setJumlah(parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-slate-700">Stok Tersedia</label>
                                <input type="number" min="0"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-400 focus:bg-white focus:ring-4 focus:ring-sgd-50 outline-none transition-all font-semibold text-slate-800"
                                    value={tersedia} onChange={e => setTersedia(parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-slate-700">Kondisi</label>
                                <div className="relative">
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-400 focus:bg-white focus:ring-4 focus:ring-sgd-50 outline-none transition-all font-bold text-slate-800 appearance-none"
                                        value={kondisi} onChange={e => setKondisi(e.target.value)}
                                    >
                                        <option value="bagus">Bagus</option>
                                        <option value="rusak">Rusak</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-slate-700">Lokasi</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-400 focus:bg-white focus:ring-4 focus:ring-sgd-50 outline-none transition-all font-semibold text-slate-800 placeholder:text-slate-400"
                                    placeholder="Gudang A"
                                    value={lokasi} onChange={e => setLokasi(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Image Section */}
                        <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-800">Foto Aset</label>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Unggah maksimal 5 foto dokumentasi</p>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 shadow-sm">{existingImages.length + newFiles.length} / 5</span>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                {/* Existing Images */}
                                {existingImages.map((url, idx) => (
                                    <div key={`exist-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden group border-2 border-slate-200 bg-white shadow-sm">
                                        <img src={url} alt="Existing" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => removeExistingImage(url)}
                                                className="bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600 transition-transform hover:scale-110"
                                            >
                                                <FiTrash size={14} />
                                            </button>
                                        </div>
                                        <div className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md">TERSIMPAN</div>
                                    </div>
                                ))}

                                {/* New File Previews */}
                                {newFiles.map((file, idx) => (
                                    <div key={`new-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden group border-2 border-emerald-400 bg-emerald-50 shadow-sm">
                                        <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => removeNewFile(idx)}
                                                className="bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600 transition-transform hover:scale-110"
                                            >
                                                <FiTrash size={14} />
                                            </button>
                                        </div>
                                        <div className="absolute top-2 left-2 bg-emerald-500/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md">BARU</div>
                                    </div>
                                ))}

                                {/* Add Button */}
                                {(existingImages.length + newFiles.length) < 5 && (
                                    <label className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:border-sgd-500 hover:bg-sgd-50 hover:shadow-md transition-all cursor-pointer group">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            multiple
                                            onChange={handleFileChange}
                                        />
                                        <div className="w-10 h-10 bg-slate-50 group-hover:bg-sgd-100 rounded-full flex items-center justify-center mb-2 transition-colors">
                                            <FiPlus className="text-xl text-slate-400 group-hover:text-sgd-600 transition-colors" />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-500 group-hover:text-sgd-700">Tambah Foto</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    </form>

                </div> {/* End scrollable area */}

                {/* Footer Action */}
                <div className="bg-slate-50 px-6 py-5 border-t border-slate-100 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-8 py-3 rounded-xl flex justify-center items-center gap-2 font-black transition-all shadow-lg active:scale-95 ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-br from-sgd-400 to-sgd-600 text-white hover:shadow-xl hover:shadow-sgd-500/30'}`}
                    >
                        {loading ? <><FiLoader className="animate-spin" /> MENYIMPAN...</> : "SIMPAN PERUBAHAN"}
                    </button>
                </div>
            </div>
        </div>
    );
}
