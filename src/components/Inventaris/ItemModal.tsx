import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiUpload, FiTrash, FiPlus, FiImage, FiLoader, FiCheck } from 'react-icons/fi';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-2xl animate-slide-up relative overflow-y-auto max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="font-black text-2xl text-slate-900">{isEdit ? '✏️ Edit Item' : '➕ Tambah Item Baru'}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition text-slate-500 hover:text-red-500">
                        <FiX size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Nama Barang <span className="text-red-500">*</span></label>
                            <input
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sgd-500 focus:outline-none transition-all font-semibold"
                                placeholder="Contoh: Mesin Bor"
                                value={nama} onChange={e => setNama(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Kode Alat <span className="text-red-500">*</span></label>
                            <input
                                className={`w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sgd-500 focus:outline-none transition-all font-mono ${isEdit ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                                placeholder="KODE-001"
                                value={kode} onChange={e => !isEdit && setKode(e.target.value)}
                                readOnly={isEdit}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Jumlah Total <span className="text-red-500">*</span></label>
                            <input type="number" min="0" className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sgd-500 focus:outline-none transition-all font-semibold"
                                value={jumlah} onChange={e => setJumlah(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Stok Tersedia</label>
                            <input type="number" min="0" className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sgd-500 focus:outline-none transition-all font-semibold"
                                value={tersedia} onChange={e => setTersedia(parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Kondisi</label>
                            <select
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sgd-500 focus:outline-none transition-all font-semibold"
                                value={kondisi} onChange={e => setKondisi(e.target.value)}
                            >
                                <option value="bagus">✓ Bagus</option>
                                <option value="rusak">⚠️ Rusak</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Lokasi</label>
                            <input
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sgd-500 focus:outline-none transition-all font-semibold"
                                placeholder="Gudang A"
                                value={lokasi} onChange={e => setLokasi(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Image Section */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-slate-700">Foto Barang (Maks 5)</label>
                            <span className="text-xs font-semibold text-slate-400">{existingImages.length + newFiles.length}/5 Foto</span>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {/* Existing Images */}
                            {existingImages.map((url, idx) => (
                                <div key={`exist-${idx}`} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200 shadow-sm">
                                    <img src={url} alt="Existing" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeExistingImage(url)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-transform hover:scale-110"
                                    >
                                        <FiX size={12} />
                                    </button>
                                    <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] font-bold text-center py-0.5">TERSIMPAN</div>
                                </div>
                            ))}

                            {/* New File Previews */}
                            {newFiles.map((file, idx) => (
                                <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden group border-2 border-green-400 shadow-sm bg-green-50">
                                    <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover opacity-80" />
                                    <button
                                        type="button"
                                        onClick={() => removeNewFile(idx)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-transform hover:scale-110"
                                    >
                                        <FiX size={12} />
                                    </button>
                                    <div className="absolute inset-x-0 bottom-0 bg-green-500 text-white text-[9px] font-bold text-center py-0.5">BARU</div>
                                </div>
                            ))}

                            {/* Add Button */}
                            {(existingImages.length + newFiles.length) < 5 && (
                                <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-sgd-500 hover:bg-sgd-50 transition-all cursor-pointer group">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        multiple
                                        onChange={handleFileChange}
                                    />
                                    <FiPlus className="text-3xl text-slate-300 group-hover:text-sgd-500 transition-colors" />
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-sgd-600 mt-1">Tambah</span>
                                </label>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-xl flex justify-center items-center gap-2 font-black text-lg transition-all shadow-lg active:scale-95 ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gold-gradient text-white hover:shadow-xl'}`}
                    >
                        {loading ? <><FiLoader className="animate-spin" /> MENYIMPAN...</> : "SIMPAN PERUBAHAN"}
                    </button>

                </form>
            </div>
        </div>
    );
}
