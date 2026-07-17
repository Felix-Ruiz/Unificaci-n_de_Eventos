"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, TrendingUp, Loader2, QrCode, ExternalLink, Trash2, PauseCircle, CopyPlus, AlertCircle, CheckCircle2, X, Globe, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../context/LanguageContext';

const systemTranslations: Record<string, Record<string, string>> = {
  es: {
    pageTitle: "Panel de Control",
    pageSubtitle: "Resumen general de eventos y registros históricos.",
    btnNewEvent: "Nuevo Evento",
    activeEvents: "Eventos Totales",
    historicBase: "Base Histórica",
    newRegs: "Nuevos Registros",
    thisWeek: "esta semana",
    yourActiveEvents: "Tus Eventos Activos",
    noActiveEvents: "No hay eventos que coincidan con la búsqueda.",
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
    modalNewRegsTitle: "Desglose de Nuevos Registros",
    modalNewRegsDesc: "Cantidad de inscripciones en los últimos 7 días por evento.",
    btnCancel: "Cancelar",
    btnConfirm: "Confirmar Acción",
    langSystem: "Idioma de Sistema",
    searchEvents: "Buscar eventos por nombre...",
    page: "Página",
    of: "de"
  },
  en: {
    pageTitle: "Dashboard",
    pageSubtitle: "Overview of events and historical registrations.",
    btnNewEvent: "New Event",
    activeEvents: "Total Events",
    historicBase: "Historical Database",
    newRegs: "New Registrations",
    thisWeek: "this week",
    yourActiveEvents: "Your Active Events",
    noActiveEvents: "No events match your search.",
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
    modalNewRegsTitle: "New Registrations Breakdown",
    modalNewRegsDesc: "Number of registrations in the last 7 days per event.",
    btnCancel: "Cancel",
    btnConfirm: "Confirm Action",
    langSystem: "System Language",
    searchEvents: "Search events by name...",
    page: "Page",
    of: "of"
  }
};

const cleanHTML = (html: string) => {
  if (!html) return "";
  return html.replace(/(<([^>]+)>)/gi, "").replace(/&nbsp;/gi, " ").trim();
};

