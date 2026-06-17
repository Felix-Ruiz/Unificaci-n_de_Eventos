"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Trash2, RefreshCcw, AlertTriangle, Loader2, AlertCircle, CheckCircle2, Info, X, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../../context/LanguageContext';

const systemTranslations: Record<string, Record<string, string>> = {
  es: {
    pageTitle: "Historial de Eventos (Papelera)",
    pageSubtitle: "Eventos archivados. Puedes restaurarlos o eliminarlos permanentemente.",
    emptyTrash: "La papelera está vacía.",
    archived: "Archivado",
    btnRestore: "Restaurar",
    btnDelete: "Borrar",
    modalDelTitle: "Eliminación Definitiva",
    modalDelDesc1: "ATENCIÓN: Esto borrará el evento",
    modalDelDesc2: "y TODAS sus inscripciones permanentemente de la base de datos. Esta acción no se puede deshacer. ¿Deseas continuar?",
    btnCancel: "Cancelar",
    btnConfirmDel: "Borrar Permanentemente",
    langSystem: "Idioma de Sistema"
  },
  en: {
    pageTitle: "Events History (Trash)",
    pageSubtitle: "Archived events. You can restore them or delete them permanently.",
    emptyTrash: "The trash is empty.",
    archived: "Archived",
    btnRestore: "Restore",
    btnDelete: "Delete",
    modalDelTitle: "Permanent Deletion",
    modalDelDesc1: "WARNING: This will permanently delete the event",
    modalDelDesc2: "and ALL its registrations from the database. This action cannot be undone. Do you wish to continue?",
    btnCancel: "Cancel",
    btnConfirmDel: "Delete Permanently",
    langSystem: "System Language"
  }
};

export default function HistorialEventosPage() {
  const { language, setLanguage } = useLanguage();
  const t = systemTranslations[language];

  const [archivedEvents, setArchivedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // ==========================================
  // SISTEMA NATIVO DE NOTIFICACIONES Y MODALES
  // ==========================================
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'error' | 'info' | 'success' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);

  const showToast = (title: string, desc: string, type: 'error' | 'info' | 'success' = 'info') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetchArchivedEvents();
  }, []);

  const fetchArchivedEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_deleted', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setArchivedEvents(data || []);
    } catch (error) {
      showToast('Error de Carga', 'No se pudo obtener la lista de eventos archivados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const restoreEvent = async (id: string, name: string) => {
    try {
      const { error } = await supabase.from('events').update({ is_deleted: false }).eq('id', id);
      if (error) throw error;
      showToast('Evento Restaurado', `"${name}" ha sido devuelto al panel principal con éxito.`, 'success');
      fetchArchivedEvents();
    } catch (error) {
      showToast('Error', 'Hubo un problema al intentar restaurar el evento.', 'error');
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setConfirmModal({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    if (!confirmModal) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', confirmModal.id);
      if (error) throw error;
      showToast('Eliminación Definitiva', `El evento "${confirmModal.name}" fue borrado de forma permanente.`, 'success');
      fetchArchivedEvents();
    } catch (error) {
      showToast('Error Crítico', 'No se pudo borrar el evento de la base de datos.', 'error');
    } finally {
      setConfirmModal(null);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto relative pb-20">
      
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

      {/* MODAL 4D DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-1000 flex items-center justify-center bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t.modalDelTitle}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                {t.modalDelDesc1} <strong>"{confirmModal.name}"</strong> {t.modalDelDesc2}
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmModal(null)} className="px-5 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-medium cursor-pointer">{t.btnCancel}</button>
                <button 
                  onClick={confirmDelete} 
                  className="px-5 py-2.5 rounded-lg text-white font-bold bg-red-500 hover:bg-red-600 transition-transform active:scale-95 shadow-4d-static cursor-pointer"
                >
                  {t.btnConfirmDel}
                </button>
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
        {loading && !confirmModal ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : archivedEvents.length === 0 ? (
          <div className="p-10 text-center text-gray-500 flex flex-col items-center">
            <Trash2 className="h-12 w-12 mb-3 opacity-20" />
            <p>{t.emptyTrash}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {archivedEvents.map((evento) => (
              <div key={evento.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-red-50 dark:bg-red-500/5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white opacity-60 line-through">{evento.name}</h3>
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {t.archived}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => restoreEvent(evento.id, evento.name)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white rounded-lg transition-colors text-sm font-medium border border-gray-200 dark:border-white/10 w-full md:w-auto cursor-pointer"
                  >
                    <RefreshCcw className="h-4 w-4" /> {t.btnRestore}
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(evento.id, evento.name)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white dark:bg-red-500/10 dark:text-red-500 rounded-lg transition-colors text-sm font-medium border border-red-200 dark:border-red-500/20 w-full md:w-auto cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" /> {t.btnDelete}
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