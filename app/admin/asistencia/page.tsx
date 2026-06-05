"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ClipboardCheck, Loader2, Calendar, QrCode } from 'lucide-react';
import Link from 'next/link';

export default function AsistenciaListaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('is_deleted', false)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      setEvents(data || []);
      setLoading(false);
    }
    loadEvents();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
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
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-accent text-black hover:bg-accent/90 rounded-lg transition-transform font-bold shadow-4d-static active:translate-y-1 active:shadow-none">
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