"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, TrendingUp, Loader2, QrCode, ExternalLink, Trash2, PauseCircle, CopyPlus } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

export default function DashboardPage() {
  const [stats, setStats] = useState({ events: 0, users: 0, newUsers: 0 });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Total de eventos activos
    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);
      
    // 2. Total de usuarios históricos en la base
    const { count: usersCount } = await supabase
      .from('historic_users')
      .select('*', { count: 'exact', head: true });

    // 3. Calcular los registros de los últimos 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: newRegistrationsCount } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());
      
    // 4. Últimos eventos creados para la lista inferior
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5);

    setStats({ 
      events: eventsCount || 0, 
      users: usersCount || 0, 
      newUsers: newRegistrationsCount || 0
    });
    
    setRecentEvents(eventsData || []);
    setLoading(false);
  };

  const handleArchiveEvent = async (id: string, eventName: string) => {
    if (window.confirm(`¿Estás seguro de enviar "${eventName}" a la papelera?`)) {
      const { error } = await supabase
        .from('events')
        .update({ is_deleted: true })
        .eq('id', id);
        
      if (!error) {
        fetchData();
      }
    }
  };

  const handleDuplicateEvent = async (eventToCopy: any) => {
    if (!window.confirm(`¿Deseas duplicar el evento "${eventToCopy.name}" y toda su estructura de preguntas?`)) return;
    
    setLoading(true);
    try {
      // 1. Crear el nuevo evento (Copiando configuraciones, colores y aforos)
      const { data: newEvent, error: eventError } = await supabase.from('events').insert([{
        name: `${eventToCopy.name} (Copia)`,
        logo_url: eventToCopy.logo_url,
        send_notifications: eventToCopy.send_notifications,
        max_capacity: eventToCopy.max_capacity,
        close_date: eventToCopy.close_date,
        primary_color: eventToCopy.primary_color,
        accent_color: eventToCopy.accent_color,
        is_active: false // Las copias siempre nacen pausadas por seguridad
      }]).select().single();
      
      if (eventError) throw eventError;

      // 2. Traer los campos del evento original
      const { data: fields } = await supabase
        .from('event_fields')
        .select('*')
        .eq('event_id', eventToCopy.id);
      
      // 3. Insertar los campos en el nuevo evento
      if (fields && fields.length > 0) {
        const newFields = fields.map(f => ({
          event_id: newEvent.id,
          field_name: f.field_name,
          field_type: f.field_type,
          is_required: f.is_required,
          is_default: f.is_default,
          options: f.options,
          order_index: f.order_index
        }));
        await supabase.from('event_fields').insert(newFields);
      }
      
      alert("Evento duplicado con éxito. Está pausado por defecto.");
      fetchData();
    } catch (error) {
      alert("Error al duplicar: " + error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Panel de Control</h1>
          <p className="text-gray-400">Resumen general de eventos y registros históricos.</p>
        </div>
        <Link href="/admin/eventos/nuevo">
          <button className="bg-accent text-black font-bold py-3 px-6 rounded-lg flex items-center gap-2 shadow-4d-static transition-transform active:translate-y-1 hover:bg-accent/90">
            <Calendar className="h-5 w-5" /> 
            Nuevo Evento
          </button>
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-white/5 p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/20 rounded-lg text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">Eventos Activos</h3>
          </div>
          <p className="text-4xl font-bold text-white flex items-center gap-3">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : stats.events}
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface border border-white/5 p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-accent/20 rounded-lg text-accent">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">Base Histórica</h3>
          </div>
          <p className="text-4xl font-bold text-white flex items-center gap-3">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : stats.users}
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-surface border border-white/5 p-6 rounded-xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg text-green-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">Nuevos Registros</h3>
          </div>
          <p className="text-4xl font-bold text-white flex items-center gap-3">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-green-400" /> : stats.newUsers}
            {!loading && <span className="text-sm font-normal text-gray-400 ml-2">esta semana</span>}
          </p>
        </motion.div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Tus Eventos Activos</h2>
        <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
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
                        <h3 className="text-lg font-bold text-white">{evento.name}</h3>
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
                    <Link href={`/e/${evento.id}`} target="_blank">
                      <button className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium border border-white/10">
                        <ExternalLink className="h-4 w-4" /> Público
                      </button>
                    </Link>
                    <Link href={`/admin/eventos/${evento.id}`}>
                      <button className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-colors text-sm font-medium border border-primary/20">
                        <QrCode className="h-4 w-4" /> Gestionar
                      </button>
                    </Link>
                    <button 
                      onClick={() => handleDuplicateEvent(evento)} 
                      className="flex items-center gap-2 px-3 py-2 bg-accent/10 hover:bg-accent text-accent hover:text-black rounded-lg transition-colors text-sm font-medium border border-accent/20" 
                      title="Duplicar Evento"
                    >
                      <CopyPlus className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleArchiveEvent(evento.id, evento.name)} 
                      className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors text-sm font-medium border border-red-500/20" 
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