"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, TrendingUp, Loader2, QrCode, ExternalLink, Trash2, PauseCircle, CopyPlus, AlertCircle, CheckCircle2, X, Globe } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../context/LanguageContext';

const systemTranslations: Record<string, Record<string, string>> = {
  es: {
    pageTitle: "Panel de Control",
    pageSubtitle: "Resumen general de eventos y registros históricos.",
    btnNewEvent: "Nuevo Evento",
    activeEvents: "Eventos Activos",
    historicBase: "Base Histórica",
    newRegs: "Nuevos Registros",
    thisWeek: "esta semana",
    yourActiveEvents: "Tus Eventos Activos",
    noActiveEvents: "No hay eventos activos.",
    paused: "PAUSADO",
    createdAt: "Creado el",
    btnPublic: "Público",
    btnManage: "Gestionar",
    modalArchiveTitle: "Archivar Evento",
    modalArchiveDesc1: "¿Estás seguro de enviar",
    modalArchiveDesc2: "a la papelera? Esta acción desactivará los registros públicos.",
    modalDuplicateTitle: "Duplicar Evento",
    modalDuplicateDesc1: "¿Deseas crear una copia idéntica de",
    modalDuplicateDesc2: "incluyendo todas sus preguntas y configuraciones?",
    btnCancel: "Cancelar",
    btnConfirm: "Confirmar Acción",
    langSystem: "Idioma de Sistema"
  },
  en: {
    pageTitle: "Dashboard",
    pageSubtitle: "Overview of events and historical registrations.",
    btnNewEvent: "New Event",
    activeEvents: "Active Events",
    historicBase: "Historical Database",
    newRegs: "New Registrations",
    thisWeek: "this week",
    yourActiveEvents: "Your Active Events",
    noActiveEvents: "No active events.",
    paused: "PAUSED",
    createdAt: "Created on",
    btnPublic: "Public",
    btnManage: "Manage",
    modalArchiveTitle: "Archive Event",
    modalArchiveDesc1: "Are you sure you want to move",
    modalArchiveDesc2: "to the trash? This will disable public registrations.",
    modalDuplicateTitle: "Duplicate Event",
    modalDuplicateDesc1: "Do you want to create an exact copy of",
    modalDuplicateDesc2: "including all questions and settings?",
    btnCancel: "Cancel",
    btnConfirm: "Confirm Action",
    langSystem: "System Language"
  }
};

