"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Copy, 
  LayoutTemplate, 
  Download, 
  Users, 
  Loader2, 
  PauseCircle, 
  PlayCircle, 
  Trash2, 
  Search, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  CheckCircle2, 
  UploadCloud,
  List,
  MonitorPlay,
  X,
  AlertCircle,
  Info,
  Settings,
  Pencil,
  Save,
  Globe,
  SlidersHorizontal,
  ExternalLink,
  Mail,
  Maximize,
  Minimize
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import * as XLSX from 'xlsx';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../../context/LanguageContext';

// ==========================================
// TRADUCCIONES PARA LA INTERFAZ UNIVERSAL
// ==========================================
const systemTranslations: Record<string, Record<string, string>> = {
  es: {
    panelTitle: "Panel de Distribución y Gestión de Inscritos",
    tabList: "Listado de Inscritos",
    tabAnalytics: "Estadísticas (Analytics)",
    btnCheckin: "Check-in Automático",
    btnPause: "Pausar Evento",
    btnActivate: "Activar Evento",
    btnArchive: "Al Historial",
    btnExport: "Exportar",
    btnImport: "Subir Datos",
    btnGafetes: "Gafetes",
    btnEditEvent: "Editar Evento",
    searchPlaceholder: "Buscar por cédula, nombre o dato...",
    tableActions: "Acciones",
    tableDate: "Fecha",
    bulkBarSelected: "seleccionados",
    bulkBtnEdit: "Editar Varios",
    bulkBtnDelete: "Eliminar Varios",
    totalCapacity: "Aforo Total",
    fullLabel: "Lleno",
    topInst: "Top 5 Instituciones",
    topRoles: "Distribución de Cargos",
    topCities: "Ciudades Principales",
    langSystem: "Idioma de Sistema"
  },
  en: {
    panelTitle: "Distribution and Attendee Management Panel",
    tabList: "Attendee List",
    tabAnalytics: "Analytics & Statistics",
    btnCheckin: "Auto Check-in",
    btnPause: "Pause Event",
    btnActivate: "Activate Event",
    btnArchive: "To History",
    btnExport: "Export",
    btnImport: "Upload Data",
    btnGafetes: "Badges",
    btnEditEvent: "Edit Event",
    searchPlaceholder: "Search by ID, name or any field...",
    tableActions: "Actions",
    tableDate: "Date",
    bulkBarSelected: "selected",
    bulkBtnEdit: "Bulk Edit",
    bulkBtnDelete: "Bulk Delete",
    totalCapacity: "Total Capacity",
    fullLabel: "Full",
    topInst: "Top 5 Institutions",
    topRoles: "Role Distribution",
    topCities: "Top Cities",
    langSystem: "System Language"
  }
};

