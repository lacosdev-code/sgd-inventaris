import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { FaLock, FaEnvelope, FaTools, FaEye, FaEyeSlash } from 'react-icons/fa';
import Swal from 'sweetalert2';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginMode, setLoginMode] = useState<'admin' | 'technician'>('admin');
  const [whatsapp, setWhatsapp] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      Swal.fire({
        icon: 'success',
        title: 'Login Berhasil',
        text: 'Selamat datang kembali, Admin!',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Login Gagal', text: 'Email atau password salah.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTechLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formattedWA = whatsapp.replace(/\D/g, '');
      const { data, error } = await supabase.rpc('authenticate_technician', { p_whatsapp: formattedWA });

      if (error) throw error;
      if (!data.success) throw new Error(data.message);

      // Store tech info in localStorage for persistence
      localStorage.setItem('tech_session', JSON.stringify(data.technician));

      Swal.fire({
        icon: 'success',
        title: 'Halo, ' + data.technician.name,
        text: 'Login berhasil!',
        timer: 1500,
        showConfirmButton: false
      });

      // Trigger a reload or state change in App.tsx
      window.location.reload();
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Mesh Gradient Background (Keep previous styles) */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-sgd-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-sgd-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="relative bg-white/10 backdrop-blur-2xl rounded-[2.5rem] p-1 shadow-2xl border border-white/20">
          <div className="bg-white rounded-[2.25rem] p-8 md:p-10 shadow-inner">

            {/* Logo Section */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-gold-gradient rounded-3xl blur-xl opacity-30 animate-pulse"></div>
                <div className="relative w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-slate-50 p-3">
                  <img src="https://ik.imagekit.io/Sgd/Logo%20Potrait.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">SUNGGIARDI</h1>
              <p className="text-[10px] font-black text-sgd-500 uppercase tracking-widest mt-1">Inventaris Management</p>
            </div>

            {/* Login Mode Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl mb-8">
              <button
                onClick={() => setLoginMode('admin')}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${loginMode === 'admin' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                ADMIN
              </button>
              <button
                onClick={() => setLoginMode('technician')}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${loginMode === 'technician' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                TEKNISI
              </button>
            </div>

            {/* Login Form */}
            {loginMode === 'admin' ? (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="relative">
                  <FaEnvelope className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email" required placeholder="Email Admin"
                    className="w-full pl-14 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-400 focus:bg-white outline-none transition-all font-bold text-slate-800 text-sm"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <FaLock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"} required placeholder="Password"
                    className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sgd-400 focus:bg-white outline-none transition-all font-bold text-slate-800 text-sm"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 mt-4">
                  {loading ? 'MEMVERIFIKASI...' : 'MASUK KE DASHBOARD →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleTechLogin} className="space-y-4">
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">62</span>
                  </div>
                  <input
                    type="text" required placeholder="Nomor WhatsApp (Contoh: 812...)"
                    className="w-full pl-16 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-green-500 focus:bg-white outline-none transition-all font-black text-slate-800 text-base"
                    value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest pl-1 mb-6">Gunakan nomor WA yang terdaftar</p>
                <button type="submit" disabled={loading} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50">
                  {loading ? 'MEMERIKSA NOMOR...' : 'MASUK PORTAL TEKNISI →'}
                </button>
              </form>
            )}

            {/* Footer */}
            <div className="mt-12 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-300"></div>
                <p className="text-[10px] uppercase tracking-[0.15em] font-bold">
                  PT. Sunggiardi Corporation
                </p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-300"></div>
              </div>
              <p className="text-[9px] text-slate-400 font-semibold">
                © 2026 • Powered by LacosDev
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;