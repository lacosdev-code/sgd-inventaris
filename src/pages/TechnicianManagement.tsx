import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import {
    FaUserShield,
    FaUsers,
    FaPlus,
    FaSearch,
    FaWhatsapp,
    FaTrashAlt,
    FaUserPlus,
    FaTimes,
    FaExclamationCircle,
    FaEdit,
    FaCheck,
    FaChevronRight,
    FaCamera,
    FaUser,
    FaToolbox,
    FaBoxOpen
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import { uploadImage } from '../services/imagekit';

interface PartialInventoryItem {
    id: string;
    nama: string;
    jumlah: number;
    kondisi: string;
    orang?: string;
}

interface Technician {
    id: string;
    name: string;
    whatsapp_number: string;
    avatar_url?: string;
    created_at: string;
}

const TechnicianManagement = () => {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [newTech, setNewTech] = useState<{ name: string; whatsapp: string; avatar_url: string }>({ name: '', whatsapp: '', avatar_url: '' });
    const [editTech, setEditTech] = useState<Technician | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Assets State
    const [viewTechAssets, setViewTechAssets] = useState<Technician | null>(null);
    const [techAssets, setTechAssets] = useState<PartialInventoryItem[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);

    useEffect(() => {
        fetchTechnicians();
    }, []);

    const fetchTechnicians = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('technicians')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setTechnicians(data || []);
        } catch (error: any) {
            console.error('Error fetching technicians:', error.message);
            Swal.fire('Error', 'Gagal memuat data teknisi.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingPhoto(true);
            const url = await uploadImage(file);
            if (isEdit && editTech) {
                setEditTech({ ...editTech, avatar_url: url });
            } else {
                setNewTech({ ...newTech, avatar_url: url });
            }
        } catch (error: any) {
            Swal.fire('Error', 'Gagal upload foto: ' + error.message, 'error');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleAddTechnician = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTech.name || !newTech.whatsapp) return;

        try {
            setIsSubmitting(true);
            const formattedWA = newTech.whatsapp.replace(/\D/g, '');

            const { error } = await supabase
                .from('technicians')
                .insert([{
                    name: newTech.name,
                    whatsapp_number: formattedWA,
                    avatar_url: newTech.avatar_url
                }]);

            if (error) {
                if (error.code === '23505') throw new Error('Nomor WhatsApp sudah terdaftar!');
                throw error;
            }

            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'Teknisi baru telah didaftarkan.',
                timer: 1500,
                showConfirmButton: false
            });

            setNewTech({ name: '', whatsapp: '', avatar_url: '' });
            setIsAddModalOpen(false);
            fetchTechnicians();
        } catch (error: any) {
            Swal.fire('Gagal', error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateTechnician = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTech || !editTech.name || !editTech.whatsapp_number) return;

        try {
            setIsSubmitting(true);
            const formattedWA = editTech.whatsapp_number.replace(/\D/g, '');

            const { error } = await supabase
                .from('technicians')
                .update({
                    name: editTech.name,
                    whatsapp_number: formattedWA,
                    avatar_url: editTech.avatar_url
                })
                .eq('id', editTech.id);

            if (error) {
                if (error.code === '23505') throw new Error('Nomor WhatsApp sudah digunakan teknisi lain!');
                throw error;
            }

            Swal.fire({
                icon: 'success',
                title: 'Diperbarui',
                text: 'Data teknisi telah berhasil diubah.',
                timer: 1500,
                showConfirmButton: false
            });

            setIsEditModalOpen(false);
            setEditTech(null);
            fetchTechnicians();
        } catch (error: any) {
            Swal.fire('Gagal', error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const result = await Swal.fire({
            title: 'Hapus Teknisi?',
            text: `Anda akan menghapus ${name} dari daftar akses. Tindakan ini tidak dapat dibatalkan.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4444',
            cancelButtonColor: '#1e293b',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
            background: '#ffffff',
            customClass: {
                title: 'font-black text-slate-900',
                popup: 'rounded-[1.5rem]'
            }
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase
                    .from('technicians')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                setTechnicians(prev => prev.filter(t => t.id !== id));
                Swal.fire('Terhapus!', 'Data teknisi telah dibersihkan dari database.', 'success');
            } catch (error: any) {
                Swal.fire('Gagal', error.message, 'error');
            }
        }
    };

    const openEditModal = (tech: Technician) => {
        setEditTech({ ...tech });
        setIsEditModalOpen(true);
    };

    const handleViewAssets = async (tech: Technician) => {
        setViewTechAssets(tech);
        setLoadingAssets(true);
        try {
            const { data, error } = await supabase
                .from('inventaris_orang')
                .select('id, nama, jumlah, kondisi, orang, technician_id')
                .eq('technician_id', tech.id)
                .order('nama', { ascending: true });

            if (error) throw error;
            setTechAssets(data as PartialInventoryItem[] || []);
        } catch (error: any) {
            Swal.fire('Error', 'Gagal memuat aset teknisi: ' + error.message, 'error');
        } finally {
            setLoadingAssets(false);
        }
    };

    const handleRevokeAsset = async (assetId: string, assetName: string) => {
        const result = await Swal.fire({
            title: 'Tarik Aset?',
            text: `Anda akan menarik ${assetName} dari teknisi ini. Barang akan kembali ke status unassigned.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b', // amber
            cancelButtonColor: '#1e293b',
            confirmButtonText: 'Ya, Tarik Aset',
            cancelButtonText: 'Batal',
            customClass: { popup: 'rounded-[1.5rem]' }
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase
                    .from('inventaris_orang')
                    .update({ technician_id: null })
                    .eq('id', assetId);

                if (error) throw error;

                setTechAssets(prev => prev.filter(a => a.id !== assetId));
                Swal.fire('Berhasil!', 'Aset telah dilepas dari teknisi.', 'success');
            } catch (error: any) {
                Swal.fire('Gagal', error.message, 'error');
            }
        }
    };

    const filteredTechs = technicians.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.whatsapp_number.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-slate-50 w-full animate-fade-in pb-20">
            <div className="max-w-6xl mx-auto px-4 md:px-0">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                            <div className="p-3 bg-gold-gradient rounded-2xl shadow-lg ring-4 ring-gold-gradient/10">
                                <FaUsers className="text-white" />
                            </div>
                            Manajemen Teknisi
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Kelola daftar akses personil lapangan (Sistem WA-Only Login)</p>
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="group relative flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold transition-all hover:bg-slate-800 active:scale-95 shadow-xl shadow-slate-200"
                    >
                        <FaPlus className="text-sgd-400 group-hover:rotate-90 transition-transform duration-300" />
                        Daftar Teknisi Baru
                    </button>
                </div>

                {/* Stats & Search Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="md:col-span-3 relative group">
                        <div className="absolute inset-0 bg-gold-gradient rounded-2xl opacity-0 group-focus-within:opacity-10 blur-xl transition-opacity"></div>
                        <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama atau nomor WhatsApp teknisi..."
                            className="w-full pl-16 pr-6 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:border-sgd-400 outline-none transition-all shadow-sm font-semibold text-slate-700 placeholder:text-slate-300 text-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center gap-4">
                        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-sgd-600">
                            <FaUsers size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Aktif</p>
                            <p className="text-2xl font-black text-slate-900 leading-none">{technicians.length}</p>
                        </div>
                    </div>
                </div>

                {/* Grid List */}
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-sgd-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Menghubungi Database...</p>
                    </div>
                ) : technicians.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-100">
                        <div className="w-28 h-28 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <FaExclamationCircle className="text-slate-200" size={56} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900">Database Kosong</h3>
                        <p className="text-slate-400 mt-3 max-w-sm mx-auto font-medium">Daftarkan personil lapangan agar mereka bisa mulai meminjam alat secara mandiri.</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="mt-8 px-8 py-4 bg-gold-gradient text-white rounded-xl font-bold shadow-lg shadow-sgd-500/20 hover:scale-105 transition-transform"
                        >
                            Input Sekarang
                        </button>
                    </div>
                ) : filteredTechs.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-100">
                        <div className="w-28 h-28 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                            <FaSearch className="text-slate-200" size={48} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900">Hasil Tidak Ditemukan</h3>
                        <p className="text-slate-400 mt-2 font-medium">Tidak ada teknisi yang cocok dengan kata kunci "{searchTerm}".</p>
                        <button
                            onClick={() => setSearchTerm('')}
                            className="mt-6 text-sgd-600 font-black hover:underline underline-offset-4"
                        >
                            Reset Pencarian
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredTechs.map((tech) => (
                            <div key={tech.id} className="group relative bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                                {/* Background Accent */}
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold-gradient opacity-0 group-hover:opacity-10 rounded-full blur-3xl transition-opacity duration-700"></div>

                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div className="relative group/avatar">
                                        <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 border-2 border-white shadow-xl overflow-hidden flex items-center justify-center text-slate-300 group-hover:rotate-3 transition-transform duration-500">
                                            {tech.avatar_url ? (
                                                <img src={tech.avatar_url} alt={tech.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-sgd-50 flex items-center justify-center text-sgd-500 font-black text-2xl">
                                                    {tech.name.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-lg border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] animate-pulse">
                                            <FaCheck />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(tech)}
                                            className="p-3 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                                            title="Edit Data"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tech.id, tech.name)}
                                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            title="Hapus Akses"
                                        >
                                            <FaTrashAlt />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black text-slate-900 mb-2 truncate group-hover:text-amber-600 transition-colors tracking-tight uppercase">{tech.name}</h3>
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] mb-8 tracking-widest uppercase">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                        Akses Portal Aktif
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex gap-3">
                                            <a
                                                href={`https://wa.me/${tech.whatsapp_number}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 flex items-center justify-center p-4 bg-slate-50 rounded-[1.25rem] hover:bg-green-50 group/wa transition-all border border-transparent hover:border-green-100 shadow-sm"
                                                title="Hubungi via WhatsApp"
                                            >
                                                <FaWhatsapp className="text-2xl text-green-500 group-hover/wa:scale-110 transition-transform" />
                                            </a>
                                            <button
                                                onClick={() => handleViewAssets(tech)}
                                                className="flex-[3] flex items-center justify-between p-4 bg-slate-50 text-slate-700 rounded-[1.25rem] hover:bg-sgd-50 group/asset transition-all border border-transparent hover:border-sgd-100 shadow-sm font-bold"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-sgd-500">
                                                        <FaToolbox />
                                                    </div>
                                                    <span>Aset di Tangan</span>
                                                </div>
                                                <FaChevronRight className="text-sgd-300 opacity-0 group-hover/asset:opacity-100 transition-all -translate-x-2 group-hover/asset:translate-x-0" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* MODAL: ADD TECHNICIAN */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-fade-in" onClick={() => setIsAddModalOpen(false)}></div>

                        <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl animate-fade-in-up overflow-hidden ring-1 ring-white/20">
                            <div className="bg-slate-900 p-10 flex justify-between items-center relative overflow-hidden">
                                <div className="absolute -top-10 -left-10 w-40 h-40 bg-gold-gradient opacity-10 rounded-full blur-3xl"></div>
                                <div className="flex items-center gap-5 text-white relative z-10">
                                    <div className="p-4 bg-gold-gradient rounded-2xl shadow-lg ring-4 ring-white/10">
                                        <FaUserPlus size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tight leading-none mb-1">Daftar Teknisi</h2>
                                        <p className="text-sgd-400 text-[10px] font-black uppercase tracking-[0.2em]">Tambah Akses Lapangan</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="p-3 text-white/30 hover:text-white hover:bg-white/10 rounded-2xl transition-all relative z-10"
                                >
                                    <FaTimes size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleAddTechnician} className="p-10 space-y-8">
                                {/* Photo Upload Profile */}
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-[2rem] bg-slate-50 border-4 border-slate-100 overflow-hidden flex items-center justify-center shadow-inner">
                                            {newTech.avatar_url ? (
                                                <img src={newTech.avatar_url} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <FaUser size={48} className="text-slate-200" />
                                            )}
                                            {uploadingPhoto && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                                    <div className="w-8 h-8 border-4 border-sgd-400 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute bottom-[-10px] right-[-10px] w-12 h-12 bg-sgd-500 text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-xl hover:scale-110 active:scale-95 transition-all">
                                            <FaCamera size={20} />
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, false)} />
                                        </label>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto Profil (Opsional)</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Nama Lengkap</label>
                                        <span className="text-[10px] text-red-500 font-bold">*Wajib Diisi</span>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Ahmad Sulaiman"
                                        className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-sgd-400 focus:bg-white outline-none transition-all font-bold text-slate-800 text-lg shadow-inner"
                                        value={newTech.name}
                                        onChange={(e) => setNewTech({ ...newTech, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Nomor WhatsApp</label>
                                        <span className="text-[10px] text-red-500 font-bold">*Wajib Diisi</span>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                            <FaWhatsapp className="text-xl text-green-500" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            placeholder="62812xxxx (Format: 62)"
                                            className="w-full pl-20 pr-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-sgd-400 focus:bg-white outline-none transition-all font-extrabold text-slate-800 text-lg shadow-inner"
                                            value={newTech.whatsapp}
                                            onChange={(e) => setNewTech({ ...newTech, whatsapp: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium ml-2 italic">Gunakan kode negara (62) tanpa spasi atau tanda +</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-6 bg-slate-900 text-white rounded-[1.5rem] font-black text-xl shadow-2xl shadow-slate-200 hover:shadow-sgd-400/20 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50 group/btn overflow-hidden"
                                >
                                    {isSubmitting ? (
                                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Aktifkan Akses Teknisi
                                            <FaChevronRight className="text-sgd-400 group-hover:translate-x-2 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: EDIT TECHNICIAN */}
                {isEditModalOpen && editTech && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-fade-in" onClick={() => setIsEditModalOpen(false)}></div>

                        <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl animate-fade-in-up overflow-hidden ring-1 ring-white/20">
                            <div className="bg-amber-500 p-10 flex justify-between items-center relative overflow-hidden">
                                <div className="absolute -top-10 -left-10 w-40 h-40 bg-white opacity-20 rounded-full blur-3xl"></div>
                                <div className="flex items-center gap-5 text-white relative z-10">
                                    <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg ring-4 ring-white/10">
                                        <FaEdit size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tight leading-none mb-1">Edit Teknisi</h2>
                                        <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">Update Data Personil</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-2xl transition-all relative z-10"
                                >
                                    <FaTimes size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateTechnician} className="p-6 sm:p-8 space-y-5">
                                {/* Photo Upload Update */}
                                <div className="flex flex-col items-center gap-4 py-2">
                                    <div className="relative group">
                                        <div className="w-28 h-28 rounded-[2rem] bg-slate-50 border-4 border-slate-100 overflow-hidden flex items-center justify-center shadow-inner">
                                            {editTech.avatar_url ? (
                                                <img src={editTech.avatar_url} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <FaUser size={40} className="text-slate-200" />
                                            )}
                                            {uploadingPhoto && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                                    <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute bottom-[-5px] right-[-5px] w-10 h-10 bg-amber-500 text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-xl hover:scale-110 active:scale-95 transition-all">
                                            <FaCamera size={16} />
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, true)} />
                                        </label>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Update Foto Profil</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none ml-1">Nama Lengkap</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:bg-white outline-none transition-all font-bold text-slate-800 text-base shadow-inner"
                                        value={editTech.name}
                                        onChange={(e) => setEditTech({ ...editTech, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none ml-1">Nomor WhatsApp</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                            <FaWhatsapp className="text-lg text-green-500" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-16 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500 focus:bg-white outline-none transition-all font-extrabold text-slate-800 text-base shadow-inner"
                                            value={editTech.whatsapp_number}
                                            onChange={(e) => setEditTech({ ...editTech, whatsapp_number: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-base hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-[2] py-4 bg-amber-500 text-white rounded-2xl font-black text-lg shadow-2xl shadow-amber-200 hover:shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>Simpan Perubahan <FaCheck /></>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: VIEW ASSETS ON HAND */}
                {viewTechAssets && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl animate-scale-up relative overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 flex justify-between items-center text-white shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                                        <FaToolbox className="text-sgd-300 text-2xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl tracking-tight leading-none">Aset di Tangan</h3>
                                        <p className="text-slate-400 text-xs mt-1 font-medium">Barang yang ditugaskan ke: <span className="text-sgd-300">{viewTechAssets.name}</span></p>
                                    </div>
                                </div>
                                <button onClick={() => setViewTechAssets(null)} className="p-2.5 bg-white/10 rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-all text-slate-300">
                                    <FaTimes className="text-xl" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                                {loadingAssets ? (
                                    <div className="py-20 text-center flex flex-col items-center">
                                        <div className="w-8 h-8 border-4 border-sgd-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Data Aset...</p>
                                    </div>
                                ) : techAssets.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                                            <FaBoxOpen className="text-slate-200 text-5xl" />
                                        </div>
                                        <h4 className="text-xl font-black text-slate-700">Tidak Ada Aset</h4>
                                        <p className="text-slate-400 mt-2 font-medium">Teknisi ini belum memegang aset apapun.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {techAssets.map(asset => (
                                            <div key={asset.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                                                        <FaToolbox className="text-slate-300 text-2xl" />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-slate-900 text-base">{asset.nama}</h5>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">Jumlah: {asset.jumlah}</span>
                                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${asset.kondisi === 'Bagus' || asset.kondisi === 'Baik'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-red-100 text-red-700'
                                                                } capitalize`}>
                                                                {asset.kondisi}
                                                            </span>
                                                        </div>
                                                        {asset.orang && <p className="text-xs text-slate-400 mt-0.5">Pemilik: {asset.orang}</p>}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRevokeAsset(asset.id, asset.nama)}
                                                    className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-red-50 text-red-500 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 border border-red-100 hover:border-red-300 active:scale-95 group/btn"
                                                >
                                                    <span className="hidden sm:inline">Lepas Aset</span>
                                                    <FaBoxOpen className="text-lg group-hover/btn:-translate-y-1 transition-transform" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TechnicianManagement;
