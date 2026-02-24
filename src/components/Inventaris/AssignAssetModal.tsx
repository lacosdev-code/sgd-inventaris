import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { FiX, FiUserCheck, FiSearch } from 'react-icons/fi';
import Swal from 'sweetalert2';

interface Technician {
    id: string;
    name: string;
    whatsapp_number: string;
}

interface AssignAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemToAssign: any;
    onSuccess?: () => void;
}

const AssignAssetModal: React.FC<AssignAssetModalProps> = ({ isOpen, onClose, itemToAssign, onSuccess }) => {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedTech, setSelectedTech] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchTechnicians();
            setSelectedTech(itemToAssign?.assigned_to || null);
            setSearchTerm('');
        }
    }, [isOpen, itemToAssign]);

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
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedTech) {
            Swal.fire('Pilih Teknisi', 'Silakan pilih teknisi terlebih dahulu.', 'warning');
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase
                .from('inventaris_utama')
                .update({ assigned_to: selectedTech })
                .eq('id', itemToAssign.id);

            if (error) throw error;

            Swal.fire('Berhasil!', `Aset ${itemToAssign.nama} telah ditugaskan.`, 'success');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleRevoke = async () => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('inventaris_utama')
                .update({ assigned_to: null })
                .eq('id', itemToAssign.id);

            if (error) throw error;

            Swal.fire('Berhasil!', `Penugasan aset ${itemToAssign.nama} telah ditarik.`, 'success');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !itemToAssign) return null;

    const filteredTechs = technicians.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.whatsapp_number.includes(searchTerm)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl animate-scale-up relative overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                            <FiUserCheck className="text-sgd-300 text-xl" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl tracking-tight leading-none">Tugaskan Aset</h3>
                            <p className="text-slate-400 text-xs mt-1 font-medium">{itemToAssign.nama} ({itemToAssign.kode_alat})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/10 rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-all text-slate-300">
                        <FiX className="text-xl" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama teknisi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-sgd-400 focus:ring-2 focus:ring-sgd-100 transition-all text-sm font-semibold text-slate-700"
                        />
                    </div>

                    {/* Tech List */}
                    <div className="space-y-2">
                        {loading && <p className="text-center text-slate-500 py-4 font-semibold text-sm">Memuat teknisi...</p>}
                        {!loading && filteredTechs.length === 0 && (
                            <p className="text-center text-slate-500 py-4 font-semibold text-sm">Tidak ditemukan.</p>
                        )}
                        {!loading && filteredTechs.map(tech => (
                            <div
                                key={tech.id}
                                onClick={() => setSelectedTech(tech.id)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${selectedTech === tech.id ? 'bg-sgd-50 border-sgd-400' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}
                            >
                                <div>
                                    <p className="font-bold text-slate-800">{tech.name}</p>
                                    <p className="text-xs text-slate-500 font-medium">{tech.whatsapp_number}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedTech === tech.id ? 'border-sgd-500' : 'border-slate-300'}`}>
                                    {selectedTech === tech.id && <div className="w-2.5 h-2.5 bg-sgd-500 rounded-full"></div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-white border-t border-slate-100 p-5 flex justify-between shrink-0">
                    <button
                        onClick={handleRevoke}
                        disabled={saving || !itemToAssign.assigned_to}
                        className="px-5 py-2.5 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                        Tarik Penugasan
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                        <button
                            onClick={handleAssign}
                            disabled={saving || !selectedTech}
                            className="px-6 py-2.5 bg-sgd-500 text-white font-bold rounded-xl hover:bg-sgd-600 active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-sgd-500/20"
                        >
                            {saving ? 'Loading...' : 'Tugaskan'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignAssetModal;
