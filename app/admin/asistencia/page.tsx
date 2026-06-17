"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ClipboardCheck, Loader2, Calendar, QrCode, AlertCircle, CheckCircle2, Info, X, Globe } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../context/LanguageContext';

const systemTranslations: Record<string, Record<string, string>> = {
  es: {
    pageTitle: "Control de Asistencia",
    pageSubtitle: "Selecciona el evento activo para iniciar el check-in presencial.",
    noEvents: "No hay eventos activos en este momento.",
    btnStart: "Iniciar Check-In",
    createdAt: "Creado el",
    langSystem: "Idioma de Sistema"
  },
  en: {
    pageTitle: "Attendance Control",
    pageSubtitle: "Select the active event to start in-person check-in.",
    noEvents: "There are no active events at this time.",
    btnStart: "Start Check-In",
    createdAt: "Created on",
    langSystem: "System Language"
  }
};

export default function AsistenciaListaPage() {
  const { language, setLanguage } = useLanguage();
  const t = systemTranslations[language];

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

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
      
      {/* CONTENEDOR DE NOTIFICACIONES TOAST */}
      <div className="fixed top-6 right-6 z-9999 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.9 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-start gap-3 w-80 p-4 rounded-xl shadow-2xl border backdrop-blur-xl ${
                toast.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' : 
                toast.type === 'success' ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30' : 
                'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30'
              }`}
            >
              {toast.type === 'error' && <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400 shrink-0" />}
              {toast.type === 'success' && <CheckCircle2 className="h-6 w-6 text-green-500 dark:text-green-400 shrink-0" />}
              {toast.type === 'info' && <Info className="h-6 w-6 text-blue-500 dark:text-blue-400 shrink-0" />}
              
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{toast.title}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">{toast.desc}</p>
              </div>
              
              <button onClick={() => setToast(null)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-accent" /> 
            {t.pageTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t.pageSubtitle}</p>
        </div>

        <div className="relative z-50">
          <button 
            onClick={() => setShowSettingsPanel(!showSettingsPanel)} 
            className="p-3 bg-white dark:bg-surface border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:border-white/20 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all cursor-pointer shadow-sm dark:shadow-none"
          >
            <Globe className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {showSettingsPanel && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="absolute right-0 top-14 bg-white dark:bg-surface border border-gray-200 dark:border-white/10 p-3 rounded-xl shadow-2xl flex flex-col gap-2 w-44">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-1">{t.langSystem}</p>
                <button onClick={() => { setLanguage('es'); setShowSettingsPanel(false); }} className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${language === 'es' ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}>Español (ES)</button>
                <button onClick={() => { setLanguage('en'); setShowSettingsPanel(false); }} className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${language === 'en' ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}>English (EN)</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="bg-white dark:bg-surface border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center text-gray-500 font-medium">
            {t.noEvents}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {events.map((evento) => (
              <div 
                key={evento.id} 
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {evento.logo_url ? (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-black/30 p-1 flex items-center justify-center border border-gray-200 dark:border-white/10 shrink-0">
                      <img src={evento.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                      <Calendar className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{evento.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t.createdAt} {new Date(evento.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <Link href={`/admin/asistencia/${evento.id}`}>
                  <button className="flex items-center justify-center w-full md:w-auto gap-2 px-5 py-2.5 bg-accent text-black hover:bg-accent/90 rounded-lg transition-transform font-bold shadow-4d-static active:translate-y-1 active:shadow-none cursor-pointer">
                    <QrCode className="h-5 w-5" /> 
                    {t.btnStart}
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