export default function DashboardPage() {
  const { language, setLanguage } = useLanguage();
  const t = systemTranslations[language];

  const [stats, setStats] = useState({ events: 0, users: 0, newUsers: 0 });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // SISTEMA NATIVO DE NOTIFICACIONES Y MODALES (Reemplazo de alert y confirm)
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'error' | 'success' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'archive' | 'duplicate'; event: any } | null>(null);
  
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const showToast = (title: string, desc: string, type: 'error' | 'success' = 'success') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('is_deleted', false);
    const { count: usersCount } = await supabase.from('historic_users').select('*', { count: 'exact', head: true });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: newRegistrationsCount } = await supabase.from('registrations').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString());
      
    const { data: eventsData } = await supabase.from('events').select('*').eq('is_deleted', false).order('created_at', { ascending: false }).limit(5);

    setStats({ events: eventsCount || 0, users: usersCount || 0, newUsers: newRegistrationsCount || 0 });
    setRecentEvents(eventsData || []);
    setLoading(false);
  };

  const executeAction = async () => {
    if (!confirmModal) return;
    setLoading(true);

    try {
      if (confirmModal.type === 'archive') {
        const { error } = await supabase.from('events').update({ is_deleted: true }).eq('id', confirmModal.event.id);
        if (error) throw error;
        showToast('Evento Archivado', `El evento "${confirmModal.event.name}" se movió a la papelera.`, 'success');
      } 
      
      else if (confirmModal.type === 'duplicate') {
        const { data: newEvent, error: eventError } = await supabase.from('events').insert([{
          name: `${confirmModal.event.name} (Copia)`,
          logo_url: confirmModal.event.logo_url,
          send_notifications: confirmModal.event.send_notifications,
          max_capacity: confirmModal.event.max_capacity,
          close_date: confirmModal.event.close_date,
          primary_color: confirmModal.event.primary_color,
          accent_color: confirmModal.event.accent_color,
          is_active: false
        }]).select().single();
        
        if (eventError) throw eventError;

        const { data: fields } = await supabase.from('event_fields').select('*').eq('event_id', confirmModal.event.id);
        if (fields && fields.length > 0) {
          const newFields = fields.map(f => ({
            event_id: newEvent.id, field_name: f.field_name, field_type: f.field_type, is_required: f.is_required,
            is_default: f.is_default, options: f.options, order_index: f.order_index
          }));
          await supabase.from('event_fields').insert(newFields);
        }
        showToast('Evento Duplicado', `La estructura ha sido copiada con éxito. El evento está pausado.`, 'success');
      }
      
      await fetchData();
    } catch (error: any) {
      showToast('Error', error.message || 'Ha ocurrido un problema ejecutando la acción.', 'error');
      setLoading(false);
    } finally {
      setConfirmModal(null);
    }
  };

  return (
    <div className="space-y-8 relative">
      
      {/* NOTIFICACIONES TOAST */}
      <div className="fixed top-6 right-6 z-9999 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-start gap-3 w-80 p-4 rounded-xl shadow-2xl border backdrop-blur-xl ${
                toast.type === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'
              }`}
            >
              {toast.type === 'error' ? <AlertCircle className="h-6 w-6 text-red-400 shrink-0" /> : <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" />}
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white mb-1">{toast.title}</h4>
                <p className="text-xs text-gray-300 leading-snug">{toast.desc}</p>
              </div>
              <button onClick={() => setToast(null)} className="text-gray-500 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL 4D DE CONFIRMACIÓN */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-1 ${confirmModal.type === 'archive' ? 'bg-red-500' : 'bg-accent'}`}></div>
              <h2 className="text-2xl font-bold text-white mb-3">
                {confirmModal.type === 'archive' ? t.modalArchiveTitle : t.modalDuplicateTitle}
              </h2>
              <p className="text-gray-300 mb-8">
                {confirmModal.type === 'archive' 
                  ? `${t.modalArchiveDesc1} "${confirmModal.event.name}" ${t.modalArchiveDesc2}`
                  : `${t.modalDuplicateDesc1} "${confirmModal.event.name}" ${t.modalDuplicateDesc2}`}
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmModal(null)} className="px-5 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 transition-colors font-medium cursor-pointer">{t.btnCancel}</button>
                <button 
                  onClick={executeAction} 
                  className={`px-5 py-2.5 rounded-lg text-white font-bold transition-transform active:scale-95 shadow-4d-static cursor-pointer ${
                    confirmModal.type === 'archive' ? 'bg-red-500 hover:bg-red-600' : 'bg-accent hover:bg-accent/90 text-black'
                  }`}
                >
                  {t.btnConfirm}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.pageTitle}</h1>
          <p className="text-gray-400">{t.pageSubtitle}</p>
        </div>
        
        <div className="flex items-center gap-3 relative">
          {/* SWITCH DE IDIOMA DEL PANEL DE CONTROL */}
          <button 
            onClick={() => setShowSettingsPanel(!showSettingsPanel)} 
            className="p-3 bg-surface border border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer shadow-sm"
            title={t.langSystem}
          >
            <Globe className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {showSettingsPanel && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="absolute right-40 top-14 bg-surface border border-white/10 p-3 rounded-xl shadow-2xl z-50 flex flex-col gap-2 w-44">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-1">{t.langSystem}</p>
                <button onClick={() => { setLanguage('es'); setShowSettingsPanel(false); }} className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${language === 'es' ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/5'}`}>Español (ES)</button>
                <button onClick={() => { setLanguage('en'); setShowSettingsPanel(false); }} className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${language === 'en' ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/5'}`}>English (EN)</button>
              </motion.div>
            )}
          </AnimatePresence>

          <Link href="/admin/eventos/nuevo">
            <button className="bg-accent text-black font-bold py-3 px-6 rounded-lg flex items-center gap-2 shadow-4d-static transition-transform active:translate-y-1 hover:bg-accent/90 cursor-pointer">
              <Calendar className="h-5 w-5" /> 
              {t.btnNewEvent}
            </button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-white/5 p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/20 rounded-lg text-primary"><Calendar className="h-6 w-6" /></div>
            <h3 className="text-lg font-semibold text-white">{t.activeEvents}</h3>
          </div>
          <p className="text-4xl font-bold text-white flex items-center gap-3">
            {loading && !confirmModal ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : stats.events}
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface border border-white/5 p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-accent/20 rounded-lg text-accent"><Users className="h-6 w-6" /></div>
            <h3 className="text-lg font-semibold text-white">{t.historicBase}</h3>
          </div>
          <p className="text-4xl font-bold text-white flex items-center gap-3">
            {loading && !confirmModal ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : stats.users}
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-surface border border-white/5 p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg text-green-400"><TrendingUp className="h-6 w-6" /></div>
            <h3 className="text-lg font-semibold text-white">{t.newRegs}</h3>
          </div>
          <p className="text-4xl font-bold text-white flex items-center gap-3">
            {loading && !confirmModal ? <Loader2 className="h-6 w-6 animate-spin text-green-400" /> : stats.newUsers}
            {!loading && <span className="text-sm font-normal text-gray-400 ml-2">{t.thisWeek}</span>}
          </p>
        </motion.div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">{t.yourActiveEvents}</h2>
        <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
          {loading && !confirmModal ? (
            <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : recentEvents.length === 0 ? (
            <div className="p-10 text-center text-gray-500">{t.noActiveEvents}</div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentEvents.map((evento) => (
                <div key={evento.id} className="p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
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
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/eventos/${evento.id}`}>
                          <h3 className="text-lg font-bold text-white hover:text-primary transition-colors cursor-pointer">
                            {evento.name}
                          </h3>
                        </Link>
                        {!evento.is_active && (
                          <span className="bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1">
                            <PauseCircle className="h-3 w-3" /> {t.paused}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{t.createdAt} {new Date(evento.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/e/${evento.slug || evento.id}`} target="_blank">
                      <button className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium border border-white/10 cursor-pointer">
                        <ExternalLink className="h-4 w-4" /> {t.btnPublic}
                      </button>
                    </Link>
                    <Link href={`/admin/eventos/${evento.id}`}>
                      <button className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-colors text-sm font-medium border border-primary/20 cursor-pointer">
                        <QrCode className="h-4 w-4" /> {t.btnManage}
                      </button>
                    </Link>
                    <button 
                      onClick={() => setConfirmModal({ isOpen: true, type: 'duplicate', event: evento })} 
                      className="flex items-center gap-2 px-3 py-2 bg-accent/10 hover:bg-accent text-accent hover:text-black rounded-lg transition-colors text-sm font-medium border border-accent/20 cursor-pointer" 
                      title={t.modalDuplicateTitle}
                    >
                      <CopyPlus className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setConfirmModal({ isOpen: true, type: 'archive', event: evento })} 
                      className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors text-sm font-medium border border-red-500/20 cursor-pointer" 
                      title={t.modalArchiveTitle}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}