"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
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
  X
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import * as XLSX from 'xlsx';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventoDetalleAdmin() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'lista' | 'analitica'>('lista');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  
  const excelUploadRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // ESTADOS PARA EXPORTACIÓN INTELIGENTE (EXCEL)
  // ==========================================
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  useEffect(() => {
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
      
      const { data: regsData } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
        
      if (regsData) setRegistrations(regsData);
      
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // FUNCIONES DE EXPORTACIÓN INTELIGENTE
  // ==========================================
  const openExportModal = () => {
    if (registrations.length === 0) return alert("No hay registros para exportar.");
    // Por defecto, marcamos todas las columnas (los IDs de los campos + la fecha)
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
      return alert("Debes seleccionar al menos una columna para descargar el archivo.");
    }

    const excelData = registrations.map((reg: any) => {
      const row: any = {};
      
      // Añadir los campos que el usuario seleccionó
      fields.forEach((f: any) => { 
        if (selectedColumns.includes(f.id)) {
          row[f.field_name] = reg.form_data[f.id] || '-'; 
        }
      });

      // Añadir la fecha si fue seleccionada
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

        let added = 0;
        
        for (const row of data) {
          let doc = '';
          let form_data: Record<string, string> = {};
          let nombre = '', apellido = '', email = '', institucion = '', cargo = '', pais = '', ciudad = '';

          fields.forEach((f: any) => {
            const val = row[f.field_name] || '';
            form_data[f.id] = String(val);
            
            const fn = String(f.field_name).toLowerCase();
            if (fn.includes('documento') && !fn.includes('tipo')) doc = String(val);
            if (fn.includes('nombre')) {
               const parts = String(val).split(' ');
               nombre = parts[0] || '';
               apellido = parts.slice(1).join(' ');
            }
            if (fn.includes('correo')) email = String(val);
            if (fn.includes('institución') || fn.includes('institucion')) institucion = String(val);
            if (fn.includes('cargo')) cargo = String(val);
            if (fn.includes('país') || fn.includes('pais')) pais = String(val);
            if (fn.includes('ciudad')) ciudad = String(val);
          });

          if (!doc || doc === 'undefined') continue;

          await supabase
            .from('historic_users')
            .upsert({
              documento_identidad: doc, 
              email, 
              nombre: nombre || 'Registro Masivo', 
              apellido, 
              institucion, 
              cargo, 
              pais, 
              ciudad
            }, { onConflict: 'documento_identidad' });

          const { error: regErr } = await supabase
            .from('registrations')
            .insert([{
              event_id: eventId, 
              historic_user_doc: doc, 
              form_data
            }]);
          
          if (!regErr) added++;
        }
        
        alert(`Se importaron ${added} asistentes exitosamente desde el archivo.`);
        loadEventData(); 
        
      } catch (error) {
        alert("Error importando: Verifique que las columnas del Excel se llamen exactamente igual a las preguntas del formulario.");
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = '';
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const filteredRegistrations = useMemo(() => {
    if (!searchTerm) return registrations;
    return registrations.filter((reg: any) => {
      return Object.values(reg.form_data).some((val: any) => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [registrations, searchTerm]);

  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  const currentItems = filteredRegistrations.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  const togglePauseEvent = async () => {
    const newState = !event.is_active;
    const { error } = await supabase
      .from('events')
      .update({ is_active: newState })
      .eq('id', event.id);
      
    if (!error) {
      setEvent({ ...event, is_active: newState });
    }
  };

  const archiveEvent = async () => {
    if (window.confirm("¿Estás seguro de archivar este evento?")) {
      const { error } = await supabase
        .from('events')
        .update({ is_deleted: true })
        .eq('id', event.id);
        
      if (!error) {
        router.push('/admin/dashboard');
      }
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
      if (val && val !== 'Otra') {
        counts[val] = (counts[val] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5);
  };

  if (loading) {
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

  const publicUrl = `${baseUrl}/e/${event.id}`;
  const iframeCode = `<iframe src="${publicUrl}" width="100%" height="800" frameborder="0" style="border-radius: 12px; overflow: hidden; max-width: 800px; margin: auto; display: block;"></iframe>`;
  
  const topRoles = getTopStats('cargo');
  const topInstitutions = getTopStats('instituci');
  const topCities = getTopStats('ciudad');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 relative">
      
      {/* MODAL EXPORTAR EXCEL INTELIGENTE */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
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
                  className="text-gray-500 hover:text-white p-1 transition-colors rounded-full hover:bg-white/5"
                >
                  <X className="h-6 w-6"/>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                <p className="text-sm text-gray-400 mb-2">Selecciona las columnas que deseas incluir en el archivo Excel:</p>
                
                <div className="flex gap-2 mb-4">
                  <button 
                    onClick={selectAllColumns} 
                    className="flex-1 text-xs bg-primary/20 text-primary py-2 rounded-lg hover:bg-primary hover:text-white font-bold transition-colors border border-primary/30"
                  >
                    Seleccionar Todas
                  </button>
                  <button 
                    onClick={deselectAllColumns} 
                    className="flex-1 text-xs bg-white/5 text-gray-400 py-2 rounded-lg hover:bg-white/10 hover:text-white font-bold transition-colors border border-white/10"
                  >
                    Desmarcar Todas
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Fila Fecha (Dato automático) */}
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

                  {/* Filas Dinámicas del Formulario */}
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
                  className="w-full bg-accent hover:bg-accent/90 text-black font-bold py-3.5 rounded-xl shadow-4d-static active:translate-y-1 active:shadow-none transition-transform flex justify-center items-center gap-2"
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
          <p className="text-gray-400">Panel de Distribución y Gestión de Inscritos</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href={`/admin/eventos/${event.id}/auto-checkin`} target="_blank">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-primary text-white shadow-4d-static hover:bg-primary/90 transition-transform active:translate-y-1 active:shadow-none">
              <MonitorPlay className="h-4 w-4" /> 
              Check-in Automático
            </button>
          </Link>

          <button 
            onClick={togglePauseEvent} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              event.is_active 
                ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' 
                : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
            }`}
          >
            {event.is_active ? (
              <>
                <PauseCircle className="h-4 w-4" /> Pausar Evento
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" /> Activar Evento
              </>
            )}
          </button>
          <button 
            onClick={archiveEvent} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
          >
            <Trash2 className="h-4 w-4" /> Al Historial
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
                className="bg-primary hover:bg-primary/80 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
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
              className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded-xl flex justify-center items-center gap-2 transition-all font-bold text-sm"
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
              className={`flex items-center gap-2 pb-2 font-bold transition-colors border-b-2 ${
                activeTab === 'lista' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <List className="h-4 w-4" /> Listado de Inscritos
            </button>
            <button 
              onClick={() => setActiveTab('analitica')} 
              className={`flex items-center gap-2 pb-2 font-bold transition-colors border-b-2 ${
                activeTab === 'analitica' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" /> Estadísticas (Analytics)
            </button>
          </div>

          {activeTab === 'lista' ? (
            <div className="bg-surface border border-white/5 rounded-2xl flex flex-col h-full min-h-125">
              <div className="p-6 border-b border-white/5 space-y-4">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                  
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">Inscritos</h2>
                    <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold">
                      {filteredRegistrations.length} {event.max_capacity && `/ ${event.max_capacity}`}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
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
                      className="bg-gray-800 text-white hover:bg-gray-700 font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-transform active:translate-y-1 text-sm border border-transparent disabled:opacity-50"
                    >
                      {isImporting ? <Loader2 className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4" />} 
                      Subir Datos
                    </button>

                    <Link href={`/admin/eventos/${event.id}/gafetes`}>
                      <button className="bg-white text-black hover:bg-gray-200 font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-transform active:translate-y-1 text-sm border border-transparent">
                        <Printer className="h-4 w-4" /> 
                        Gafetes
                      </button>
                    </Link>
                    
                    {/* BOTÓN CON LA NUEVA LÓGICA DE EXPORTACIÓN */}
                    <button 
                      onClick={openExportModal} 
                      className="bg-accent hover:bg-accent/90 text-black font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 shadow-4d-static transition-transform active:translate-y-1 active:shadow-none text-sm"
                    >
                      <Download className="h-4 w-4" /> 
                      Exportar
                    </button>
                  </div>
                </div>

                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar por cédula, nombre o dato..." 
                    value={searchTerm} 
                    onChange={(e) => { 
                      setSearchTerm(e.target.value); 
                      setCurrentPage(1); 
                    }} 
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary" 
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto flex-1 p-2">
                {currentItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 min-h-75">
                    <Users className="h-12 w-12 mb-3 opacity-20" />
                    <p>{searchTerm ? 'No hay resultados.' : 'Aún no hay inscritos.'}</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap">
                    <thead className="bg-black/30 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-6 py-4 font-medium">Fecha</th>
                        {fields.map((f: any) => (
                          <th key={f.id} className="px-6 py-4 font-medium">
                            {f.field_name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {currentItems.map((reg: any) => (
                        <tr key={reg.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {new Date(reg.created_at).toLocaleDateString()}
                          </td>
                          {fields.map((f: any) => (
                            <td 
                              key={f.id} 
                              className="px-6 py-4 max-w-50 truncate" 
                              title={reg.form_data[f.id]}
                            >
                              {reg.form_data[f.id] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-400">
                  <span>Página {currentPage} de {totalPages}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1} 
                      className="p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4"/>
                    </button>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages} 
                      className="p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4"/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-surface border border-white/5 p-6 rounded-2xl md:col-span-2 flex items-center justify-between">
                <div>
                  <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest">Aforo Total</h3>
                  <p className="text-4xl font-black text-white mt-1">
                    {registrations.length} <span className="text-lg text-gray-500 font-medium">inscritos</span>
                  </p>
                </div>
                {event.max_capacity && (
                  <div className="text-right">
                    <p className="text-sm text-accent font-bold mb-2">
                      {Math.round((registrations.length / event.max_capacity) * 100)}% Lleno
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
                    <BarChart3 className="h-4 w-4 text-primary"/> Top 5 Instituciones
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
                    <BarChart3 className="h-4 w-4 text-green-400"/> Distribución de Cargos
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
                    <BarChart3 className="h-4 w-4 text-accent"/> Ciudades Principales
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