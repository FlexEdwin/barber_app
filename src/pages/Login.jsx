import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Scissors, Lock, Mail, Phone, Instagram } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Error: " + error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 px-4">
      <div className="bg-white w-full max-w-md p-8 rounded-xl shadow-2xl mb-8">
        <div className="flex flex-col items-center mb-6 text-gray-900">
          <div className="bg-black p-3 rounded-full mb-3">
            <Scissors size={32} className="text-white" />
          </div>
          {/* NUEVO NOMBRE */}
          <h1 className="text-3xl font-extrabold tracking-tight">Barber-app</h1>
          {/* NUEVO SLOGAN */}
          <p className="text-gray-500 text-sm font-medium mt-1 text-center">Agenda, Administra, Crece. Sin Esfuerzo.</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="email" required className="block w-full pl-10 border border-gray-300 rounded-md p-3 focus:ring-black focus:border-black outline-none" placeholder="barbero@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="password" required className="block w-full pl-10 border border-gray-300 rounded-md p-3 focus:ring-black focus:border-black outline-none" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <button disabled={loading} className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition disabled:opacity-50 font-bold mt-4">
            {loading ? 'Entrando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>

      {/* NUEVO FOOTER CON CONTACTO */}
      <footer className="text-center text-gray-500 text-xs space-y-2">
        <p>© 2025 Barber-app SaaS. Todos los derechos reservados.</p>
        <p>Ideada y Desarrollada por <span className="text-gray-300 font-bold">flexedwin</span></p>
        <div className="flex justify-center gap-4 text-gray-400 pt-2">
            <span className="flex items-center gap-1">📞 3166173884</span>
            <span className="flex items-center gap-1">🌐 @flexedwin</span>
        </div>
      </footer>
    </div>
  );
}