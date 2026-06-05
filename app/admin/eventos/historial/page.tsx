"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Trash2, RefreshCcw, AlertTriangle, Loader2 } from 'lucide-react';

export default function HistorialEventosPage() {
  const [archivedEvents, setArchivedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedEvents();
  }, []);

  const fetchArchivedEvents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('is_deleted', true)
      .order('created_at', { ascending: false });
    
    setArchivedEvents(data || []);
    setLoading(false);
  };

  const restoreEvent = async (id: string) => {
    const { error } = await supabase.from('events').update({ is_deleted: false }).eq('id', id);
    if (!error) {
      alert("Evento restaurado al Dashboard.");
      fetchArchivedEvents();
    }
  };

  const permanentlyDelete = async (id: string) => {
    if (window.confirm("ATENCIÓN: Esto borrará el evento y TODAS sus inscripciones permanentemente de la base de datos. ¿Deseas continuar?")) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (!error) {
        alert("Evento borrado permanentemente.");
        fetchArchivedEvents();
      } else {
        alert("Error al borrar el evento.");
      }
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">Historial de Eventos (Papelera)</h1>
        <p className="text-gray-400">Eventos archivados. Puedes restaurarlos o eliminarlos permanentemente.</p>
      </header>

      <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : archivedEvents.length === 0 ? (
          <div className="p-10 text-center text-gray-500 flex flex-col items-center">
            <Trash2 className="h-12 w-12 mb-3 opacity-20" />
            <p>La papelera está vacía.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {archivedEvents.map((evento) => (
              <div key={evento.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-red-500/5">
                <div>
                  <h3 className="text-lg font-bold text-white opacity-60 line-through">{evento.name}</h3>
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Archivado
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => restoreEvent(evento.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium border border-white/10"
                  >
                    <RefreshCcw className="h-4 w-4" /> Restaurar
                  </button>
                  <button 
                    onClick={() => permanentlyDelete(evento.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors text-sm font-medium border border-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" /> Borrar Permanentemente
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}