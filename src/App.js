import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Login from './pages/Login';
import AdminDashboard from './pages/Dashboard'; 
import PublicBooking from './pages/PublicBooking'; 
import { LogOut } from 'lucide-react';

// Layout del Admin
const AdminLayout = ({ children, session }) => (
  <div className="min-h-screen bg-gray-50">
    <nav className="bg-black text-white p-4 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <span className="font-bold text-xl">Panel de Control</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:inline">{session.user.email}</span>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="text-sm bg-gray-800 px-3 py-1 rounded hover:bg-gray-700 flex gap-2 items-center"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </div>
    </nav>
    <main className="p-4">{children}</main>
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

  if (loading) return <div className="h-screen flex items-center justify-center font-bold">Cargando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* --- PRIORIDAD 1: RUTAS ESPECÍFICAS (Fijas) --- */}
        {/* Deben ir ANTES de las rutas dinámicas */}
        
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

        {/* --- PRIORIDAD 2: REDIRECCIÓN RAÍZ --- */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* --- PRIORIDAD 3: RUTAS DINÁMICAS (Variables) --- */}
        {/* Esta captura cualquier cosa que no sea login o admin (ej: /barbero1) */}
        {/* SIEMPRE DEBE IR AL FINAL */}
        <Route path="/:slug" element={<PublicBooking />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;