"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, CheckCircle2, Moon, Sun, Info, X } from 'lucide-react';
import { useTheme } from '../../ThemeProvider';

export default function ConfiguracionPage() {
  const { theme, setTheme } = useTheme();
  
  // SISTEMA DE NOTIFICACIONES (TOASTS)
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'info' | 'success' } | null>(null);

  const showToast = (title: string, desc: string, type: 'info' | 'success' = 'success') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    showToast(
      'Tema Actualizado', 
      `Has cambiado la apariencia del sistema al modo ${newTheme === 'dark' ? 'Oscuro Neón' : 'Claro Premium'}.`, 
      'success'
    );
  };

  return (
    <div className="space-y-8 max-w-5xl relative">
      
      {/* CONTENEDOR DE NOTIFICACIONES TOAST */}
      <div className="fixed top-6 right-6 z-9999 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.9 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-start gap-3 w-80 p-4 rounded-xl shadow-2xl border backdrop-blur-xl ${
                toast.type === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-blue-500/10 border-blue-500/30'
              }`}
            >
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

      <header>
        <h1 className="text-3xl font-bold text-white mb-2">Configuración del Sistema</h1>
        <p className="text-gray-400">Personaliza la apariencia y el comportamiento de la plataforma.</p>
      </header>

      <section className="bg-surface border border-white/5 rounded-2xl p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="flex items-center gap-3 mb-8 relative z-10">
          <Palette className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold text-white">Apariencia y Tema</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleThemeChange('dark')}
            className={`cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
              theme === 'dark' ? 'border-accent shadow-[0_0_30px_rgba(0,246,255,0.15)]' : 'border-white/10 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="h-40 bg-[#050505] p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#6d28d9]/40 blur-2xl rounded-full"></div>
              <div className="w-full flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#121212] border border-white/10"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-1/3 bg-white/20 rounded"></div>
                  <div className="h-2 w-1/4 bg-white/10 rounded"></div>
                </div>
              </div>
              <div className="w-full h-8 bg-linear-to-r from-[#00f6ff] to-[#6d28d9] rounded shadow-[4px_4px_0px_0px_rgba(0,246,255,0.8)] mt-auto"></div>
            </div>
            <div className="p-5 bg-surface border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-black/50 rounded-lg text-white">
                  <Moon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Oscuro Neón</h3>
                  <p className="text-xs text-gray-400">Diseño vanguardista (Por defecto)</p>
                </div>
              </div>
              {theme === 'dark' && <CheckCircle2 className="h-6 w-6 text-accent" />}
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleThemeChange('light')}
            className={`cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
              theme === 'light' ? 'border-primary shadow-[0_0_30px_rgba(79,70,229,0.15)]' : 'border-white/10 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="h-40 bg-[#f8fafc] p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#4f46e5]/20 blur-2xl rounded-full"></div>
              <div className="w-full flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 shadow-sm"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-1/3 bg-slate-800 rounded"></div>
                  <div className="h-2 w-1/4 bg-slate-400 rounded"></div>
                </div>
              </div>
              <div className="w-full h-8 bg-linear-to-r from-[#4f46e5] to-[#0ea5e9] rounded shadow-[4px_4px_0px_0px_rgba(15,23,42,0.8)] mt-auto"></div>
            </div>
            <div className="p-5 bg-surface border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-black/50 rounded-lg text-white">
                  <Sun className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Claro Premium</h3>
                  <p className="text-xs text-gray-400">Estética limpia y corporativa</p>
                </div>
              </div>
              {theme === 'light' && <CheckCircle2 className="h-6 w-6 text-primary" />}
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  );
}