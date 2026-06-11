"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Loader2, Lock, Mail, ShieldCheck, Database, Wifi, WifiOff, AlertCircle, X, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // ==========================================
  // SISTEMA DE NOTIFICACIONES (TOASTS NATIVOS)
  // ==========================================
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'error' | 'info' | 'success' } | null>(null);

  const showToast = (title: string, desc: string, type: 'error' | 'info' | 'success' = 'error') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 5000);
  };
  
  // RESTAURADO: Validador de conexión a Supabase
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { error } = await supabase.from('events').select('id').limit(1);
      if (error) throw error;
      setDbStatus('connected');
    } catch {
      setDbStatus('error');
      showToast('Error de Conexión', 'No se pudo establecer conexión con la base de datos.', 'error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verificación de credenciales en la nueva tabla de roles
      const { data: user, error } = await supabase
        .from('system_users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error || !user) {
        throw new Error("Credenciales incorrectas o usuario no autorizado.");
      }

      // Guardar la sesión con el rol asignado
      localStorage.setItem('acofi-session', JSON.stringify(user));

      showToast('Acceso Concedido', 'Iniciando sesión...', 'success');

      // Redirección por roles
      setTimeout(() => {
        if (user.role === 'STAFF' && user.permissions.includes('asistencia') && !user.permissions.includes('eventos')) {
          router.push('/admin/asistencia');
        } else {
          router.push('/admin/dashboard');
        }
      }, 1000);

    } catch (err: any) {
      showToast('Acceso Denegado', err.message, 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      
      {/* ========================================================= */}
      {/* CONTENEDOR DE NOTIFICACIONES TOAST                        */}
      {/* ========================================================= */}
      <div className="fixed top-6 right-6 z-9999 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.9 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-start gap-3 w-80 p-4 rounded-xl shadow-2xl border backdrop-blur-xl ${
                toast.type === 'error' ? 'bg-red-500/10 border-red-500/30' : 
                toast.type === 'success' ? 'bg-green-500/10 border-green-500/30' : 
                'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              {toast.type === 'error' && <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />}
              {toast.type === 'success' && <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" />}
              {toast.type === 'info' && <Info className="h-6 w-6 text-blue-400 shrink-0" />}
              
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white mb-1">{toast.title}</h4>
                <p className="text-xs text-gray-300 leading-snug">{toast.desc}</p>
              </div>
              
              <button onClick={() => setToast(null)} className="text-gray-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Elementos Decorativos de Fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px] pointer-events-none"></div>

      {/* ESTADO DE CONEXIÓN RESTAURADO */}
      <div className="absolute top-6 left-6 md:left-auto md:right-6 flex items-center gap-2 bg-surface border border-white/10 px-4 py-2 rounded-full shadow-lg z-20">
        <Database className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:inline-block">Base de Datos:</span>
        {dbStatus === 'checking' && <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />}
        {dbStatus === 'connected' && <><Wifi className="h-4 w-4 text-green-500" /><span className="text-xs font-bold text-green-500">Conectada</span></>}
        {dbStatus === 'error' && <><WifiOff className="h-4 w-4 text-red-500" /><span className="text-xs font-bold text-red-500">Error</span></>}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-md bg-surface/80 backdrop-blur-2xl border border-white/10 p-10 rounded-4xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Plataforma ACOFI</h1>
          <p className="text-gray-400 mt-2 text-sm">Ingresa tus credenciales de administrador</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-2 ml-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="usuario@acofi.edu.co"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-2 ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading || dbStatus === 'error'} 
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-4d-static transition-transform active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Verificando...</> : 'Acceder al Sistema'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}