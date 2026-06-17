"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Edit, FileSpreadsheet, Loader2, X, Trash2, 
  ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, 
  AlertCircle, CheckCircle2, Info, Download, Trash, Globe 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../context/LanguageContext';

const systemTranslations: Record<string, Record<string, string>> = {
  es: {
    pageTitle: "Base Histórica de Usuarios",
    pageSubtitle: "Gestiona y localiza a los participantes de eventos anteriores.",
    btnDownload: "Descargar BD",
    btnDeleteAll: "Vaciar Todo",
    btnUpload: "Cargar Histórico",
    searchPlaceholder: "Buscar por nombre, documento o correo...",
    showText: "Mostrar:",
    records: "registros",
    colDoc: "Documento",
    colPart: "Participante",
    colCont: "Contacto",
    colInst: "Institución / Cargo",
    colLoc: "Ubicación",
    colActions: "Acciones",
    showing: "Mostrando",
    to: "a",
    of: "de",
    results: "resultados",
    modalEmptyTitle: "Vaciar Base Histórica",
    modalEmptyDesc: "¿Estás completamente seguro de ELIMINAR TODOS los registros del histórico? Esta acción es destructiva y no se puede deshacer.",
    modalDeleteTitle: "Eliminar Registro",
    modalDeleteDesc: "¿Estás seguro de que deseas eliminar a este usuario histórico? Esta acción es irreversible.",
    btnCancel: "Cancelar",
    btnConfirmEmpty: "Sí, Vaciar Base",
    btnConfirmDelete: "Eliminar Usuario",
    langSystem: "Idioma de Sistema"
  },
  en: {
    pageTitle: "Historical User Database",
    pageSubtitle: "Manage and locate participants from previous events.",
    btnDownload: "Download DB",
    btnDeleteAll: "Empty All",
    btnUpload: "Upload History",
    searchPlaceholder: "Search by name, document or email...",
    showText: "Show:",
    records: "records",
    colDoc: "Document ID",
    colPart: "Participant",
    colCont: "Contact",
    colInst: "Institution / Role",
    colLoc: "Location",
    colActions: "Actions",
    showing: "Showing",
    to: "to",
    of: "of",
    results: "results",
    modalEmptyTitle: "Empty Historical Database",
    modalEmptyDesc: "Are you absolutely sure you want to DELETE ALL historical records? This action is destructive and cannot be undone.",
    modalDeleteTitle: "Delete Record",
    modalDeleteDesc: "Are you sure you want to delete this historical user? This action is irreversible.",
    btnCancel: "Cancel",
    btnConfirmEmpty: "Yes, Empty DB",
    btnConfirmDelete: "Delete User",
    langSystem: "System Language"
  }
};

interface HistoricUser {
  email: string;
  documento_identidad: string;
  nombre: string;
  apellido: string;
  genero: string;
  direccion: string;
  telefono: string;
  institucion: string;
  cargo: string;
  ciudad: string;
  pais: string;
}