export default function DashboardPage() {
  const { language, setLanguage } = useLanguage();
  const t = systemTranslations[language];

  const [stats, setStats] = useState({ events: 0, users: 0, newUsers: 0 });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  
  // ESTADO PARA EL DESGLOSE DE NUEVOS REGISTROS
  const [newRegsBreakdown, setNewRegsBreakdown] = useState<{ id: string, name: string, count: number }[]>([]);
  const [showNewRegsModal, setShowNewRegsModal] = useState(false);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 5;

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
    
    // Obtenemos los registros nuevos para hacer el conteo y el desglose al mismo tiempo
    const { data: newRegsData, count: newRegistrationsCount } = await supabase
      .from('registrations')
      .select('event_id', { count: 'exact' })
      .gte('created_at', sevenDaysAgo.toISOString());
      
    const { data: eventsData } = await supabase.from('events').select('*').eq('is_deleted', false).order('created_at', { ascending: false });

    // PROCESAMIENTO DEL DESGLOSE DE REGISTROS
    const breakdownMap: Record<string, number> = {};
    if (newRegsData) {
      newRegsData.forEach(reg => {
        if (reg.event_id) {
          breakdownMap[reg.event_id] = (breakdownMap[reg.event_id] || 0) + 1;
        }
      });
    }
    
    const breakdownArray = Object.keys(breakdownMap).map(eventId => {
      const eventInfo = eventsData?.find(e => e.id === eventId);
      return {
        id: eventId,
        name: eventInfo ? cleanHTML(eventInfo.name) : 'Evento Desconocido',
        count: breakdownMap[eventId]
      };
    }).sort((a, b) => b.count - a.count); // Ordenar de mayor a menor

    setNewRegsBreakdown(breakdownArray);
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
        showToast('Evento Archivado', `El evento "${cleanHTML(confirmModal.event.name)}" se movió a la papelera.`, 'success');
      } 
      
      else if (confirmModal.type === 'duplicate') {
        const { data: newEvent, error: eventError } = await supabase.from('events').insert([{
          name: `${cleanHTML(confirmModal.event.name)} (Copia)`,
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
      setCurrentPage(1);
    } catch (error: any) {
      showToast('Error', error.message || 'Ha ocurrido un problema ejecutando la acción.', 'error');
      setLoading(false);
    } finally {
      setConfirmModal(null);
    }
  };

  const filteredEvents = recentEvents.filter(evento => 
    cleanHTML(evento.name).toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage) || 1;
  const currentEvents = filteredEvents.slice((currentPage - 1) * eventsPerPage, currentPage * eventsPerPage);

  const scrollToEvents = () => {
    document.getElementById('seccion-eventos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 relative">
      
      <div className="fixed top-6 right-6 z-9999 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-start gap-3 w-80 p-4 rounded-xl shadow-2xl border backdrop-blur-xl ${
                toast.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' : 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30'
              }`}
            >
              {toast.type === 'error' ? <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400 shrink-0" /> : <CheckCircle2 className="h-6 w-6 text-green-500 dark:text-green-400 shrink-0" />}
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{toast.title}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">{toast.desc}</p>
              </div>
              <button onClick={() => setToast(null)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-1 ${confirmModal.type === 'archive' ? 'bg-red-500' : 'bg-accent'}`}></div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {confirmModal.type === 'archive' ? t.modalArchiveTitle : t.modalDuplicateTitle}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                {confirmModal.type === 'archive' 
                  ? `${t.modalArchiveDesc1} "${cleanHTML(confirmModal.event.name)}" ${t.modalArchiveDesc2}`
                  : `${t.modalDuplicateDesc1} "${cleanHTML(confirmModal.event.name)}" ${t.modalDuplicateDesc2}`}
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmModal(null)} className="px-5 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-medium cursor-pointer">{t.btnCancel}</button>
                <button 
                  onClick={executeAction} 
                  className={`px-5 py-2.5 rounded-lg text-gray-900 dark:text-black font-bold transition-transform active:scale-95 shadow-4d-static cursor-pointer ${
                    confirmModal.type === 'archive' ? 'bg-red-500 hover:bg-red-600 text-white dark:text-white' : 'bg-accent hover:bg-accent/90'
                  }`}
                >
                  {t.btnConfirm}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewRegsModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-lg p-6 md:p-8 shadow-2xl relative overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
              
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  {t.modalNewRegsTitle}
                </h2>
                <button onClick={() => setShowNewRegsModal(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer p-1">
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t.modalNewRegsDesc}</p>

              <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-3">
                {newRegsBreakdown.length === 0 ? (
                  <div className="text-center p-8 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                    <p className="text-gray-500 dark:text-gray-400 italic text-sm">No se han registrado usuarios en los últimos 7 días.</p>
                  </div>
                ) : (
                  newRegsBreakdown.map((item) => (
                    <Link 
                      href={`/admin/eventos/${item.id}`} 
                      key={item.id} 
                      className="block outline-none"
                      onClick={() => setShowNewRegsModal(false)}
                    >
                      <div className="group flex justify-between items-center p-4 bg-gray-50 dark:bg-black/30 hover:bg-gray-100 dark:hover:bg-white/5 hover:border-primary/30 transition-colors rounded-xl border border-gray-200 dark:border-white/5 cursor-pointer">
                        <span className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1 pr-4" title={item.name}>
                          {item.name}
                        </span>
                        <span className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 font-black px-3 py-1 rounded-lg text-sm shrink-0 group-hover:bg-green-500/20 transition-colors">
                          +{item.count}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.pageTitle}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t.pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-3 relative">
          
          <button 
            onClick={() => setShowSettingsPanel(!showSettingsPanel)} 
            className="p-3 bg-white dark:bg-surface border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:border-white/20 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all cursor-pointer shadow-sm dark:shadow-none"
            title={t.langSystem}
          >
            <Globe className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {showSettingsPanel && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="absolute right-36 top-14 bg-white dark:bg-surface border border-gray-200 dark:border-white/10 p-3 rounded-xl shadow-2xl z-50 flex flex-col gap-2 w-44">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-1">{t.langSystem}</p>
                <button onClick={() => { setLanguage('es'); setShowSettingsPanel(false); }} className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${language === 'es' ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}>Español (ES)</button>
                <button onClick={() => { setLanguage('en'); setShowSettingsPanel(false); }} className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${language === 'en' ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}>English (EN)</button>
              </motion.div>
            )}
          </AnimatePresence>

          <Link href="/admin/eventos/nuevo">
            <button className="bg-accent text-gray-900 dark:text-black font-bold py-3 px-6 rounded-lg flex items-center gap-2 shadow-4d-static transition-transform active:translate-y-1 hover:bg-accent/90 cursor-pointer">
              <Calendar className="h-5 w-5" /> 
              {t.btnNewEvent}
            </button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          onClick={scrollToEvents}
          className="bg-white dark:bg-surface border border-gray-200 dark:border-white/10 p-6 rounded-xl relative overflow-hidden shadow-sm dark:shadow-none hover:border-primary/50 dark:hover:border-primary/50 cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary group-hover:scale-110 transition-transform"><Calendar className="h-6 w-6" /></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{t.activeEvents}</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            {loading && !confirmModal ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : stats.events}
          </p>
        </motion.div>
        
        <Link href="/admin/historico" className="block outline-none">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }} 
            className="h-full bg-white dark:bg-surface border border-gray-200 dark:border-white/10 p-6 rounded-xl relative overflow-hidden shadow-sm dark:shadow-none hover:border-accent/50 dark:hover:border-accent/50 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-accent/10 dark:bg-accent/20 rounded-lg text-accent group-hover:scale-110 transition-transform"><Users className="h-6 w-6" /></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-accent transition-colors">{t.historicBase}</h3>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              {loading && !confirmModal ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : stats.users}
            </p>
          </motion.div>
        </Link>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }} 
          onClick={() => setShowNewRegsModal(true)}
          className="bg-white dark:bg-surface border border-gray-200 dark:border-white/10 p-6 rounded-xl relative overflow-hidden shadow-sm dark:shadow-none hover:border-green-500/50 dark:hover:border-green-500/50 cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-500/10 dark:bg-green-500/20 rounded-lg text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform"><TrendingUp className="h-6 w-6" /></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-green-500 transition-colors">{t.newRegs}</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            {loading && !confirmModal ? <Loader2 className="h-6 w-6 animate-spin text-green-600 dark:text-green-400" /> : stats.newUsers}
            {!loading && <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2 group-hover:text-green-500/80 transition-colors">{t.thisWeek}</span>}
          </p>
        </motion.div>
      </div>

      <div id="seccion-eventos" className="scroll-mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.yourActiveEvents}</h2>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <input 
              type="text" 
              placeholder={t.searchEvents}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); 
              }}
              className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary transition-colors shadow-sm dark:shadow-none"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm dark:shadow-none relative min-h-75">
          {loading && !confirmModal ? (
            <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : currentEvents.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">{t.noActiveEvents}</div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="divide-y divide-gray-100 dark:divide-white/5 flex-1">
                {currentEvents.map((evento) => (
                  <div key={evento.id} className="p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {evento.logo_url ? (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-black/30 p-1 flex items-center justify-center border border-gray-200 dark:border-white/10 shrink-0">
                          <img src={evento.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                          <Calendar className="h-6 w-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Link href={`/admin/eventos/${evento.id}`}>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white hover:text-primary transition-colors cursor-pointer wrap-break-word">
                              {cleanHTML(evento.name)}
                            </h3>
                          </Link>
                          {!evento.is_active && (
                            <span className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1 shrink-0">
                              <PauseCircle className="h-3 w-3" /> {t.paused}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.createdAt} {new Date(evento.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap xl:flex-nowrap items-center gap-2 shrink-0">
                      <Link href={`/e/${evento.slug || evento.id}`} target="_blank">
                        <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white rounded-lg transition-colors text-sm font-medium border border-gray-200 dark:border-white/10 cursor-pointer">
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
                        className="flex items-center gap-2 px-3 py-2 bg-accent/10 hover:bg-accent text-accent hover:text-gray-900 dark:hover:text-black rounded-lg transition-colors text-sm font-medium border border-accent/20 cursor-pointer" 
                        title={t.modalDuplicateTitle}
                      >
                        <CopyPlus className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setConfirmModal({ isOpen: true, type: 'archive', event: evento })} 
                        className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white dark:bg-red-500/10 dark:hover:bg-red-500 dark:text-red-500 rounded-lg transition-colors text-sm font-medium border border-red-200 dark:border-red-500/20 cursor-pointer" 
                        title={t.modalArchiveTitle}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-black/20">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t.page} {currentPage} {t.of} {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1} 
                      className="p-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-transparent rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer text-gray-700 dark:text-white transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages} 
                      className="p-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-transparent rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer text-gray-700 dark:text-white transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}