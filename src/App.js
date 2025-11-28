import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Login from './pages/Login';
import AdminDashboard from './pages/Dashboard'; 
import PublicBooking from './pages/PublicBooking'; 
import { LogOut, Scissors } from 'lucide-react';
import { ToastProvider } from './components/Toast';

// Layout del Admin
const AdminLayout = ({ children, session }) => (
  <div className="min-h-screen bg-gray-50">
    <nav className="bg-primary-950 text-white p-4 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-accent-from to-accent-to p-2 rounded-lg">
            <Scissors size={20} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Panel de Control</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:inline">{session.user.email}</span>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="text-sm bg-primary-800 px-4 py-2.5 rounded-lg hover:bg-primary-900 flex gap-2 items-center transition-all active:scale-95 touch-target"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </div>
    </nav>
    <main>{children}</main>
  </div>
);

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800">
        <div className="bg-gradient-to-r from-accent-from to-accent-to p-4 rounded-full mb-4 animate-bounce-gentle">
          <Scissors size={40} className="text-white" />
        </div>
        <div className="text-white font-semibold">Cargando sistema...</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* 1. RUTAS FIJAS (Prioridad Alta) */}
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/admin" />} />
          
          <Route path="/admin" element={
            session ? (
              <AdminLayout session={session}>
                <AdminDashboard session={session} />
              </AdminLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />

          {/* 2. REDIRECCIÓN RAÍZ */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 3. RUTA DINÁMICA (Prioridad Baja - Captura nombres de barberos) */}
          <Route path="/:slug" element={<PublicBooking />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;