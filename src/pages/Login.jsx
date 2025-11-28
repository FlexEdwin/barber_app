import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Scissors, Lock, Mail } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('¡Bienvenido!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 px-4 py-8">
      {/* Login Card */}
      <div className="bg-white w-full max-w-md p-8 md:p-10 rounded-2xl shadow-premium-lg hover:shadow-premium transition-shadow duration-300 mb-8 animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-r from-accent-from to-accent-to p-4 rounded-full mb-4 shadow-lg">
            <Scissors size={36} className="text-white" />
          </div>
          <h1 className="text-4xl font-display font-extrabold tracking-tight text-gray-900">
            Barber-app
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-2 text-center">
            Agenda, Administra, Crece. Sin Esfuerzo.
          </p>
        </div>
        
        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                className="block w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-from focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-400"
                placeholder="barbero@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                className="block w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-from focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-400"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-950 text-white py-3.5 rounded-lg hover:bg-primary-800 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg touch-target flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="text-center text-gray-400 text-xs space-y-2 max-w-md animate-fade-in">
        <p className="text-gray-500">© 2025 Barber-app SaaS. Todos los derechos reservados.</p>
        <p className="text-gray-500">
          Ideada y Desarrollada por <span className="text-gray-300 font-bold">flexedwin</span>
        </p>
        <div className="flex justify-center gap-4 text-gray-500 pt-2">
          <span className="flex items-center gap-1">📞 3166173884</span>
          <span className="flex items-center gap-1">🌐 @flexedwin</span>
        </div>
      </footer>
    </div>
  );
}