export default function HistoricoPage() {
  const { language, setLanguage } = useLanguage();
  const t = systemTranslations[language];

  const [users, setUsers] = useState<HistoricUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingUser, setEditingUser] = useState<HistoricUser | null>(null);

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalUsers, setTotalUsers] = useState(0);

  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // ==========================================
  // SISTEMA NATIVO DE NOTIFICACIONES Y MODALES
  // ==========================================
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'error' | 'info' | 'success' } | null>(null);
  
  // Modificamos el estado del modal para soportar tanto eliminación individual como masiva (vaciar)
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id?: string; type: 'single' | 'deleteAll' } | null>(null);

  const showToast = (title: string, desc: string, type: 'error' | 'info' | 'success' = 'info') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Efecto principal para la paginación y búsqueda
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentPage, itemsPerPage]);

  const fetchUsers = async () => {
    setLoading(true);
    
    // Configuramos la consulta contando el total real
    let query = supabase
      .from('historic_users')
      .select('*', { count: 'exact' });

    // Búsqueda del lado del servidor
    if (searchTerm) {
      query = query.or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,documento_identidad.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    // Paginación del lado del servidor
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      setUsers(data);
      if (count !== null) setTotalUsers(count);
    }
    setLoading(false);
  };

  // ==========================================
  // DESCARGAR EXCEL DE TODOS LOS HISTÓRICOS
  // ==========================================
  const handleDownloadAll = async () => {
    showToast('Preparando Archivo', 'Recopilando la base de datos completa. Por favor espera...', 'info');
    try {
      const { data, error } = await supabase.from('historic_users').select('*');
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return showToast('Base Vacía', 'No hay registros en el histórico para descargar.', 'error');
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Histórico Completo");
      XLSX.writeFile(wb, `ACOFI_Historico_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      showToast('Éxito', 'El archivo Excel ha sido descargado.', 'success');
    } catch (error: any) {
      showToast('Error de Descarga', 'No se pudo generar el archivo Excel.', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          showToast('Archivo Vacío', 'El archivo Excel no tiene registros.', 'error');
          setUploading(false);
          return;
        }

        const mappedUsers: HistoricUser[] = data.map(row => {
          const rawDoc = String(row['Documento de identidad'] || row['Documento'] || '').replace(/\.0$/, '').trim();
          const rawTel = String(row['Teléfono'] || '').replace(/\.0$/, '').trim();
          
          return {
            email: row['Correo Electronico'] ? String(row['Correo Electronico']).trim().toLowerCase() : '',
            documento_identidad: rawDoc,
            nombre: row['Nombre'] ? String(row['Nombre']).trim() : '',
            apellido: row['Apellido'] ? String(row['Apellido']).trim() : '',
            genero: row['Género'] ? String(row['Género']).trim() : '',
            direccion: row['Dirección'] ? String(row['Dirección']).trim() : '',
            telefono: rawTel,
            institucion: row['Institución'] ? String(row['Institución']).trim() : '',
            cargo: row['Cargo'] ? String(row['Cargo']).trim() : '',
            ciudad: row['Ciudad'] ? String(row['Ciudad']).trim() : '',
            pais: row['País'] ? String(row['País']).trim() : '',
          };
        }).filter(u => u.documento_identidad);

        if (mappedUsers.length === 0) {
          showToast('Sin Documentos', 'No se encontraron registros válidos con Documento de Identidad.', 'error');
          setUploading(false);
          return;
        }

        const uniqueUsersMap = new Map<string, HistoricUser>();
        mappedUsers.forEach(user => {
          uniqueUsersMap.set(user.documento_identidad, user);
        });
        const finalUsers = Array.from(uniqueUsersMap.values());

        const chunkSize = 100;
        for (let i = 0; i < finalUsers.length; i += chunkSize) {
          const chunk = finalUsers.slice(i, i + chunkSize);
          
          const { error } = await supabase
            .from('historic_users')
            .upsert(chunk, { onConflict: 'documento_identidad' });
          
          if (error) {
            console.error("Error detallado en base de datos:", error);
            throw new Error(`Error en base de datos: ${error.message}`);
          }
          
          setUploadProgress(Math.round(((i + chunk.length) / finalUsers.length) * 100));
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        showToast('Carga Exitosa', 'El histórico ha sido actualizado correctamente.', 'success');
        await fetchUsers();
      } catch (error: any) {
        console.error("Error procesando Excel:", error);
        showToast('Error de Procesamiento', `Hubo un error procesando el archivo: ${error.message || 'Error desconocido'}`, 'error');
      } finally {
        setUploading(false);
        setUploadProgress(0);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const { error } = await supabase
      .from('historic_users')
      .update(editingUser)
      .eq('documento_identidad', editingUser.documento_identidad);

    if (!error) {
      showToast('Usuario Actualizado', 'El perfil fue modificado con éxito.', 'success');
      await fetchUsers(); 
      setEditingUser(null);
    } else {
      showToast('Error de Actualización', 'Hubo un problema al actualizar el usuario.', 'error');
    }
  };

  const handleDeleteClick = (documento_identidad: string) => {
    setConfirmModal({ isOpen: true, id: documento_identidad, type: 'single' });
  };

  const handleDeleteAllClick = () => {
    setConfirmModal({ isOpen: true, type: 'deleteAll' });
  };

  const confirmAction = async () => {
    if (!confirmModal) return;

    if (confirmModal.type === 'single') {
      try {
        const { error } = await supabase
          .from('historic_users')
          .delete()
          .eq('documento_identidad', confirmModal.id);

        if (error) throw error;
        showToast('Usuario Eliminado', 'El registro fue borrado de la base histórica.', 'success');
        await fetchUsers();
      } catch (error) {
        showToast('Error al Eliminar', 'Hubo un error al intentar eliminar el usuario.', 'error');
      }
    } else if (confirmModal.type === 'deleteAll') {
      try {
        const { error } = await supabase
          .from('historic_users')
          .delete()
          .neq('documento_identidad', 'vacío-inexistente'); 

        if (error) throw error;
        showToast('Base Vaciada', 'Todos los registros históricos han sido eliminados permanentemente.', 'success');
        setCurrentPage(1);
        await fetchUsers();
      } catch (error) {
        showToast('Error', 'No se pudo vaciar la base de datos.', 'error');
      }
    }
    
    setConfirmModal(null);
  };

  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  return (
    <div className="space-y-8 relative pb-20">
      
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

      {/* MODAL 4D DE CONFIRMACIÓN (Dual: Eliminar 1 o Vaciar Todo) */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              <h2 className="text-2xl font-bold text-white mb-3">
                {confirmModal.type === 'deleteAll' ? t.modalEmptyTitle : t.modalDeleteTitle}
              </h2>
              <p className="text-gray-300 mb-8">
                {confirmModal.type === 'deleteAll' ? t.modalEmptyDesc : t.modalDeleteDesc}
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmModal(null)} className="px-5 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 transition-colors font-medium cursor-pointer">{t.btnCancel}</button>
                <button 
                  onClick={confirmAction} 
                  className="px-5 py-2.5 rounded-lg text-white font-bold bg-red-500 hover:bg-red-600 transition-transform active:scale-95 shadow-4d-static cursor-pointer"
                >
                  {confirmModal.type === 'deleteAll' ? t.btnConfirmEmpty : t.btnConfirmDelete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.pageTitle}</h1>
          <p className="text-gray-400">{t.pageSubtitle}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative">
          
          <button 
            onClick={() => setShowSettingsPanel(!showSettingsPanel)} 
            className="p-3 bg-surface border border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer shadow-sm"
            title="Configuración de Idioma"
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

          <button 
            onClick={handleDownloadAll}
            className="bg-surface border border-white/10 text-white font-bold py-3 px-4 rounded-lg flex items-center gap-2 hover:bg-white/5 transition-colors cursor-pointer"
            title="Descargar toda la base en Excel"
          >
            <Download className="h-5 w-5 text-accent" /> {t.btnDownload}
          </button>
          
          <button 
            onClick={handleDeleteAllClick}
            className="bg-red-500/10 text-red-500 font-bold py-3 px-4 rounded-lg flex items-center gap-2 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
            title="Borrar todos los registros"
          >
            <Trash className="h-5 w-5" /> {t.btnDeleteAll}
          </button>

          <div className="relative">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload} 
              className="hidden" 
              id="excel-upload"
              disabled={uploading}
            />
            <label 
              htmlFor="excel-upload"
              className={`bg-primary text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-transform shadow-4d-static ${uploading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-primary/90 active:translate-y-1 active:shadow-none'}`}
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
              {uploading ? `Procesando... ${uploadProgress}%` : t.btnUpload}
            </label>
          </div>
        </div>
      </header>

      {/* Controles de búsqueda y filtros por página */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-surface border border-white/5 p-4 rounded-xl">
        <div className="flex items-center gap-4 w-full md:w-2/3">
          <Search className="text-gray-400 h-5 w-5 ml-2" />
          <input 
            type="text" 
            placeholder={t.searchPlaceholder} 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Resetea a la página 1 al buscar
            }}
            className="bg-transparent border-none text-white w-full focus:outline-none focus:ring-0 placeholder-gray-600"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 w-full md:w-auto justify-end">
          <span>{t.showText}</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-black/50 border border-gray-700 text-white rounded-lg p-2 focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value={20}>20 {t.records}</option>
            <option value={50}>50 {t.records}</option>
            <option value={100}>100 {t.records}</option>
          </select>
        </div>
      </div>

      <div className="bg-surface border border-white/5 rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          {/* Diseño de tabla ajustado para evitar saltos de línea extraños */}
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-black/50 text-xs uppercase text-gray-500 whitespace-nowrap">
              <tr>
                <th className="px-6 py-4 font-medium w-32">{t.colDoc}</th>
                <th className="px-6 py-4 font-medium w-64">{t.colPart}</th>
                <th className="px-6 py-4 font-medium w-56">{t.colCont}</th>
                <th className="px-6 py-4 font-medium max-w-xs">{t.colInst}</th>
                <th className="px-6 py-4 font-medium w-48">{t.colLoc}</th>
                <th className="px-6 py-4 font-medium text-right sticky right-0 bg-black/50 z-10 w-28">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No se encontraron registros en esta página.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    key={user.documento_identidad} 
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-accent whitespace-nowrap">{user.documento_identidad}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-white truncate max-w-62.5" title={`${user.nombre} ${user.apellido}`}>
                        {user.nombre} {user.apellido}
                      </div>
                      <div className="text-xs text-gray-500">{user.genero || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300 truncate max-w-50" title={user.email}>{user.email || '-'}</div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">{user.telefono || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="truncate max-w-50" title={user.institucion}>{user.institucion || '-'}</div>
                      <div className="text-xs text-gray-500 truncate max-w-50" title={user.cargo}>{user.cargo || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="truncate max-w-37.5">{user.ciudad ? `${user.ciudad}, ${user.pais}` : '-'}</div>
                    </td>
                    {/* Botones fijados a la derecha */}
                    <td className="px-6 py-4 text-right sticky right-0 bg-surface z-10 border-l border-white/5 whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingUser(user)}
                          className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(user.documento_identidad)}
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="border-t border-white/5 p-4 flex items-center justify-between bg-black/30">
          <p className="text-sm text-gray-400">
            {t.showing} <span className="font-medium text-white">{users.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> {t.to} <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, totalUsers)}</span> {t.of} <span className="font-medium text-white">{totalUsers}</span> {t.results}
          </p>
          <div className="flex gap-1.5">
            {/* Botón Principio (Punto 6) */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || loading}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white cursor-pointer"
              title="Ir a la primera página"
            >
              <ChevronFirst className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            {/* Botón Final (Punto 6) */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages || loading}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white cursor-pointer"
              title="Ir a la última página"
            >
              <ChevronLast className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Edición */}
      <AnimatePresence>
        {editingUser && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface border border-white/10 rounded-2xl p-8 w-full max-w-3xl shadow-2xl my-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Editar Perfil del Usuario</h3>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-lg cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Nombre</label>
                    <input type="text" value={editingUser.nombre} onChange={e => setEditingUser({...editingUser, nombre: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Apellido</label>
                    <input type="text" value={editingUser.apellido} onChange={e => setEditingUser({...editingUser, apellido: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Documento de Identidad (Llave Única)</label>
                    <input type="text" value={editingUser.documento_identidad} disabled className="w-full bg-black/30 border border-gray-800 rounded-lg py-2.5 px-3 text-gray-500 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Correo Electrónico</label>
                    <input type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Género</label>
                    <input type="text" value={editingUser.genero} onChange={e => setEditingUser({...editingUser, genero: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Teléfono</label>
                    <input type="text" value={editingUser.telefono} onChange={e => setEditingUser({...editingUser, telefono: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Dirección</label>
                  <input type="text" value={editingUser.direccion} onChange={e => setEditingUser({...editingUser, direccion: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Institución</label>
                    <input type="text" value={editingUser.institucion} onChange={e => setEditingUser({...editingUser, institucion: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Cargo</label>
                    <input type="text" value={editingUser.cargo} onChange={e => setEditingUser({...editingUser, cargo: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Ciudad</label>
                    <input type="text" value={editingUser.ciudad} onChange={e => setEditingUser({...editingUser, ciudad: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">País</label>
                    <input type="text" value={editingUser.pais} onChange={e => setEditingUser({...editingUser, pais: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:border-accent outline-none" />
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-accent text-black font-bold py-4 rounded-lg shadow-4d-static transition-transform active:translate-y-1 active:shadow-none hover:bg-accent/90 text-lg tracking-wide cursor-pointer">
                    Guardar Todos Los Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}