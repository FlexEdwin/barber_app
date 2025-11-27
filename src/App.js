import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // <--- ESTA LÍNEA ES CLAVE
import { LogOut } from 'lucide-react';

// Layout Principal (Barra negra superior)
const Layout = ({ children, session }) => (
  <div className="min-h-screen bg-gray-50 font-sans">
    <nav className="bg-black text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span>BarberBook</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:inline">{session.user.email}</span>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-all"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>
    </nav>
    <main className="mt-6 px-4">
      {children}
    </main>
  </div>
);

// App Principal
function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión al inicio
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-xl animate-pulse">Cargando barbería...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={!session ? <Login /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/dashboard" 
          element={
            session ? (
              <Layout session={session}>
                {/* Aquí se carga el componente Dashboard que creamos */}
                <Dashboard session={session} />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;