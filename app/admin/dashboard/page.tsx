"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, TrendingUp, Loader2, QrCode, ExternalLink, Trash2, PauseCircle, CopyPlus, AlertCircle, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

export default function DashboardPage() {
  const [stats, setStats] = useState({ events: 0, users: 0, newUsers: 0 });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // SISTEMA NATIVO DE NOTIFICACIONES Y MODALES (Reemplazo de alert y confirm)
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'error' | 'success' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'archive' | 'duplicate'; event: any } | null>(null);

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
                {confirmModal.type === 'archive' ? 'Archivar Evento' : 'Duplicar Evento'}
              </h2>
              <p className="text-gray-300 mb-8">
                {confirmModal.type === 'archive' 
                  ? `¿Estás seguro de enviar "${confirmModal.event.name}" a la papelera? Esta acción desactivará los registros públicos.`
                  : `¿Deseas crear una copia idéntica de "${confirmModal.event.name}" incluyendo todas sus preguntas y configuraciones?`}
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmModal(null)} className="px-5 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 transition-colors font-medium cursor-pointer">Cancelar</button>
                <button 
                  onClick={executeAction} 
                  className={`px-5 py-2.5 rounded-lg text-white font-bold transition-transform active:scale-95 shadow-4d-static cursor-pointer ${
                    confirmModal.type === 'archive' ? 'bg-red-500 hover:bg-red-600' : 'bg-accent hover:bg-accent/90 text-black'
                  }`}
                >
                  Confirmar Acción
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Panel de Control</h1>
          <p className="text-gray-400">Resumen general de eventos y registros históricos.</p>
        </div>
        <Link href="/admin/eventos/nuevo">
          <button className="bg-accent text-black font-bold py-3 px-6 rounded-lg flex items-center gap-2 shadow-4d-static transition-transform active:translate-y-1 hover:bg-accent/90 cursor-pointer">
            <Calendar className="h-5 w-5" /> 
            Nuevo Evento
          </button>
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-white/5 p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/20 rounded-lg text-primary"><Calendar className="h-6 w-6" /></div>
            <h3 className="text-lg font-semibold text-white">Eventos Activos</h3>
          </div>
          <p className="text-4xl font-bold text-white flex items-center gap-3">
            {loading && !confirmModal ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : stats.events}
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface border border-white/5 p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-accent/20 rounded-lg text-accent"><Users className="h-6 w-6" /></div>
            <h3 className="text-lg font-semibold text-white">Base Histórica</h3>
          </div>
          <p className="text-4xl font-bold text-white flex items-center gap-3">
            {loading && !confirmModal ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : stats.users}
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-surface border border-white/5 p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg text-green-400"><TrendingUp className="h-6 w-6" /></div>
            <h3 className="text-lg font-semibold text-white">Nuevos Registros</h3>
          </div>
          <p className="text-4xl font-bold text-white flex items-center gap-3">
            {loading && !confirmModal ? <Loader2 className="h-6 w-6 animate-spin text-green-400" /> : stats.newUsers}
            {!loading && <span className="text-sm font-normal text-gray-400 ml-2">esta semana</span>}
          </p>
        </motion.div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Tus Eventos Activos</h2>
        <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
          {loading && !confirmModal ? (
            <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : recentEvents.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No hay eventos activos.</div>
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
                        {/* ENLACE DIRECTO EN EL NOMBRE DEL EVENTO (PUNTO 7) */}
                        <Link href={`/admin/eventos/${evento.id}`}>
                          <h3 className="text-lg font-bold text-white hover:text-primary transition-colors cursor-pointer">
                            {evento.name}
                          </h3>
                        </Link>
                        {!evento.is_active && (
                          <span className="bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1">
                            <PauseCircle className="h-3 w-3" /> PAUSADO
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">Creado el {new Date(evento.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/e/${evento.slug || evento.id}`} target="_blank">
                      <button className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium border border-white/10 cursor-pointer">
                        <ExternalLink className="h-4 w-4" /> Público
                      </button>
                    </Link>
                    <Link href={`/admin/eventos/${evento.id}`}>
                      <button className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-colors text-sm font-medium border border-primary/20 cursor-pointer">
                        <QrCode className="h-4 w-4" /> Gestionar
                      </button>
                    </Link>
                    <button 
                      onClick={() => setConfirmModal({ isOpen: true, type: 'duplicate', event: evento })} 
                      className="flex items-center gap-2 px-3 py-2 bg-accent/10 hover:bg-accent text-accent hover:text-black rounded-lg transition-colors text-sm font-medium border border-accent/20 cursor-pointer" 
                      title="Duplicar Evento"
                    >
                      <CopyPlus className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setConfirmModal({ isOpen: true, type: 'archive', event: evento })} 
                      className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors text-sm font-medium border border-red-500/20 cursor-pointer" 
                      title="Mover a la papelera"
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