export default function EventoDetalleAdmin() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const { language: systemLang, setLanguage: setSystemLanguage } = useLanguage();
  const t = systemTranslations[systemLang];

  const [isMounted, setIsMounted] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'lista' | 'analitica'>('lista');
  
  // ESTADO NUEVO: PANTALLA COMPLETA PARA TABLA
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  
  const excelUploadRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // ESTADOS NUEVOS Y SELECCIÓN MASIVA
  // ==========================================
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditTargetField, setBulkEditTargetField] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // ==========================================
  // ESTADOS PARA MAPEADOR DE EXCEL
  // ==========================================
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRawRows, setExcelRawRows] = useState<any[]>([]);
  const [columnMapping, setMappingSelection] = useState<Record<string, string>>({});

  // ==========================================
  // ESTADOS PARA EXPORTACIÓN INTELIGENTE
  // ==========================================
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // ==========================================
  // ESTADOS PARA EDICIÓN Y ELIMINACIÓN INDIVIDUAL
  // ==========================================
  const [editingParticipant, setEditingParticipant] = useState<any | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<any | null>(null);
  
  // ESTADO PARA REENVÍO DE CORREO
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  // ==========================================
  // SISTEMA NATIVO DE NOTIFICACIONES Y MODALES
  // ==========================================
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'error' | 'info' | 'success' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'archive' } | null>(null);

  const showToast = (title: string, desc: string, type: 'error' | 'info' | 'success' = 'info') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    setIsMounted(true);
    if (!eventId) return;
    setBaseUrl(window.location.origin);
    loadEventData();
  }, [eventId]);

  async function loadEventData() {
    try {
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
        
      setEvent(eventData);
      
      const { data: fieldsData } = await supabase
        .from('event_fields')
        .select('*')
        .eq('event_id', eventId)
        .order('order_index', { ascending: true });
        
      if (fieldsData) setFields(fieldsData);
      
      // === INICIO DE DESCARGA PAGINADA (Bypass límite de 1000) ===
      let allRegistrations: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: regsBatch, error: regsError } = await supabase
          .from('registrations')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false })
          .range(from, from + step - 1);

        if (regsError) throw regsError;

        if (regsBatch && regsBatch.length > 0) {
          allRegistrations = [...allRegistrations, ...regsBatch];
          from += step;
          if (regsBatch.length < step) {
            hasMore = false; 
          }
        } else {
          hasMore = false;
        }
      }
      
      setRegistrations(allRegistrations);
      // === FIN DE DESCARGA PAGINADA ===
      
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleEditFieldChange = (fieldId: string, value: string) => {
    if (!editingParticipant) return;
    setEditingParticipant({
      ...editingParticipant,
      form_data: {
        ...editingParticipant.form_data,
        [fieldId]: value
      }
    });
  };

  const saveParticipantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    
    setIsActionLoading(true);
    try {
      let docFieldId = fields.find(f => f.field_name.toLowerCase().includes('documento') && !f.field_name.toLowerCase().includes('tipo'))?.id;
      let updatePayload: any = { form_data: editingParticipant.form_data };
      
      if (docFieldId && editingParticipant.form_data[docFieldId]) {
        updatePayload.historic_user_doc = editingParticipant.form_data[docFieldId];
      }

      const { error } = await supabase
        .from('registrations')
        .update(updatePayload)
        .eq('id', editingParticipant.id);

      if (error) throw error;

      setRegistrations(prev => prev.map(r => r.id === editingParticipant.id ? { ...r, ...updatePayload } : r));
      
      showToast('Actualizado', 'Los datos del participante fueron modificados correctamente.', 'success');
      setEditingParticipant(null);
    } catch (error: any) {
      showToast('Error', 'No se pudo guardar la modificación del participante.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const confirmDeleteParticipant = async () => {
    if (!deletingParticipant) return;
    
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', deletingParticipant.id);

      if (error) throw error;

      setRegistrations(prev => prev.filter(r => r.id !== deletingParticipant.id));
      setSelectedRegIds(prev => prev.filter(id => id !== deletingParticipant.id));
      showToast('Eliminado', 'El participante ha sido removido del evento.', 'success');
      setDeletingParticipant(null);
    } catch (error: any) {
      showToast('Error', 'No se pudo eliminar al participante.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ==========================================
  // FUNCIÓN PARA REENVIAR CORREO INDIVIDUAL
  // ==========================================
  const handleResendEmail = async (reg: any) => {
    if (!event.send_notifications) {
      return showToast('Alertas Desactivadas', 'Debes activar los correos automáticos en la configuración del evento primero.', 'info');
    }

    setSendingEmailId(reg.id);

    try {
      let nombre = '', apellido = '', email = '', institucion = '';

      fields.forEach((f: any) => {
        const val = reg.form_data[f.id] || '';
        if (!val) return;
        
        let sk = '';
        try { sk = JSON.parse(f.options || '{}').system_key || ''; } catch(e) {}
        const fn = (f.field_name || '').toLowerCase();

        if (sk === 'nombre' || fn.includes('nombre') || fn.includes('first name')) nombre = String(val);
        if (sk === 'apellido' || fn.includes('apellido') || fn.includes('last name')) apellido = String(val);
        if (sk === 'email' || fn.includes('correo') || fn.includes('email')) email = String(val);
        if (sk === 'institucion' || fn.includes('institución') || fn.includes('institucion') || fn.includes('company')) institucion = String(val);
      });

      if (!email) {
        throw new Error("El participante no tiene un correo electrónico registrado.");
      }

      const response = await fetch('/api/send-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          nombre: `${nombre} ${apellido}`.trim() || 'Participante',
          eventName: event.name,
          documento: reg.historic_user_doc,
          institucion: institucion || 'No especificada',
          creatorEmail: event.creator_email,
          emailSubject: event.email_subject,
          emailBody: event.email_body,
          lang: systemLang
        })
      });

      if (!response.ok) throw new Error("Fallo en la comunicación con Brevo.");

      showToast('Correo Enviado', `Se reenvió el código QR a ${email} exitosamente.`, 'success');
      
    } catch (error: any) {
      showToast('Error', error.message || 'No se pudo reenviar el correo. Verifica tu límite en Brevo.', 'error');
    } finally {
      setSendingEmailId(null);
    }
  };

  const executeBulkDelete = async () => {
    if (selectedRegIds.length === 0) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from('registrations').delete().in('id', selectedRegIds);
      if (error) throw error;
      setRegistrations(prev => prev.filter(r => !selectedRegIds.includes(r.id)));
      showToast('Eliminación Masiva', `Se eliminaron ${selectedRegIds.length} registros correctamente.`, 'success');
      setSelectedRegIds([]);
      setShowBulkDeleteModal(false);
    } catch {
      showToast('Error', 'No se pudieron eliminar los elementos seleccionados.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const executeBulkEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkEditTargetField || selectedRegIds.length === 0) return;
    setIsActionLoading(true);
    try {
      const updatedRegs = registrations.map(r => {
        if (selectedRegIds.includes(r.id)) {
          const nextFormData = { ...r.form_data, [bulkEditTargetField]: bulkEditValue };
          return { ...r, form_data: nextFormData };
        }
        return r;
      });

      const promises = selectedRegIds.map(id => {
        const targetReg = updatedRegs.find(r => r.id === id);
        return supabase.from('registrations').update({ form_data: targetReg.form_data }).eq('id', id);
      });

      await Promise.all(promises);
      setRegistrations(updatedRegs);
      showToast('Edición Masiva', 'Registros actualizados exitosamente.', 'success');
      setShowBulkEditModal(false);
      setBulkEditValue('');
      setBulkEditTargetField('');
    } catch {
      showToast('Error', 'Ocurrió un error en la actualización masiva.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleImportMasivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (data.length === 0) {
          setIsImporting(false);
          return showToast('Archivo Vacío', 'El Excel no contiene filas procesables.', 'error');
        }

        const headers = Object.keys(data[0]);
        setExcelHeaders(headers);
        setExcelRawRows(data);

        const exactMatch = fields.every(f => headers.includes(f.field_name));

        if (!exactMatch) {
          let initialMapping: Record<string, string> = {};
          fields.forEach(f => {
            const approximateMatch = headers.find(h => h.toLowerCase().trim() === f.field_name.toLowerCase().trim());
            if (approximateMatch) initialMapping[f.id] = approximateMatch;
          });
          setMappingSelection(initialMapping);
          setShowMappingModal(true);
        } else {
          let defaultMap: Record<string, string> = {};
          fields.forEach(f => { defaultMap[f.id] = f.field_name; });
          await proceedWithMappedImport(defaultMap, data);
        }
      } catch (error) {
        showToast('Error de Formato', 'Verifique que el archivo Excel sea válido.', 'error');
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const proceedWithMappedImport = async (mapping: Record<string, string>, rowsToProcess: any[]) => {
    setIsActionLoading(true);
    setShowMappingModal(false);
    let added = 0;

    try {
      const docField = fields.find(f => {
        let opts: any = {};
        try { opts = JSON.parse(f.options || '{}'); } catch(e){}
        return opts.system_key === 'documento_identidad' || (f.field_name.toLowerCase().includes('documento') && !f.field_name.toLowerCase().includes('tipo'));
      });

      if (!docField || !mapping[docField.id]) {
        setIsImporting(false);
        setIsActionLoading(false);
        return showToast('Mapeo Inválido', 'Debes relacionar la columna del documento de identidad de forma obligatoria.', 'error');
      }

      for (const row of rowsToProcess) {
        let doc = String(row[mapping[docField.id]] || '').trim();
        if (!doc || doc === 'undefined') continue;

        let form_data: Record<string, string> = {};
        let nombre = '', apellido = '', email = '', institucion = '', cargo = '', pais = '', ciudad = '', tel = '', gen = '', dir = '';

        fields.forEach((f: any) => {
          const excelKey = mapping[f.id];
          const val = excelKey ? row[excelKey] : '';
          form_data[f.id] = val ? String(val) : '';
          
          let parsedOpts: any = {};
          try { parsedOpts = JSON.parse(f.options || '{}'); } catch(err) {}
          const sk = parsedOpts.system_key || '';
          const fn = String(f.field_name).toLowerCase();

          if (sk === 'nombre') nombre = String(val);
          if (sk === 'apellido') apellido = String(val);
          if (!sk && fn.includes('nombre') && !fn.includes('apellido')) {
             const parts = String(val).split(' ');
             nombre = parts[0] || '';
             apellido = parts.slice(1).join(' ');
          }
          if (sk === 'email' || (fn.includes('correo') && !fn.includes('confirm'))) email = String(val);
          if (sk === 'institucion' || fn.includes('institución') || fn.includes('institucion')) institucion = String(val);
          if (sk === 'cargo' || fn.includes('cargo')) cargo = String(val);
          if (sk === 'pais' || fn.includes('país') || fn.includes('pais')) pais = String(val);
          if (sk === 'ciudad' || fn.includes('ciudad')) ciudad = String(val);
          if (sk === 'telefono' || fn.includes('teléfono') || fn.includes('telefono')) tel = String(val);
          if (sk === 'genero' || fn.includes('género') || fn.includes('genero')) gen = String(val);
          if (sk === 'direccion' || fn.includes('dirección') || fn.includes('direccion')) dir = String(val);
        });

        await supabase.from('historic_users').upsert({
          documento_identidad: doc, email, nombre: nombre || 'Registro Masivo', apellido, institucion, cargo, pais, ciudad, telefono: tel, genero: gen, direccion: dir
        }, { onConflict: 'documento_identidad' });

        const { error: regErr } = await supabase.from('registrations').insert([{ event_id: eventId, historic_user_doc: doc, form_data }]);
        if (!regErr) added++;
      }

      showToast('Importación Completada', `Se importaron ${added} asistentes exitosamente.`, 'success');
      loadEventData();
    } catch {
      showToast('Error', 'Fallo técnico inyectando los datos del Excel.', 'error');
    } finally {
      setIsImporting(false);
      setIsActionLoading(false);
      if (excelUploadRef.current) excelUploadRef.current.value = '';
    }
  };

  const openExportModal = () => {
    if (registrations.length === 0) return showToast('Reporte Vacío', 'No hay registros para exportar.', 'info');
    const allColIds = ['fecha', ...fields.map(f => f.id)];
    setSelectedColumns(allColIds);
    setShowExportModal(true);
  };

  const toggleColumn = (colId: string) => {
    setSelectedColumns(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(['fecha', ...fields.map(f => f.id)]);
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const confirmExport = () => {
    if (selectedColumns.length === 0) {
      return showToast('Selección Requerida', 'Debes seleccionar al menos una columna para descargar el archivo.', 'error');
    }

    const excelData = registrations.map((reg: any) => {
      const row: any = {};
      
      fields.forEach((f: any) => { 
        if (selectedColumns.includes(f.id)) {
          row[f.field_name] = reg.form_data[f.id] || '-'; 
        }
      });

      if (selectedColumns.includes('fecha')) {
        row['Fecha de Registro'] = new Date(reg.created_at).toLocaleString();
      }

      return row;
    });
    
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inscritos");
    XLSX.writeFile(wb, `${event.name.replace(/\s+/g, '_')}_Inscritos.xlsx`);
    
    setShowExportModal(false);
    showToast('Descarga Exitosa', 'El reporte Excel ha sido generado y descargado.', 'success');
  };

  const filteredRegistrations = useMemo(() => {
    if (!searchTerm) return registrations;
    return registrations.filter((reg: any) => {
      return Object.values(reg.form_data).some((val: any) => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [registrations, searchTerm]);

  // CÁLCULO DE PÁGINAS DINÁMICO
  const totalPages = Math.ceil(filteredRegistrations.length / (isFullScreen ? 25 : itemsPerPage));
  const currentItems = filteredRegistrations.slice(
    (currentPage - 1) * (isFullScreen ? 25 : itemsPerPage), 
    currentPage * (isFullScreen ? 25 : itemsPerPage)
  );

  const togglePauseEvent = async () => {
    const newState = !event.is_active;
    const { error } = await supabase
      .from('events')
      .update({ is_active: newState })
      .eq('id', event.id);
      
    if (!error) {
      setEvent({ ...event, is_active: newState });
      showToast('Estado Actualizado', `El evento ahora está ${newState ? 'Activo' : 'Pausado'}.`, 'success');
    }
  };

  const confirmArchiveEvent = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('events').update({ is_deleted: true }).eq('id', event.id);
      if (error) throw error;
      router.push('/admin/dashboard');
    } catch (error: any) {
      showToast('Error al Archivar', error.message || 'Ha ocurrido un problema al mover el evento a la papelera.', 'error');
      setLoading(false);
    } finally {
      setConfirmModal(null);
    }
  };

  const copyToClipboard = (text: string, type: 'link' | 'iframe') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') { 
      setCopiedLink(true); 
      setTimeout(() => setCopiedLink(false), 2000); 
    }
    if (type === 'iframe') { 
      setCopiedIframe(true); 
      setTimeout(() => setCopiedIframe(false), 2000); 
    }
  };

  const getTopStats = (keyword: string) => {
    const field = fields.find((f: any) => f.field_name?.toLowerCase().includes(keyword));
    if (!field || registrations.length === 0) return [];
    
    const counts: Record<string, number> = {};
    registrations.forEach((r: any) => {
      const val = r.form_data[field.id];
      if (val && val !== 'Otra' && !val.startsWith('http')) {
        counts[val] = (counts[val] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5);
  };
  
  if (loading && !confirmModal) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event || event.is_deleted) {
    return (
      <div className="p-10 text-white flex justify-center mt-10">
        Este evento está en el Historial o no existe.
      </div>
    );
  }

  const publicUrl = `${baseUrl}/e/${event.slug || event.id}`;
  const iframeCode = `<iframe src="${publicUrl}" width="100%" height="800" frameborder="0" style="border-radius: 12px; overflow: hidden; max-width: 800px; margin: auto; display: block;"></iframe>`;
  
  const topRoles = getTopStats('cargo');
  const topInstitutions = getTopStats('instituci');
  const topCities = getTopStats('ciudad');

  // ==========================================
  // COMPONENTE DE LA TABLA REUTILIZABLE
  // ==========================================
  const renderTablePanel = () => (
    <div className="flex flex-col h-full w-full relative">
      <div className="p-6 border-b border-white/5 space-y-4 shrink-0">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">{t.tabList}</h2>
            <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap">
              {filteredRegistrations.length} {event.max_capacity && `/ ${event.max_capacity}`}
            </span>
            <button 
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="ml-2 p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer border border-white/5 hover:border-white/10"
              title={isFullScreen ? "Contraer vista" : "Expandir a pantalla completa"}
            >
              {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              ref={excelUploadRef} 
              onChange={handleImportMasivo} 
            />
            <button 
              onClick={() => excelUploadRef.current?.click()} 
              disabled={isImporting} 
              className="bg-gray-800 text-white hover:bg-gray-700 font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-transform active:translate-y-1 text-xs border border-transparent disabled:opacity-50 cursor-pointer"
            >
              {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <UploadCloud className="h-3.5 w-3.5" />} 
              {t.btnImport}
            </button>

            <Link href={`/admin/eventos/${event.id}/gafetes`}>
              <button className="bg-white text-black hover:bg-gray-200 font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-transform active:translate-y-1 text-xs border border-transparent cursor-pointer">
                <Printer className="h-3.5 w-3.5" /> 
                {t.btnGafetes}
              </button>
            </Link>

            <Link href={`/admin/eventos/${eventId}/editar`}>
                <button className="bg-surface border border-white/10 hover:bg-white/5 hover:border-white/20 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer text-xs">
                    <Settings className="h-3.5 w-3.5 text-gray-400" /> {t.btnEditEvent}
                </button>
            </Link>
            
            <button 
              onClick={openExportModal} 
              className="bg-accent hover:bg-accent/90 text-black font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 shadow-4d-static transition-transform active:translate-y-1 active:shadow-none text-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> 
              {t.btnExport}
            </button>
          </div>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input 
            type="text" 
            placeholder={t.searchPlaceholder} 
            value={searchTerm} 
            onChange={(e) => { 
              setSearchTerm(e.target.value); 
              setCurrentPage(1); 
            }} 
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary" 
          />
        </div>
      </div>
      
      <div className="overflow-x-auto overflow-y-auto flex-1 p-2 relative custom-scrollbar">
        {currentItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 min-h-75">
            <Users className="h-12 w-12 mb-3 opacity-20" />
            <p>{searchTerm ? 'No hay resultados.' : 'Aún no hay inscritos.'}</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-black/30 text-xs uppercase text-gray-500 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                {/* SELECCIÓN MASIVA EN ENCABEZADO */}
                <th className="px-4 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={currentItems.length > 0 && currentItems.every((item: any) => selectedRegIds.includes(item.id))}
                    onChange={(e) => {
                      const pageIds = currentItems.map((i: any) => i.id);
                      if (e.target.checked) {
                        setSelectedRegIds(prev => Array.from(new Set([...prev, ...pageIds])));
                      } else {
                        setSelectedRegIds(prev => prev.filter(id => !pageIds.includes(id)));
                      }
                    }}
                    className="w-4 h-4 rounded appearance-none border-2 border-gray-600 checked:bg-primary flex items-center justify-center after:content-['✓'] after:text-white after:font-bold after:opacity-0 checked:after:opacity-100 after:text-[10px] cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 font-medium w-24 text-center whitespace-nowrap">{t.tableActions}</th>
                <th className="px-6 py-4 font-medium w-32 whitespace-nowrap">{t.tableDate}</th>
                {fields.map((f: any) => (
                  <th key={f.id} className="px-6 py-4 font-medium whitespace-nowrap min-w-50">
                    {f.field_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentItems.map((reg: any) => (
                <tr key={reg.id} className="hover:bg-white/5 transition-colors group">
                  {/* SELECCIÓN INDIVIDUAL (CHECKBOX) */}
                  <td className="px-4 py-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedRegIds.includes(reg.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRegIds(prev => [...prev, reg.id]);
                        } else {
                          setSelectedRegIds(prev => prev.filter(id => id !== reg.id));
                        }
                      }}
                      className="w-4 h-4 rounded appearance-none border-2 border-gray-600 checked:bg-primary flex items-center justify-center after:content-['✓'] after:text-white after:font-bold after:opacity-0 checked:after:opacity-100 after:text-[10px] cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleResendEmail(reg)}
                        disabled={sendingEmailId === reg.id}
                        className="p-1.5 bg-accent/10 text-accent hover:bg-accent/20 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        title="Reenviar Correo"
                      >
                        {sendingEmailId === reg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      </button>
                      <button 
                        onClick={() => setEditingParticipant(reg)}
                        className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors cursor-pointer"
                        title="Editar Participante"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setDeletingParticipant(reg)}
                        className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors cursor-pointer"
                        title="Eliminar Participante"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(reg.created_at).toLocaleDateString()}
                  </td>
                  {/* DIBUJADO DE LAS RESPUESTAS (INCLUYE ARCHIVOS) */}
                  {fields.map((f: any) => {
                    const val = reg.form_data[f.id];
                    const isFileUrl = typeof val === 'string' && val.startsWith('http');
                    
                    return (
                      <td 
                        key={f.id} 
                        className="px-6 py-4 min-w-50" 
                      >
                        {isFileUrl ? (
                          <a 
                            href={val} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                          >
                            <ExternalLink className="h-3.5 w-3.5"/> Ver Documento
                          </a>
                        ) : (
                          <div className="whitespace-normal wrap-break-word">
                            {val || '-'}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* FLOATING ACTION BAR PARA EDICIÓN MASIVA */}
      <AnimatePresence>
        {selectedRegIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface/90 border border-primary/40 p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-5 z-50"
          >
            <span className="text-xs font-bold text-white shrink-0">
              <span className="text-primary text-sm font-black">{selectedRegIds.length}</span> {t.bulkBarSelected}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setShowBulkEditModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-primary/20 text-primary hover:bg-primary hover:text-white rounded-lg font-bold text-xs transition-colors border border-primary/30 cursor-pointer">
                {t.bulkBtnEdit}
              </button>
              <button onClick={() => setShowBulkDeleteModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg font-bold text-xs transition-colors border border-red-500/30 cursor-pointer">
                {t.bulkBtnDelete}
              </button>
              <button onClick={() => setSelectedRegIds([])} className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4"/>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {totalPages > 1 && (
        <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-400 shrink-0">
          <span>Página {currentPage} de {totalPages}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1} 
              className="p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4"/>
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages} 
              className="p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4"/>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 relative">

      {/* TOASTS CONTENEDOR */}
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

      {/* POP-UP MAPEA EXCEL EXPLICITO */}
      <AnimatePresence>
        {showMappingModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-10000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-surface border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-accent"/> Relacionar Columnas del Excel</h2>
                <button onClick={() => { setShowMappingModal(false); setIsImporting(false); }} className="text-gray-500 hover:text-white cursor-pointer"><X className="h-6 w-6"/></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3 text-yellow-500 text-xs leading-relaxed">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>Detectamos discrepancias entre las columnas de tu archivo Excel y las preguntas activas del formulario. Por favor, asocia cada campo de la base de datos con la columna correcta de tu archivo.</p>
                </div>
                <div className="space-y-3.5">
                  {fields.map(f => (
                    <div key={f.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center p-3 bg-black/20 border border-white/5 rounded-xl">
                      <span className="text-sm text-gray-200 font-bold truncate">{f.field_name} {f.is_required && <span className="text-accent">*</span>}</span>
                      <select 
                        value={columnMapping[f.id] || ''} 
                        onChange={(e) => setMappingSelection(prev => ({ ...prev, [f.id]: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 text-xs text-white rounded-lg p-2.5 focus:border-accent cursor-pointer"
                      >
                        <option value="">-- No importar este campo --</option>
                        {excelHeaders.map(h => (<option key={h} value={h}>{h}</option>))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t border-white/5 bg-surface">
                <button onClick={() => proceedWithMappedImport(columnMapping, excelRawRows)} className="w-full bg-accent hover:bg-accent/90 text-black font-bold py-3.5 rounded-xl shadow-4d-static flex justify-center items-center gap-2 cursor-pointer">Procesar Importación</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POP-UP: BULK EDIT DE SELECCIONADOS */}
      <AnimatePresence>
        {showBulkEditModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-10000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-surface border border-white/10 rounded-3xl w-full max-w-md shadow-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Pencil className="h-5 w-5 text-primary"/> Modificación Masiva</h3>
                <button onClick={() => setShowBulkEditModal(false)} className="text-gray-500 hover:text-white cursor-pointer"><X className="h-5 w-5"/></button>
              </div>
              <form onSubmit={executeBulkEdit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Selecciona el Campo a Modificar</label>
                  <select 
                    required 
                    value={bulkEditTargetField} 
                    onChange={e => setBulkEditTargetField(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-primary cursor-pointer"
                  >
                    <option value="">Selecciona...</option>
                    {fields.filter(f => {
                      const fn = f.field_name.toLowerCase();
                      return !fn.includes('documento') && !fn.includes('tipo');
                    }).map(f => (<option key={f.id} value={f.id}>{f.field_name}</option>))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Nuevo Valor Común</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Completa el valor que tendrán todos..." 
                    value={bulkEditValue} 
                    onChange={e => setBulkEditValue(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-primary"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowBulkEditModal(false)} className="px-5 py-2.5 text-gray-300 hover:bg-white/5 rounded-lg text-sm font-medium cursor-pointer">Cancelar</button>
                  <button type="submit" className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg text-sm shadow-4d-static flex items-center gap-2 cursor-pointer"><Save className="h-4 w-4"/> Aplicar a {selectedRegIds.length}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POP-UP: BULK DELETE MODAL */}
      <AnimatePresence>
        {showBulkDeleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-10000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              <h2 className="text-2xl font-bold text-white mb-3">Eliminación Masiva</h2>
              <p className="text-gray-300 mb-8 text-sm">¿Estás completamente seguro de eliminar los {selectedRegIds.length} participantes seleccionados del evento al mismo tiempo? Esta acción destruirá los registros de forma definitiva.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowBulkDeleteModal(false)} className="px-5 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 font-medium text-sm cursor-pointer">Cancelar</button>
                <button onClick={executeBulkDelete} className="px-5 py-2.5 rounded-lg text-white font-bold bg-red-500 hover:bg-red-600 shadow-4d-static text-sm flex items-center gap-2 cursor-pointer"><Trash2 className="h-4 w-4"/> Confirmar Destrucción</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL EDITAR PARTICIPANTE INDIVIDUAL */}
      <AnimatePresence>
        {editingParticipant && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-10000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-surface border border-white/10 rounded-3xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface sticky top-0 z-10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-primary"/> Editar Participante
                </h2>
                <button 
                  onClick={() => setEditingParticipant(null)} 
                  className="text-gray-500 hover:text-white p-1 transition-colors rounded-full hover:bg-white/5 cursor-pointer"
                >
                  <X className="h-6 w-6"/>
                </button>
              </div>
              
              <form onSubmit={saveParticipantEdit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                  {fields.map((f: any) => (
                    <div key={f.id} className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{f.field_name}</label>
                      {['select', 'radio'].includes(f.field_type) ? (
                        <select 
                          value={editingParticipant.form_data[f.id] || ''} 
                          onChange={(e) => handleEditFieldChange(f.id, e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="">Seleccionar...</option>
                          {f.options && JSON.parse(f.options).choices?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          <option value="Otra">Otra</option>
                        </select>
                      ) : f.field_type === 'textarea' ? (
                        <textarea 
                          value={editingParticipant.form_data[f.id] || ''} 
                          onChange={(e) => handleEditFieldChange(f.id, e.target.value)}
                          rows={3}
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary resize-none"
                        />
                      ) : (
                        <div>
                          <input 
                            type="text" 
                            value={editingParticipant.form_data[f.id] || ''} 
                            onChange={(e) => handleEditFieldChange(f.id, e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary"
                          />
                          {/* DETECCIÓN VISUAL DE URL (ARCHIVOS) EN MODO EDICIÓN */}
                          {editingParticipant.form_data[f.id]?.startsWith('http') && (
                            <a 
                              href={editingParticipant.form_data[f.id]} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs text-blue-400 hover:underline mt-1.5 flex items-center gap-1 w-max"
                            >
                              <ExternalLink className="h-3 w-3" /> Ver archivo actual adjunto
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-6 border-t border-white/5 bg-surface flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setEditingParticipant(null)} 
                    disabled={isActionLoading}
                    className="px-6 py-3 rounded-xl text-gray-300 hover:bg-white/5 transition-colors font-medium disabled:opacity-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isActionLoading}
                    className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl shadow-4d-static active:translate-y-1 active:shadow-none transition-transform flex justify-center items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isActionLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5"/>} 
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL ELIMINAR PARTICIPANTE INDIVIDUAL */}
      <AnimatePresence>
        {deletingParticipant && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-10000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              <h2 className="text-2xl font-bold text-white mb-3">Eliminar Participante</h2>
              <p className="text-gray-300 mb-8 text-sm">
                ¿Estás seguro de eliminar este registro? Esta acción borrará al participante del evento de forma permanente.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeletingParticipant(null)} disabled={isActionLoading} className="px-5 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 transition-colors font-medium disabled:opacity-50 cursor-pointer">Cancelar</button>
                <button 
                  onClick={confirmDeleteParticipant} 
                  disabled={isActionLoading}
                  className="px-5 py-2.5 rounded-lg text-white font-bold bg-red-500 hover:bg-red-600 transition-transform active:scale-95 shadow-4d-static flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>} 
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 4D DE CONFIRMACIÓN DE ARCHIVO */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-10000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              <h2 className="text-2xl font-bold text-white mb-3">Archivar Evento</h2>
              <p className="text-gray-300 mb-8">
                ¿Estás seguro de enviar "{event.name}" a la papelera? Esta acción desactivará los registros públicos.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmModal(null)} className="px-5 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 transition-colors font-medium cursor-pointer">Cancelar</button>
                <button 
                  onClick={confirmArchiveEvent} 
                  className="px-5 py-2.5 rounded-lg text-white font-bold bg-red-500 hover:bg-red-600 transition-transform active:scale-95 shadow-4d-static cursor-pointer"
                >
                  Confirmar Acción
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* MODAL EXPORTAR EXCEL INTELIGENTE */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 z-10000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} 
              className="bg-surface border border-white/10 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface sticky top-0 z-10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Download className="h-5 w-5 text-accent"/> Configurar Reporte
                </h2>
                <button 
                  onClick={() => setShowExportModal(false)} 
                  className="text-gray-500 hover:text-white p-1 transition-colors rounded-full hover:bg-white/5 cursor-pointer"
                >
                  <X className="h-6 w-6"/>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                <p className="text-sm text-gray-400 mb-2">Selecciona las columnas que deseas incluir en el archivo Excel:</p>
                
                <div className="flex gap-2 mb-4">
                  <button 
                    onClick={selectAllColumns} 
                    className="flex-1 text-xs bg-primary/20 text-primary py-2 rounded-lg hover:bg-primary hover:text-white font-bold transition-colors border border-primary/30 cursor-pointer"
                  >
                    Seleccionar Todas
                  </button>
                  <button 
                    onClick={deselectAllColumns} 
                    className="flex-1 text-xs bg-white/5 text-gray-400 py-2 rounded-lg hover:bg-white/10 hover:text-white font-bold transition-colors border border-white/10 cursor-pointer"
                  >
                    Desmarcar Todas
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-black/30 border border-white/5 rounded-xl cursor-pointer hover:border-accent/50 transition-colors">
                    <div className="flex items-center h-5">
                      <input 
                        type="checkbox" 
                        checked={selectedColumns.includes('fecha')} 
                        onChange={() => toggleColumn('fecha')} 
                        className="w-5 h-5 appearance-none rounded border-2 border-gray-500 checked:bg-accent checked:border-accent flex items-center justify-center transition-colors cursor-pointer after:content-['✓'] after:text-black after:font-bold after:opacity-0 checked:after:opacity-100 after:text-xs"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-200">Fecha de Registro</span>
                  </label>

                  {fields.map(f => (
                    <label key={f.id} className="flex items-center gap-3 p-3 bg-black/30 border border-white/5 rounded-xl cursor-pointer hover:border-accent/50 transition-colors">
                      <div className="flex items-center h-5">
                        <input 
                          type="checkbox" 
                          checked={selectedColumns.includes(f.id)} 
                          onChange={() => toggleColumn(f.id)} 
                          className="w-5 h-5 appearance-none rounded border-2 border-gray-500 checked:bg-accent checked:border-accent flex items-center justify-center transition-colors cursor-pointer after:content-['✓'] after:text-black after:font-bold after:opacity-0 checked:after:opacity-100 after:text-xs"
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-200">{f.field_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-white/5 bg-surface">
                <button 
                  onClick={confirmExport} 
                  className="w-full bg-accent hover:bg-accent/90 text-black font-bold py-3.5 rounded-xl shadow-4d-static active:translate-y-1 active:shadow-none transition-transform flex justify-center items-center gap-2 cursor-pointer"
                >
                  <Download className="h-5 w-5"/> Generar y Descargar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{event.name}</h1>
            {!event.is_active && (
              <span className="bg-yellow-500/20 text-yellow-500 text-xs font-bold px-3 py-1 rounded-full border border-yellow-500/20">
                PAUSADO
              </span>
            )}
          </div>
          <p className="text-gray-400">{t.panelTitle}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 relative">
          {/* SWITCH DE IDIOMA DEL PANEL DE CONTROL */}
          <button 
            onClick={() => setShowSettingsPanel(!showSettingsPanel)} 
            className="p-2.5 bg-surface border border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
            title="Configuración de Idioma"
          >
            <Globe className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {showSettingsPanel && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="absolute right-0 top-14 bg-surface border border-white/10 p-3 rounded-xl shadow-2xl z-50 flex flex-col gap-2 w-44">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-1">{t.langSystem}</p>
                <button onClick={() => { setSystemLanguage('es'); setShowSettingsPanel(false); }} className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${systemLang === 'es' ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/5'}`}>Español (ES)</button>
                <button onClick={() => { setSystemLanguage('en'); setShowSettingsPanel(false); }} className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${systemLang === 'en' ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/5'}`}>English (EN)</button>
              </motion.div>
            )}
          </AnimatePresence>

          <Link href={`/admin/eventos/${event.id}/auto-checkin`} target="_blank">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-primary text-white shadow-4d-static hover:bg-primary/90 transition-transform active:translate-y-1 active:shadow-none">
              <MonitorPlay className="h-4 w-4" /> 
              {t.btnCheckin}
            </button>
          </Link>

          <button 
            onClick={togglePauseEvent} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              event.is_active 
                ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' 
                : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
            }`}
          >
            {event.is_active ? (
              <>
                <PauseCircle className="h-4 w-4" /> {t.btnPause}
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" /> {t.btnActivate}
              </>
            )}
          </button>
          <button 
            onClick={() => setConfirmModal({ isOpen: true, type: 'archive' })} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all cursor-pointer"
          >
            <Trash2 className="h-4 w-4" /> {t.btnArchive}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface border border-white/5 p-8 rounded-2xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-linear-to-r from-primary to-accent"></div>
            <h2 className="text-lg font-bold text-white mb-6">Código QR Oficial</h2>
            
            <div className="p-4 bg-white rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.3)] border-4 border-primary/20 mb-6">
              <QRCodeSVG 
                value={publicUrl} 
                size={200} 
                level="H" 
                fgColor="#050505" 
                bgColor="#ffffff" 
                imageSettings={event.logo_url ? { src: event.logo_url, height: 45, width: 45, excavate: true } : undefined} 
              />
            </div>
            
            <div className="w-full flex bg-black/50 border border-gray-700 rounded-lg p-1.5 mt-2">
              <input 
                type="text" 
                readOnly 
                value={publicUrl} 
                className="bg-transparent text-gray-300 w-full px-2 outline-none text-xs" 
              />
              <button 
                onClick={() => copyToClipboard(publicUrl, 'link')} 
                className="bg-primary hover:bg-primary/80 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                {copiedLink ? 'Copiado' : 'Copiar URL'}
              </button>
            </div>
          </div>

          <div className="bg-surface border border-white/5 p-6 rounded-2xl relative">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-accent"/> 
              Embeber en Web
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Código iframe para integrar el formulario en tu web.
            </p>
            <button 
              onClick={() => copyToClipboard(iframeCode, 'iframe')} 
              className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded-xl flex justify-center items-center gap-2 transition-all font-bold text-sm cursor-pointer"
            >
              {copiedIframe ? (
                <CheckCircle2 className="h-4 w-4 text-green-400"/>
              ) : (
                <Copy className="h-4 w-4 text-gray-400"/>
              )}
              {copiedIframe ? '¡Iframe Copiado!' : 'Copiar Código Iframe'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8">
          
          <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-2">
            <button 
              onClick={() => setActiveTab('lista')} 
              className={`flex items-center gap-2 pb-2 font-bold transition-colors border-b-2 cursor-pointer ${
                activeTab === 'lista' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <List className="h-4 w-4" /> {t.tabList}
            </button>
            <button 
              onClick={() => setActiveTab('analitica')} 
              className={`flex items-center gap-2 pb-2 font-bold transition-colors border-b-2 cursor-pointer ${
                activeTab === 'analitica' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" /> {t.tabAnalytics}
            </button>
          </div>

          {activeTab === 'lista' ? (
            <>
              {isFullScreen && isMounted ? createPortal(
                <div className="fixed inset-0 z-999999 bg-black/95 backdrop-blur-md p-4 md:p-8 flex flex-col" onClick={() => setIsFullScreen(false)}>
                  <div 
                    className="bg-[#0a0a0a] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-3xl flex flex-col flex-1 overflow-hidden relative"
                    onClick={e => e.stopPropagation()}
                  >
                    {renderTablePanel()}
                  </div>
                </div>,
                document.body
              ) : (
                <div className="bg-surface border border-white/5 rounded-2xl flex flex-col h-full min-h-125 relative">
                  {renderTablePanel()}
                </div>
              )}
            </>
          ) : (
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-surface border border-white/5 p-6 rounded-2xl md:col-span-2 flex items-center justify-between">
                <div>
                  <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest">{t.totalCapacity}</h3>
                  <p className="text-4xl font-black text-white mt-1">
                    {registrations.length} <span className="text-lg text-gray-500 font-medium">inscritos</span>
                  </p>
                </div>
                {event.max_capacity && (
                  <div className="text-right">
                    <p className="text-sm text-accent font-bold mb-2">
                      {Math.round((registrations.length / event.max_capacity) * 100)}% {t.fullLabel}
                    </p>
                    <div className="w-48 bg-black/50 rounded-full h-3 overflow-hidden border border-white/10">
                      <div 
                        className="bg-accent h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min((registrations.length / event.max_capacity) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {topInstitutions.length > 0 && (
                <div className="bg-surface border border-white/5 p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary"/> {t.topInst}
                  </h3>
                  <div className="space-y-4">
                    {topInstitutions.map(([name, count]: any) => (
                      <div key={name}>
                        <div className="flex justify-between text-xs text-gray-300 mb-1">
                          <span className="truncate max-w-[80%] font-medium">{name}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                        <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${(count / registrations.length) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topRoles.length > 0 && (
                <div className="bg-surface border border-white/5 p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green-400"/> {t.topRoles}
                  </h3>
                  <div className="space-y-4">
                    {topRoles.map(([name, count]: any) => (
                      <div key={name}>
                        <div className="flex justify-between text-xs text-gray-300 mb-1">
                          <span className="truncate max-w-[80%] font-medium">{name}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                        <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${(count / registrations.length) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topCities.length > 0 && (
                <div className="bg-surface border border-white/5 p-6 rounded-2xl md:col-span-2">
                  <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-accent"/> {t.topCities}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {topCities.map(([name, count]: any) => (
                      <div key={name}>
                        <div className="flex justify-between text-xs text-gray-300 mb-1">
                          <span className="truncate max-w-[80%] font-medium">{name}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                        <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-accent h-2 rounded-full" 
                            style={{ width: `${(count / registrations.length) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
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