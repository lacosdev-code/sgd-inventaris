import React, { useState } from 'react';
import { FiX, FiCamera, FiLoader, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import { supabase } from '../services/supabase';
import { uploadToolImage } from '../actions/uploadAction';
import Swal from 'sweetalert2';

interface HandoverModalProps {
    tool: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function HandoverModal({ tool, onClose, onSuccess }: HandoverModalProps) {
    const [loading, setLoading] = useState(false);
    const [technician, setTechnician] = useState("Bokir"); // Default
    const [type, setType] = useState<"Pinjam" | "Kembali">("Pinjam");
    const [condition, setCondition] = useState("bagus");
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async () => {
        // Validasi
        if (type === 'Pinjam' && !file) {
            Swal.fire("Wajib Foto", "Harap upload foto bukti penyerahan alat!", "warning");
            return;
        }
        if (type === 'Kembali' && !file) {
            Swal.fire("Wajib Foto", "Harap upload foto bukti pengembalian alat!", "warning");
            return;
        }

        setLoading(true);

        try {
            let imageUrl = '';

            // 1. Upload ke ImageKit (via Adapter Action)
            if (file) {
                const formData = new FormData();
                formData.append("file", file);

                const uploadRes = await uploadToolImage(formData);

                // FIX: Check for .urls array, not .url
                if (!uploadRes.success || !uploadRes.urls || uploadRes.urls.length === 0) {
                    throw new Error(uploadRes.error || "Gagal upload foto");
                }
                imageUrl = uploadRes.urls[0];
            }

            // 2. Database Transactions
            if (type === "Pinjam") {
                if (tool.jumlah_tersedia <= 0) {
                    Swal.fire("Stok Habis", "Alat tidak tersedia untuk dipinjam.", "error");
                    setLoading(false);
                    return;
                }

                // A. Insert ke tabel peminjaman
                const { error: loanError } = await supabase.from("peminjaman").insert({
                    barang_id: tool.id,
                    barang_nama: tool.nama,
                    peminjam: technician,
                    jumlah: 1,
                    status: "dipinjam",
                    kondisi_pinjam: condition,
                    foto_pinjam: imageUrl,
                    tgl_pinjam: new Date().toISOString()
                });

                if (loanError) throw loanError;

                // B. Update stok di inventaris_utama (Kurangi stok tersedia)
                const { error: updateError } = await supabase
                    .from('inventaris_utama')
                    .update({ jumlah_tersedia: tool.jumlah_tersedia - 1 })
                    .eq('id', tool.id);

                if (updateError) throw updateError;

            } else {
                // Logika Pengembalian

                // Ambil ID peminjaman yang akan diupdate (Last in First Out atau spesifik teknisi)
                const { data: loanData, error: fetchError } = await supabase
                    .from("peminjaman")
                    .select("id")
                    .eq("barang_id", tool.id)
                    .eq("status", "dipinjam")
                    .eq("peminjam", technician) // Asumsi yang mengembalikan adalah yang meminjam
                    .limit(1)
                    .single();

                if (fetchError || !loanData) {
                    Swal.fire("Data Tidak Ditemukan", `Tidak ada data peminjaman aktif untuk ${technician} dan alat ini.`, "error");
                    setLoading(false);
                    return;
                }

                // A. Update tabel peminjaman
                const { error: returnError } = await supabase
                    .from("peminjaman")
                    .update({
                        status: "kembali",
                        tgl_kembali_aktual: new Date().toISOString(),
                        kondisi_kembali: condition,
                        foto_kembali: imageUrl,
                    })
                    .eq("id", loanData.id);

                if (returnError) throw returnError;

                // B. Update stok di inventaris_utama (Tambah stok tersedia)
                const { error: updateError } = await supabase
                    .from('inventaris_utama')
                    .update({ jumlah_tersedia: tool.jumlah_tersedia + 1 })
                    .eq('id', tool.id);

                if (updateError) throw updateError;
            }

            // 3. Insert into Tool Images (Gallery)
            // This ensures the photo appears in the Detail Page Carousel
            if (imageUrl) {
                const { error: galleryError } = await supabase
                    .from('tool_images')
                    .insert({
                        tool_id: tool.id,
                        image_url: imageUrl
                    });

                if (galleryError) {
                    console.error("Failed to add to gallery:", galleryError);
                    // Non-blocking error, just log it.
                }
            }

            await Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: `Data ${type} berhasil disimpan. Foto juga ditambahkan ke galeri.`,
                timer: 2000,
                showConfirmButton: false
            });

            onSuccess();

        } catch (err: any) {
            console.error(err);
            Swal.fire("Terjadi Kesalahan", err.message || "Gagal menyimpan data.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-slide-up relative overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="font-black text-xl text-slate-900">Form Serah Terima</h3>
                        <p className="text-xs text-slate-500 font-medium">{tool.nama}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition text-slate-500 hover:text-red-500"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="space-y-5">
                    {/* Pilih Tipe Transaksi */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
                        <button
                            onClick={() => setType("Pinjam")}
                            className={`flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${type === 'Pinjam' ? 'bg-white shadow-sm text-green-600 scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${type === 'Pinjam' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                            PINJAM ALAT
                        </button>
                        <button
                            onClick={() => setType("Kembali")}
                            className={`flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${type === 'Kembali' ? 'bg-white shadow-sm text-blue-600 scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${type === 'Kembali' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                            KEMBALIKAN
                        </button>
                    </div>

                    {/* Nama Teknisi */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Nama Teknisi</label>
                        <div className="relative">
                            <select
                                className="w-full border-2 border-slate-200 rounded-xl p-3 bg-white focus:border-sgd-500 focus:outline-none appearance-none font-semibold text-slate-700"
                                value={technician} onChange={(e) => setTechnician(e.target.value)}
                            >
                                <option value="Bokir">Bokir</option>
                                <option value="Sunar">Sunar</option>
                                <option value="Ahmad">Ahmad</option>
                                <option value="Agus">Agus</option>
                                <option value="Rudi">Rudi</option>
                                <option value="Dadang">Dadang</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Kondisi */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Kondisi Fisik</label>
                        <div className="relative">
                            <select
                                className="w-full border-2 border-slate-200 rounded-xl p-3 bg-white focus:border-sgd-500 focus:outline-none appearance-none font-semibold text-slate-700"
                                value={condition} onChange={(e) => setCondition(e.target.value)}
                            >
                                <option value="bagus">🟢 Bagus / Normal</option>
                                <option value="rusak">🟡 Rusak Ringan</option>
                                <option value="hilang">🔴 Hilang / Rusak Berat</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Upload Foto */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Bukti Foto</label>
                        <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50 relative transition-colors ${file ? 'border-green-400 bg-green-50/50' : 'border-slate-300'}`}>
                            <input
                                type="file" accept="image/*" capture="environment"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                            />
                            <div className="flex flex-col items-center gap-3 text-slate-400">
                                {file ? (
                                    <div className="text-green-600 flex flex-col items-center animate-bounce-short">
                                        <FiCheckCircle size={32} />
                                        <span className="text-sm font-bold mt-2 text-slate-700 max-w-[200px] truncate">{file.name}</span>
                                        <span className="text-xs text-green-600 mt-1">Ketuk untuk ganti</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-slate-100 p-3 rounded-full">
                                            <FiCamera size={24} className="text-slate-500" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-slate-600">Ambil Foto Bukti</span>
                                            <p className="text-xs text-slate-400 mt-1">Wajib untuk validasi</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl flex justify-center items-center gap-2 font-black text-lg transition-all shadow-lg active:scale-95 ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-yellow-400 text-slate-900 hover:bg-yellow-300 hover:shadow-yellow-400/30'}`}
                    >
                        {loading ? <><FiLoader className="animate-spin" /> MENYIMPAN...</> : "SIMPAN LOG"}
                    </button>
                </div>
            </div>
        </div>
    );
}
