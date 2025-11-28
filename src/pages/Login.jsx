import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Scissors, Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // CAMBIO IMPORTANTE: Ahora usamos signInWithPassword
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    
    if (error) {
      alert("Error: " + error.message);
    } else {
      // Si todo sale bien, App.js detectará la sesión automáticamente
      // y redirigirá al dashboard
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="bg-white w-full max-w-md p-8 rounded-xl shadow-2xl">
        <div className="flex justify-center mb-6 text-gray-900">
          <Scissors size={48} />
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Acceso Barberos</h2>
        <p className="text-center text-gray-500 mb-6">Gestiona tu negocio</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="email"
                required
                className="block w-full pl-10 border border-gray-300 rounded-md p-3 focus:ring-black focus:border-black outline-none"
                placeholder="barbero@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="password"
                required
                className="block w-full pl-10 border border-gray-300 rounded-md p-3 focus:ring-black focus:border-black outline-none"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition disabled:opacity-50 font-semibold mt-4"
          >
            {loading ? 'Entrando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}