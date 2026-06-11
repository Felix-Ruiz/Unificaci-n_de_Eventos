"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Users, 
  UserCheck, 
  UserMinus, 
  Focus, 
  Download, 
  UserPlus, 
  X,
  Camera,
  MonitorPlay
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import * as XLSX from 'xlsx';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function CheckInEventPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [nameFieldId, setNameFieldId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // ESTADOS DEL ESCÁNER FÍSICO
  const [scannerInput, setScannerInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const scannerRef = useRef<HTMLInputElement>(null);

  // ESTADOS DEL ESCÁNER DE CÁMARA
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // ESTADOS DEL MODAL MANUAL
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualFormData, setManualFormData] = useState<Record<string, string>>({});
  const [isAddingManual, setIsAddingManual] = useState(false);

  // ESTADOS PARA EXPORTACIÓN INTELIGENTE Y AUDITORÍA
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!eventId) return;

    loadData();

    // Sincronización Multipuerta (Tiempo Real)
    const channel = supabase
      .channel(`realtime-registrations-${eventId}`)
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'registrations', filter: `event_id=eq.${eventId}` }, 
        (payload: any) => {
          const updatedReg = payload.new;
          setRegistrations((prev) => 
            prev.map((r: any) => r.id === updatedReg.id ? { ...r, attended: updatedReg.attended } : r)
          );
        }
      )
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'registrations', filter: `event_id=eq.${eventId}` }, 
        (payload: any) => {
          setRegistrations((prev) => [...prev, payload.new]);
        }
      )
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'attendance_logs', filter: `event_id=eq.${eventId}` }, 
        (payload: any) => {
          setAttendanceLogs((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [eventId]);

  // LÓGICA DE LA CÁMARA QR (Versión Core)
  useEffect(() => {
    if (!isCameraOpen) return;
    
    let isMounted = true;
    let html5QrCode: any = null;

    const initScanner = async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      setTimeout(async () => {
        if (!isMounted) return;
        try {
          html5QrCode = new Html5Qrcode("qr-reader-puerta");
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            (decodedText: string) => {
              if (html5QrCode) {
                html5QrCode.stop().then(() => {
                  setIsCameraOpen(false);
                  processScannedDoc(decodedText);
                }).catch(console.error);
              }
            },
            (errorMessage: string) => { 
              // Silenciar errores de lectura
            }
          );
        } catch (e) {
          console.error(e);
          alert("No se pudo iniciar la cámara.");
          setIsCameraOpen(false);
        }
      }, 400);
    };

    initScanner();

    return () => {
      isMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isCameraOpen]);

  async function loadData() {
    setLoading(true);
    
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
      
    setFields(fieldsData || []);

    const nameF = fieldsData?.find((f: any) => f.field_name.toLowerCase().includes('nombre'));
    if (nameF) {
      setNameFieldId(nameF.id);
    }

    const { data: regsData } = await supabase
      .from('registrations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
      
    setRegistrations(regsData || []);

    const { data: logsData } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('event_id', eventId);
      
    if (logsData) {
      setAttendanceLogs(logsData);
    }

    setLoading(false);
  }

  const toggleAttendance = async (id: string, currentState: boolean) => {
    const newState = !currentState;
    
    setRegistrations(prev => prev.map((r: any) => r.id === id ? { ...r, attended: newState } : r));
    
    const { error } = await supabase
      .from('registrations')
      .update({ attended: newState })
      .eq('id', id);
      
    if (!error && newState) {
       await supabase.from('attendance_logs').insert([{
           event_id: eventId,
           registration_id: id,
           zone_name: 'Entrada Principal',
           operator_name: 'Panel Administrativo'
       }]);
    }

    if (error) { 
      alert("Error al marcar asistencia."); 
      loadData(); 
    }
  };

  const processScannedDoc = async (docScanned: string) => {
    const cleanDoc = docScanned.trim();
    if (!cleanDoc) return;

    const reg = registrations.find((r: any) => r.historic_user_doc === cleanDoc);
    
    if (reg) {
      if (!reg.attended) {
        await toggleAttendance(reg.id, false);
      } else {
        alert("Este asistente ya estaba marcado como Adentro.");
      }
    } else {
      alert(`La cédula/código ${cleanDoc} no está registrada en este evento. Inscríbelo manualmente con el botón +.`);
    }
  };

  const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const doc = scannerInput;
      setScannerInput(''); 
      await processScannedDoc(doc);
    }
  };

  const handleManualFieldChange = (id: string, value: string) => {
    setManualFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingManual(true);
    
    try {
      let doc = '';
      let nombre = '';
      let email = 'sin-correo@manual.com';
      let institucion = '';
      let cargo = '';
      let pais = '';
      let ciudad = '';
      
      const finalFormData = { ...manualFormData };

      fields.forEach((f: any) => {
        const fn = (f.field_name || '').toLowerCase();
        const val = manualFormData[f.id] || '';
        
        if (f.field_type === 'select' && val === 'Otra' && manualFormData[`${f.id}_otra`]) {
          finalFormData[f.id] = manualFormData[`${f.id}_otra`];
        }
        
        const finalVal = finalFormData[f.id] || val;
        
        if (fn.includes('documento') && !fn.includes('tipo')) doc = finalVal;
        if (fn.includes('nombre')) nombre = finalVal;
        if (fn.includes('correo')) email = finalVal;
        if (fn.includes('institución') || fn.includes('institucion')) institucion = finalVal;
        if (fn.includes('cargo')) cargo = finalVal;
        if (fn.includes('país') || fn.includes('pais')) pais = finalVal;
        if (fn.includes('ciudad')) ciudad = finalVal;
      });

      if (!doc) {
        throw new Error("El formulario debe contener un campo de documento de identidad válido.");
      }

      await supabase
        .from('historic_users')
        .upsert({ 
          documento_identidad: doc, 
          nombre: nombre || 'Registro Manual', 
          apellido: '',
          email,
          institucion,
          cargo,
          pais,
          ciudad
        }, { onConflict: 'documento_identidad' });
      
      const { data: newReg, error: regErr } = await supabase
        .from('registrations')
        .insert([{ 
          event_id: eventId, 
          historic_user_doc: doc, 
          form_data: finalFormData, 
          attended: true 
        }]).select().single();

      if (regErr) throw regErr;

      if (newReg) {
         await supabase.from('attendance_logs').insert([{ 
           event_id: eventId, 
           registration_id: newReg.id, 
           zone_name: 'Entrada Principal', 
           operator_name: 'Panel Administrativo (Manual)' 
         }]);
      }

      setShowAddModal(false);
      setManualFormData({});
      loadData();
      
    } catch (error: any) {
      alert("Error añadiendo: " + error.message);
    } finally {
      setIsAddingManual(false);
    }
  };

  // FUNCIONES DE EXPORTACIÓN INTELIGENTE
  const openExportModal = () => {
    if (registrations.length === 0) return alert("No hay registros para exportar.");
    const allColIds = ['doc', 'asistencia', 'fecha', 'zonas', ...fields.map(f => f.id)];
    setSelectedColumns(allColIds);
    setShowExportModal(true);
  };

  const toggleColumn = (colId: string) => {
    setSelectedColumns(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(['doc', 'asistencia', 'fecha', 'zonas', ...fields.map(f => f.id)]);
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const confirmExport = () => {
    if (selectedColumns.length === 0) {
      return alert("Selecciona al menos una columna.");
    }

    const excelData = filteredRegistrations.map((reg: any, idx: number) => {
      const row: any = { 'N°': idx + 1 };
      
      if (selectedColumns.includes('doc')) {
        row['Documento'] = reg.historic_user_doc;
      }
      
      fields.forEach((f: any) => { 
        if (selectedColumns.includes(f.id)) {
          row[f.field_name] = reg.form_data[f.id] || '-'; 
        }
      });
      
      if (selectedColumns.includes('asistencia')) {
        row['Asistió'] = reg.attended ? 'SÍ' : 'NO';
      }

      if (selectedColumns.includes('zonas')) {
        const userLogs = attendanceLogs.filter(l => l.registration_id === reg.id);
        row['Historial de Accesos (Multizona)'] = userLogs.map(l => 
          `${l.zone_name} por [${l.operator_name || 'N/A'}] a las ${new Date(l.created_at).toLocaleTimeString()}`
        ).join(' | ') || 'Ninguno';
      }
      
      if (selectedColumns.includes('fecha')) {
        row['Fecha de Registro'] = new Date(reg.created_at).toLocaleString();
      }
      
      return row;
    });
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Asistencia");
    XLSX.writeFile(workbook, `Asistencia_Auditoria_${event.name.replace(/\s+/g, '_')}.xlsx`);
    
    setShowExportModal(false);
  };

  const filteredRegistrations = useMemo(() => {
    if (!searchTerm) return registrations;
    return registrations.filter((reg: any) => {
      const docMatch = reg.historic_user_doc.includes(searchTerm);
      const nameMatch = nameFieldId && reg.form_data[nameFieldId] && String(reg.form_data[nameFieldId]).toLowerCase().includes(searchTerm.toLowerCase());
      return docMatch || nameMatch;
    });
  }, [registrations, searchTerm, nameFieldId]);

  const total = registrations.length;
  const arrived = registrations.filter((r: any) => r.attended).length;
  const missing = total - arrived;

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-10 text-center text-white">Evento no encontrado.</div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 relative">
      
      {/* MODAL DE EXPORTACIÓN INTELIGENTE */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
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
                  <label className="flex items-center gap-3 p-3 bg-black/30 border border-white/5 rounded-xl cursor-pointer hover:border-accent/50 transition-colors">
                    <div className="flex items-center h-5">
                      <input 
                        type="checkbox" 
                        checked={selectedColumns.includes('doc')} 
                        onChange={() => toggleColumn('doc')} 
                        className="w-5 h-5 appearance-none rounded border-2 border-gray-500 checked:bg-accent checked:border-accent flex items-center justify-center transition-colors cursor-pointer after:content-['✓'] after:text-black after:font-bold after:opacity-0 checked:after:opacity-100 after:text-xs" 
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-200">Documento / Cédula</span>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-black/30 border border-white/5 rounded-xl cursor-pointer hover:border-accent/50 transition-colors">
                    <div className="flex items-center h-5">
                      <input 
                        type="checkbox" 
                        checked={selectedColumns.includes('asistencia')} 
                        onChange={() => toggleColumn('asistencia')} 
                        className="w-5 h-5 appearance-none rounded border-2 border-gray-500 checked:bg-accent checked:border-accent flex items-center justify-center transition-colors cursor-pointer after:content-['✓'] after:text-black after:font-bold after:opacity-0 checked:after:opacity-100 after:text-xs" 
                      />
                    </div>
                    <span className="text-sm font-bold text-accent">Estado de Asistencia (SÍ / NO)</span>
                  </label>

                  {/* NUEVA OPCIÓN: AUDITORÍA DE STAFF */}
                  <label className="flex items-center gap-3 p-3 bg-black/30 border border-white/5 rounded-xl cursor-pointer hover:border-accent/50 transition-colors">
                    <div className="flex items-center h-5">
                      <input 
                        type="checkbox" 
                        checked={selectedColumns.includes('zonas')} 
                        onChange={() => toggleColumn('zonas')} 
                        className="w-5 h-5 appearance-none rounded border-2 border-gray-500 checked:bg-accent checked:border-accent flex items-center justify-center transition-colors cursor-pointer after:content-['✓'] after:text-black after:font-bold after:opacity-0 checked:after:opacity-100 after:text-xs" 
                      />
                    </div>
                    <span className="text-sm font-bold text-accent">Historial de Zonas y Staff (Auditoría)</span>
                  </label>

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
                  className="w-full bg-accent hover:bg-accent/90 text-black font-bold py-3.5 rounded-xl shadow-4d-static active:translate-y-1 active:shadow-none transition-transform flex justify-center items-center gap-2"
                >
                  <Download className="h-5 w-5"/> Descargar Reporte de Asistencia
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE CÁMARA */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
              className="bg-surface border border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl flex flex-col items-center"
            >
              <button 
                onClick={() => setIsCameraOpen(false)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-black/50 rounded-full p-2 z-10"
              >
                <X className="h-6 w-6"/>
              </button>
              
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Camera className="h-5 w-5 text-accent"/> 
                Apunta al Código QR
              </h2>
              
              <div className="w-full bg-black border-2 border-white/10 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center min-h-75">
                <div id="qr-reader-puerta" className="w-full h-full object-cover"></div>
              </div>
              
              <p className="text-sm text-gray-400 mt-6 text-center">
                La cámara detectará el QR automáticamente y registrará la asistencia.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE AÑADIR MANUAL */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
              className="bg-surface border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface sticky top-0 z-10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-accent"/> 
                  Registro Rápido en Puerta
                </h2>
                <button 
                  onClick={() => setShowAddModal(false)} 
                  className="text-gray-500 hover:text-white transition-colors p-1"
                >
                  <X className="h-6 w-6"/>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form id="manual-form" onSubmit={handleManualAddSubmit} className="space-y-4">
                  {fields.map((field: any) => {
                    const currentValue = manualFormData[field.id] || '';
                    return (
                      <div key={field.id} className="relative">
                        {field.field_type !== 'checkbox' && (
                          <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">
                            {field.field_name} {field.is_required && <span className="text-accent">*</span>}
                          </label>
                        )}
                        {field.field_type === 'select' ? (
                          <div className="space-y-2">
                            <select 
                              required={field.is_required} 
                              value={currentValue} 
                              onChange={(e) => handleManualFieldChange(field.id, e.target.value)} 
                              className="w-full bg-black/50 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent"
                            >
                              <option value="" disabled>Seleccionar...</option>
                              {(() => {
                                const parsedOptions = field.options ? JSON.parse(field.options) : { choices: [] };
                                const choices = [...(parsedOptions.choices || [])];
                                if (!choices.includes('Otra')) choices.push('Otra');
                                return choices.map((opt: string) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ));
                              })()}
                            </select>
                            {currentValue === 'Otra' && (
                              <input 
                                type="text" 
                                required 
                                value={manualFormData[`${field.id}_otra`] || ''} 
                                onChange={(e) => handleManualFieldChange(`${field.id}_otra`, e.target.value)} 
                                className="w-full bg-primary/10 border border-primary/30 text-white rounded-lg p-3 outline-none focus:border-accent mt-2" 
                                placeholder={`Específica tu ${field.field_name.toLowerCase()}...`} 
                              />
                            )}
                          </div>
                        ) : field.field_type === 'textarea' ? (
                          <textarea 
                            required={field.is_required} 
                            value={currentValue} 
                            onChange={(e) => handleManualFieldChange(field.id, e.target.value)} 
                            rows={3} 
                            className="w-full bg-black/50 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent resize-none" 
                          />
                        ) : field.field_type === 'checkbox' ? (
                          <div className="flex items-center gap-3 bg-black/30 p-3 rounded-lg border border-gray-700">
                            <input 
                              type="checkbox" 
                              required={field.is_required} 
                              checked={currentValue === 'true'} 
                              onChange={(e) => handleManualFieldChange(field.id, e.target.checked ? 'true' : 'false')} 
                              className="w-5 h-5 accent-primary cursor-pointer"
                            />
                            <label 
                              className="text-sm text-gray-300 cursor-pointer" 
                              onClick={() => handleManualFieldChange(field.id, currentValue === 'true' ? 'false' : 'true')}
                            >
                              {field.field_name} {field.is_required && <span className="text-accent">*</span>}
                            </label>
                          </div>
                        ) : (
                          <input 
                            type={field.field_type} 
                            required={field.is_required} 
                            value={currentValue} 
                            onChange={(e) => handleManualFieldChange(field.id, e.target.value)} 
                            className="w-full bg-black/50 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent" 
                          />
                        )}
                      </div>
                    );
                  })}
                </form>
              </div>

              <div className="p-6 border-t border-white/5 bg-surface">
                <button 
                  type="submit" 
                  form="manual-form"
                  disabled={isAddingManual} 
                  className="w-full bg-accent text-black font-bold py-3 rounded-lg shadow-4d-static active:translate-y-1 transition-transform disabled:opacity-50"
                >
                  {isAddingManual ? "Procesando..." : "Inscribir y Dar Acceso Inmediato"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Check-In: {event.name}
          </h1>
          <p className="text-gray-400">
            Escanea la credencial, usa el buscador o inscribe manualmente al llegar.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/admin/eventos/${eventId}/auto-checkin`} target="_blank">
            <button className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 text-sm shadow-4d-static transition-transform active:translate-y-1 active:shadow-none">
              <MonitorPlay className="h-4 w-4" /> 
              Check-in Automático
            </button>
          </Link>

          <button 
            onClick={() => setShowAddModal(true)} 
            className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm"
          >
            <UserPlus className="h-4 w-4" /> 
            Añadir Manual
          </button>
          
          <button 
            onClick={openExportModal} 
            className="bg-accent hover:bg-accent/90 text-black font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 shadow-4d-static transition-transform active:translate-y-1 active:shadow-none text-sm"
          >
            <Download className="h-4 w-4" /> 
            Reporte
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-4 bg-accent/10 border border-accent/20 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 w-full h-1 bg-accent"></div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Focus className="h-5 w-5 text-accent"/> 
            Escáner de Puerta
          </h3>
          
          <div className="flex flex-col gap-3">
            <input 
              ref={scannerRef} 
              type="text" 
              autoFocus 
              value={scannerInput} 
              onChange={(e) => setScannerInput(e.target.value)} 
              onKeyDown={handleScan} 
              placeholder="Usar láser físico aquí..." 
              className="w-full bg-accent/20 border-2 border-accent/50 rounded-xl py-4 px-4 text-center text-white font-bold tracking-widest focus:outline-none focus:border-accent focus:bg-accent/30 placeholder:text-accent/50 transition-colors"
            />
            
            <div className="flex items-center gap-2">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">O</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <button 
              onClick={() => setIsCameraOpen(true)}
              className="w-full bg-black/50 border border-white/10 hover:bg-white/10 hover:border-white/30 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Camera className="h-5 w-5" /> Escanear con Cámara
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-3 gap-4">
          <div className="bg-surface border border-white/5 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
            <Users className="h-8 w-8 text-primary mb-2 opacity-50" />
            <p className="text-3xl font-black text-white">{total}</p>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Total Inscritos</p>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
            <UserCheck className="h-8 w-8 text-green-500 mb-2 opacity-50" />
            <p className="text-3xl font-black text-green-400">{arrived}</p>
            <p className="text-xs text-green-500/70 uppercase tracking-widest font-bold mt-1">Han Llegado</p>
          </div>
          
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
            <UserMinus className="h-8 w-8 text-red-500 mb-2 opacity-50" />
            <p className="text-3xl font-black text-red-400">{missing}</p>
            <p className="text-xs text-red-500/70 uppercase tracking-widest font-bold mt-1">Faltan</p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden flex flex-col h-full min-h-125">
        
        <div className="p-6 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Listado de Acceso</h2>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Buscar nombre o cédula..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto flex-1 p-2">
          {filteredRegistrations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 min-h-75">
              <Users className="h-12 w-12 mb-3 opacity-20" />
              <p>No se encontraron asistentes con ese dato.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-black/30 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-bold w-16">N°</th>
                  <th className="px-6 py-4 font-bold">Documento</th>
                  <th className="px-6 py-4 font-bold">Nombre Completo</th>
                  <th className="px-6 py-4 font-bold text-center">Estado Principal</th>
                  <th className="px-6 py-4 font-bold text-right">Acción Principal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRegistrations.map((reg: any, idx: number) => {
                  const isAttended = reg.attended;
                  const name = nameFieldId && reg.form_data[nameFieldId] ? reg.form_data[nameFieldId] : 'Sin Nombre';
                  return (
                    <tr 
                      key={reg.id} 
                      className={`transition-colors ${isAttended ? 'bg-green-500/5 hover:bg-green-500/10' : 'hover:bg-white/5'}`}
                    >
                      <td className="px-6 py-4 text-gray-500 font-medium">{idx + 1}</td>
                      <td className="px-6 py-4 font-mono text-gray-400">{reg.historic_user_doc}</td>
                      <td className="px-6 py-4 font-bold text-white">{name}</td>
                      <td className="px-6 py-4 text-center">
                        {isAttended ? (
                          <span className="inline-flex items-center gap-1.5 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Adentro
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20">
                            <XCircle className="h-3.5 w-3.5" /> Ausente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => toggleAttendance(reg.id, isAttended)} 
                          className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAttended ? 'bg-green-500' : 'bg-gray-700'}`}
                        >
                          <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAttended ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}