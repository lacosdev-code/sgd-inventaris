import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { FaLock, FaEnvelope, FaTools, FaEye, FaEyeSlash } from 'react-icons/fa';
import Swal from 'sweetalert2';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'Login Berhasil',
        text: `Selamat datang kembali, Bruno!`,
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: '#C5A02D'
      });
      // State session akan dihandle otomatis oleh onAuthStateChange di App.tsx
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Login Gagal',
        text: 'Email atau password salah. Silakan cek kembali.',
        confirmButtonColor: '#013220'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Mesh Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-sgd-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-sgd-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-sgd-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-amber-400 rounded-full opacity-40 animate-pulse animation-delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-sgd-500 rounded-full opacity-50 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-2/3 right-1/3 w-3 h-3 bg-sgd-300 rounded-full opacity-30 animate-pulse animation-delay-3000"></div>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glassmorphism Card */}
        <div className="relative bg-white/10 backdrop-blur-2xl rounded-[2rem] p-1 shadow-2xl border border-white/20">
          <div className="bg-gradient-to-br from-white/95 to-white/90 rounded-[1.75rem] p-10 md:p-12">

            {/* Logo Section */}
            <div className="text-center mb-12">
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-gold-gradient rounded-[2rem] blur-2xl opacity-40 animate-pulse"></div>
                <div className="relative w-24 h-24 bg-gradient-to-br from-white to-slate-50 rounded-[2rem] flex items-center justify-center shadow-2xl border border-white p-4 transform hover:scale-105 hover:rotate-3 transition-all duration-500">
                  <img
                    src="https://ik.imagekit.io/Sgd/Logo%20Potrait.png"
                    alt="Sunggiardi Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">
                SUNGGIARDI
              </h1>
              <div className="inline-block px-4 py-1.5 bg-gold-gradient-soft rounded-full mb-3">
                <p className="text-xs font-black text-sgd-700 uppercase tracking-[0.2em]">
                  Inventaris Management
                </p>
              </div>
              <p className="text-sm text-slate-500 font-medium">
                Sistem Manajemen Aset Perusahaan
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Input */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gold-gradient rounded-2xl opacity-0 group-focus-within:opacity-10 blur transition-opacity duration-300"></div>
                <div className="relative flex items-center">
                  <div className="absolute left-5 text-slate-400 group-focus-within:text-sgd-600 transition-colors duration-300">
                    <FaEnvelope className="text-lg" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    className="w-full pl-14 pr-5 py-4 bg-slate-50/80 border-2 border-slate-200/50 rounded-2xl focus:border-sgd-400 focus:bg-white outline-none transition-all duration-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-medium shadow-sm focus:shadow-md"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gold-gradient rounded-2xl opacity-0 group-focus-within:opacity-10 blur transition-opacity duration-300"></div>
                <div className="relative flex items-center">
                  <div className="absolute left-5 text-slate-400 group-focus-within:text-sgd-600 transition-colors duration-300">
                    <FaLock className="text-lg" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Password"
                    className="w-full pl-14 pr-14 py-4 bg-slate-50/80 border-2 border-slate-200/50 rounded-2xl focus:border-sgd-400 focus:bg-white outline-none transition-all duration-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-medium shadow-sm focus:shadow-md"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 text-slate-400 hover:text-sgd-600 transition-colors duration-300 p-1"
                  >
                    {showPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full mt-8 group"
              >
                <div className="absolute inset-0 bg-gold-gradient rounded-2xl blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative bg-gold-gradient text-white font-black py-5 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <span className="relative text-base tracking-wide">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memverifikasi...
                      </span>
                    ) : (
                      "Masuk Sekarang →"
                    )}
                  </span>
                </div>
              </button>
            </form>

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