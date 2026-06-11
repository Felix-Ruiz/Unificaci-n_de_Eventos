"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ClipboardCheck, Loader2, Calendar, QrCode, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function AsistenciaListaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // SISTEMA DE NOTIFICACIONES (TOASTS NATIVOS)
  // ==========================================
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'error' | 'info' | 'success' } | null>(null);

  const showToast = (title: string, desc: string, type: 'error' | 'info' | 'success' = 'error') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    async function loadEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('is_deleted', false)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setEvents(data || []);
      } catch (error: any) {
        showToast('Error de Carga', 'No se pudieron obtener los eventos activos. Verifica tu conexión a internet.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto relative">
      
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
              
              <button onClick={() => setToast(null)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <header>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-accent" /> 
          Control de Asistencia
        </h1>
        <p className="text-gray-400">Selecciona el evento activo para iniciar el check-in presencial.</p>
      </header>

      <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No hay eventos activos en este momento.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {events.map((evento) => (
              <div 
                key={evento.id} 
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {evento.logo_url ? (
                    <div className="w-12 h-12 rounded-lg bg-black/30 p-1 flex items-center justify-center border border-white/10 shrink-0">
                      <img src={evento.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/20 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                      <Calendar className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white">{evento.name}</h3>
                    <p className="text-sm text-gray-400">
                      Creado el {new Date(evento.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <Link href={`/admin/asistencia/${evento.id}`}>
                  <button className="flex items-center justify-center w-full md:w-auto gap-2 px-5 py-2.5 bg-accent text-black hover:bg-accent/90 rounded-lg transition-transform font-bold shadow-4d-static active:translate-y-1 active:shadow-none cursor-pointer">
                    <QrCode className="h-5 w-5" /> 
                    Iniciar Check-In
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}