import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { supabase, seedDatabase } from './services/supabase';
import {
  FiGrid, FiBox, FiUsers, FiRepeat, FiClock,
  FiLogOut, FiMenu, FiX, FiTool
} from 'react-icons/fi';
import Swal from 'sweetalert2';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InventarisUtama from './pages/InventarisUtama';
import InventarisOrang from './pages/InventarisOrang';
import Peminjaman from './pages/Peminjaman';
import ActivityLog from './pages/ActivityLog';

// --- SIDEBAR COMPONENT ---
const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Swal.fire('Gagal Keluar', error.message, 'error');
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Keluar',
        text: 'Sesi Anda telah berakhir.',
        timer: 1500,
        showConfirmButton: false
      });
      // Tidak perlu navigasi manual, onAuthStateChange di App.tsx 
      // akan otomatis melempar kamu ke halaman Login.
    }
  };

  const navLinks = [
    { path: '/', name: 'Dashboard', icon: <FiGrid /> },
    { path: '/utama', name: 'Inventaris Utama', icon: <FiBox /> },
    { path: '/orang', name: 'Inventaris Orang', icon: <FiUsers /> },
    { path: '/peminjaman', name: 'Peminjaman', icon: <FiRepeat /> },
    { path: '/log', name: 'Log Aktivitas', icon: <FiClock /> },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 glass-sidebar text-white transform transition-transform duration-300 ease-in-out border-r border-slate-800 flex flex-col h-full
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full p-6">
          {/* LOGO AREA - Branding Sunggiardi - Clickable to Dashboard */}
          <NavLink to="/" className="mb-10 flex items-center gap-3 group/logo cursor-pointer hover:scale-105 transition-transform duration-300">
            {/* Logo Icon Box */}
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-sgd-500/20 relative overflow-hidden group p-2 transition-all duration-500 group-hover/logo:rotate-2 logo-glow">
              <img
                src="https://ik.imagekit.io/Sgd/Logo%20Potrait.png"
                alt="Sunggiardi Logo"
                className="w-full h-full object-contain relative z-10 drop-shadow-sm"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-sgd-400/10 to-transparent group-hover:bg-sgd-400/20 transition"></div>
            </div>

            {/* Logo Text */}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
                SUNGGIARDI
              </h1>
              <p className="text-[10px] text-sgd-400 font-medium uppercase tracking-[0.2em]">
                Corporation
              </p>
            </div>
          </NavLink>

          {/* NAVIGATION */}
          <nav className="flex-1 space-y-3 mt-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ease-out border border-transparent
                  ${isActive
                    ? 'bg-sgd-500 text-white shadow-lg shadow-sgd-500/30'  // AKTIF: Emas Menyala
                    : 'text-slate-400 hover:bg-slate-800 hover:text-sgd-400 hover:border-slate-700'} // HOVER: Gelap dgn Text Emas
                `}
              >
                {({ isActive }) => (
                  <>
                    <span className={`text-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 ${!isActive && 'group-hover:text-sgd-400'}`}>
                      {link.icon}
                    </span>
                    <span className="font-medium text-sm tracking-wide">{link.name}</span>

                    {/* Indikator Aktif (Titik Emas di kanan) */}
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* FOOTER - Logout */}
          <div className="mt-auto pt-6 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="group w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-all duration-300"
            >
              <FiLogOut className="text-xl transition-transform group-hover:-translate-x-1" />
              <span className="font-medium text-sm font-semibold">Keluar Sistem</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

// --- MAIN CONTENT WRAPPER ---
const AppContent = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // Run seeding
    seedDatabase();

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#013220] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="animate-pulse text-[#D4AF37]">Memuat Sistem...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-[#1A1A1A] font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0 z-30">
          {/* Clickable Logo - Same as Desktop */}
          <NavLink to="/" className="flex items-center gap-3 group/logo cursor-pointer hover:scale-105 transition-transform duration-300">
            {/* Logo Icon Box - Original Gold Colors */}
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-sgd-500/20 relative overflow-hidden p-1.5 transition-all duration-500 group-hover/logo:rotate-2 logo-glow border border-gray-200">
              <img
                src="https://ik.imagekit.io/Sgd/Logo%20Potrait.png"
                alt="Sunggiardi Logo"
                className="w-full h-full object-contain relative z-10 drop-shadow-sm"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-sgd-400/10 to-transparent group-hover/logo:bg-sgd-400/20 transition"></div>
            </div>
            {/* Logo Text */}
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 tracking-tight leading-none text-sm">SUNGGIARDI</span>
              <span className="text-[9px] text-sgd-500 font-medium uppercase tracking-widest mt-0.5">Corporation</span>
            </div>
          </NavLink>

          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <FiMenu size={24} />
          </button>
        </header>

        {/* Mobile Floating Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed bottom-6 right-6 z-[60] bg-sgd-500 text-white p-4 rounded-full shadow-xl shadow-sgd-500/40 transition-transform hover:scale-105 active:scale-95"
        >
          {isSidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-slate-50">
          <div className="p-6 md:p-8 w-full">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/utama" element={<InventarisUtama />} />
              <Route path="/orang" element={<InventarisOrang />} />
              <Route path="/peminjaman" element={<Peminjaman />} />
              <Route path="/log" element={<ActivityLog />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;