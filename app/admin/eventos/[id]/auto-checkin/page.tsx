"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { useParams } from 'next/navigation';
import { 
  Loader2, 
  CheckCircle2, 
  QrCode, 
  AlertCircle, 
  RefreshCw, 
  Camera, 
  X, 
  MapPin, 
  Printer, 
  Wifi, 
  WifiOff, 
  CloudUpload,
  UserCheck,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AutoCheckInPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // SISTEMA DE NOTIFICACIONES (TOASTS NATIVOS)
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'error' | 'info' | 'success' } | null>(null);

  const showToast = (title: string, desc: string, type: 'error' | 'info' | 'success' = 'error') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ESTADOS DEL MODO SUPERVIVENCIA (OFFLINE)
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const localCacheRef = useRef<{ registrations: any[], logs: any[] }>({ registrations: [], logs: [] });

  // ESTADOS DEL LÁSER FÍSICO
  const [scannerInput, setScannerInput] = useState('');
  const scannerRef = useRef<HTMLInputElement>(null);
  
  // COMPUERTAS LÓGICAS
  const isProcessingRef = useRef(false); 
  const cooldownRef = useRef<Set<string>>(new Set()); 

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [status, setStatus] = useState<'waiting' | 'processing' | 'success' | 'error'>('waiting');
  const [welcomeName, setWelcomeName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ESTADOS: CONTROL MULTIZONA
  const [activeZone, setActiveZone] = useState('Entrada Principal');
  const [availableZones, setAvailableZones] = useState([
    'Entrada Principal', 
    'Entrega de Kit', 
    'Almuerzo Día 1', 
    'Refrigerio', 
    'Taller VIP'
  ]);

  // ESTADO: MODAL PARA NUEVA ZONA
  const [showNewZoneModal, setShowNewZoneModal] = useState(false);
  const [newZoneInput, setNewZoneInput] = useState('');

  // ESTADO: TRAZABILIDAD DE STAFF
  const [operatorName, setOperatorName] = useState('Mesa Principal');

  // ESTADOS: IMPRESIÓN AUTOMÁTICA DE GAFETES
  const [autoPrint, setAutoPrint] = useState(false);
  const [printData, setPrintData] = useState<{ nombre: string; cargo: string; institucion: string } | null>(null);

  // =========================================================
  // MOTOR DE ARQUITECTURA OFFLINE: INDEXEDDB NATIVO
  // =========================================================
  const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`AcofiOffline_${eventId}`, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('scans')) {
          request.result.createObjectStore('scans', { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const getOfflineQueue = (): Promise<any[]> => {
    return new Promise(async (resolve) => {
      try {
        const db = await initDB();
        const transaction = db.transaction('scans', 'readonly');
        const store = transaction.objectStore('scans');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      } catch { resolve([]); }
    });
  };

  const addToOfflineQueue = async (scanData: any) => {
    try {
      const db = await initDB();
      const transaction = db.transaction('scans', 'readwrite');
      const store = transaction.objectStore('scans');
      store.add(scanData);
      transaction.oncomplete = async () => {
        const queue = await getOfflineQueue();
        setPendingSync(queue.length);
      };
    } catch (e) {
      console.error("Error guardando en IndexedDB:", e);
    }
  };

  const clearOfflineQueue = (): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        const db = await initDB();
        const transaction = db.transaction('scans', 'readwrite');
        const store = transaction.objectStore('scans');
        const request = store.clear();
        request.onsuccess = () => { setPendingSync(0); resolve(); };
        request.onerror = () => resolve();
      } catch { resolve(); }
    });
  };

  const syncPendingScans = async () => {
    const queue = await getOfflineQueue();
    if (queue.length === 0 || !navigator.onLine) return;

    setIsSyncing(true);
    try {
      for (const scan of queue) {
        await supabase.from('attendance_logs').insert([{
          event_id: eventId,
          registration_id: scan.registration_id,
          zone_name: scan.zone_name,
          operator_name: scan.operator_name || 'Operador Offline',
          created_at: scan.timestamp
        }]);

        if (scan.zone_name === 'Entrada Principal') {
          await supabase.from('registrations').update({ attended: true }).eq('id', scan.registration_id);
        }
      }
      await clearOfflineQueue();
      await loadEventData(); 
    } catch (error) {
      console.error("Error sincronizando cola offline", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function checkInitialQueue() {
      const queue = await getOfflineQueue();
      setPendingSync(queue.length);
    }
    checkInitialQueue();
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncPendingScans();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      syncPendingScans();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [eventId]);

  const playSound = (type: 'success' | 'error') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);

        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1200, ctx.currentTime);
          gain2.gain.setValueAtTime(0.5, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.1);
        }, 150);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.error("Audio no soportado", e);
    }
  };

  useEffect(() => {
    if (!eventId) return;
    loadEventData();
  }, [eventId]);

  async function loadEventData() {
    try {
      const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).single();
      setEvent(eventData);

      const { data: fieldsData } = await supabase.from('event_fields').select('*').eq('event_id', eventId);
      
      // FIX PERFORMANCE: Pre-parseamos los campos para lectura instantánea sin delay en el Kiosco
      const preParsedFields = (fieldsData || []).map(f => {
        let parsed = {};
        try { parsed = JSON.parse(f.options || '{}'); } catch(e) {}
        return { ...f, preParsedOptions: parsed };
      });
      setFields(preParsedFields);

      // ==========================================
      // PAGINACIÓN AUTOMÁTICA PARA MÁS DE 1000 REGISTROS
      // ==========================================
      let allRegistrations: any[] = [];
      let fromReg = 0;
      const step = 1000;
      let hasMoreRegs = true;

      while (hasMoreRegs) {
        const { data: rBatch } = await supabase
          .from('registrations')
          .select('*')
          .eq('event_id', eventId)
          .range(fromReg, fromReg + step - 1);

        if (rBatch && rBatch.length > 0) {
          allRegistrations = [...allRegistrations, ...rBatch];
          fromReg += step;
          if (rBatch.length < step) hasMoreRegs = false;
        } else {
          hasMoreRegs = false;
        }
      }

      // PAGINACIÓN AUTOMÁTICA PARA LOGS DE ASISTENCIA
      let allLogs: any[] = [];
      let fromLog = 0;
      let hasMoreLogs = true;

      while (hasMoreLogs) {
        const { data: lBatch } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('event_id', eventId)
          .range(fromLog, fromLog + step - 1);

        if (lBatch && lBatch.length > 0) {
          allLogs = [...allLogs, ...lBatch];
          fromLog += step;
          if (lBatch.length < step) hasMoreLogs = false;
        } else {
          hasMoreLogs = false;
        }
      }
      
      localCacheRef.current = {
        registrations: allRegistrations,
        logs: allLogs
      };

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (scannerRef.current && status === 'waiting' && !isCameraOpen && !showNewZoneModal) {
        scannerRef.current.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, [status, isCameraOpen, showNewZoneModal]);

  // MOTOR DE CÁMARA
  useEffect(() => {
    if (!isCameraOpen) return;
    
    let isMounted = true;
    let html5QrCode: any = null;

    const startCamera = async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      setTimeout(async () => {
        if (!isMounted) return;

        try {
          html5QrCode = new Html5Qrcode("kiosco-camera-reader");
          
          await html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: 250 },
            (decodedText: string) => {
              const cleanDoc = decodedText.trim();
              
              if (isProcessingRef.current) return;
              if (cooldownRef.current.has(cleanDoc)) return;

              isProcessingRef.current = true;
              cooldownRef.current.add(cleanDoc);

              setTimeout(() => {
                cooldownRef.current.delete(cleanDoc);
              }, 6000);

              processDoc(cleanDoc);
            },
            (errorMessage: string) => { /* Silenciar */ }
          );
        } catch (err: any) {
          console.error("Error cámara", err);
          showToast('Cámara No Disponible', 'No se pudo acceder a la cámara del dispositivo. Verifica los permisos.', 'error');
          if (isMounted) setIsCameraOpen(false);
        }
      }, 500); 
    };

    startCamera();

    return () => {
      isMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
      }
    };
  }, [isCameraOpen]);

  const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'NEW') {
      setNewZoneInput('');
      setShowNewZoneModal(true);
    } else {
      setActiveZone(e.target.value);
    }
  };

  const confirmNewZone = () => {
    if (newZoneInput.trim()) {
      setAvailableZones(prev => [...prev, newZoneInput.trim()]);
      setActiveZone(newZoneInput.trim());
    }
    setShowNewZoneModal(false);
  };

  // PROCESAMIENTO HÍBRIDO (CON AUDITORÍA DE STAFF)
  const processDoc = async (cleanDoc: string) => {
    setStatus('processing');

    try {
      const reg = localCacheRef.current.registrations.find(r => r.historic_user_doc === cleanDoc);

      if (!reg) {
        throw new Error("Credencial no encontrada en la base de datos.");
      }

      const dbLogs = localCacheRef.current.logs.filter(l => l.registration_id === reg.id && l.zone_name === activeZone);
      const offlineQueueList = await getOfflineQueue();
      const queuedLogs = offlineQueueList.filter((l: any) => l.registration_id === reg.id && l.zone_name === activeZone);

      if (dbLogs.length > 0 || queuedLogs.length > 0) {
        throw new Error(`⛔ ¡ALERTA! Esta credencial ya fue registrada en: ${activeZone}`);
      }

      const scanPayload = {
        registration_id: reg.id,
        zone_name: activeZone,
        operator_name: operatorName.trim() || 'Operador Anónimo',
        timestamp: new Date().toISOString()
      };

      if (isOnline) {
        try {
          await supabase.from('attendance_logs').insert([{
            event_id: eventId,
            ...scanPayload
          }]);

          if (activeZone === 'Entrada Principal' && !reg.attended) {
            await supabase.from('registrations').update({ attended: true }).eq('id', reg.id);
            reg.attended = true;
          }
          
          localCacheRef.current.logs.push(scanPayload);
          
        } catch (e) {
          await addToOfflineQueue(scanPayload);
          localCacheRef.current.logs.push(scanPayload);
          if (activeZone === 'Entrada Principal') reg.attended = true;
        }
      } else {
        await addToOfflineQueue(scanPayload);
        localCacheRef.current.logs.push(scanPayload);
        if (activeZone === 'Entrada Principal') reg.attended = true;
      }

      // EXTRACCIÓN INTELIGENTE DE DATOS (FIX NOMBRES)
      const getFieldValue = (form_data: any, systemKey: string, fallbacks: string[]) => {
        const field = fields.find((f: any) => {
          const opts = f.preParsedOptions || {};
          if (opts.system_key === systemKey) return true;
          const lowerName = (f.field_name || '').toLowerCase();
          return fallbacks.some(fb => lowerName.includes(fb));
        });
        return field ? form_data[field.id] : '';
      };

      const nombre = getFieldValue(reg.form_data, 'nombre', ['nombre', 'first name']);
      const apellido = getFieldValue(reg.form_data, 'apellido', ['apellido', 'last name']);
      const fullName = [nombre, apellido].filter(Boolean).join(' ').trim() || 'Invitado';
      const firstName = nombre ? nombre.split(' ')[0] : fullName.split(' ')[0];
      
      const cargo = getFieldValue(reg.form_data, 'cargo', ['cargo', 'job title']);
      const inst = getFieldValue(reg.form_data, 'institucion', ['institución', 'institucion', 'company']);

      setPrintData({
        nombre: fullName,
        cargo: cargo,
        institucion: inst
      });

      setWelcomeName(firstName);
      setStatus('success');
      playSound('success'); 

      if (autoPrint) {
        setTimeout(() => window.print(), 300);
      }

      setTimeout(async () => {
        setStatus('waiting');
        setWelcomeName('');
        setPrintData(null);
        isProcessingRef.current = false; 
        if (!isCameraOpen && scannerRef.current) scannerRef.current.focus();
      }, 3000);

    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
      playSound('error'); 
      
      cooldownRef.current.delete(cleanDoc);
      
      setTimeout(() => {
        setStatus('waiting');
        setErrorMsg('');
        isProcessingRef.current = false;
        if (!isCameraOpen && scannerRef.current) scannerRef.current.focus();
      }, 4000);
    }
  };

  const handleLaserScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const doc = scannerInput.trim();
      setScannerInput(''); 
      
      if (isProcessingRef.current) return;
      if (cooldownRef.current.has(doc)) return;

      isProcessingRef.current = true;
      cooldownRef.current.add(doc);
      
      setTimeout(() => cooldownRef.current.delete(doc), 6000);

      await processDoc(doc);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="h-12 w-12 text-primary animate-spin" /></div>;
  }

  if (!event) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Evento no encontrado.</div>;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: 100mm 150mm; margin: 0; }
          body * { visibility: hidden; }
          #print-gafete, #print-gafete * { visibility: visible; }
          #print-gafete {
            position: absolute; left: 0; top: 0; width: 100mm; height: 150mm;
            background: white !important; color: black !important;
            display: flex !important; flex-direction: column; justify-content: center; align-items: center;
            padding: 10mm; box-sizing: border-box;
          }
        }
      `}} />

      <div id="print-gafete" className="hidden">
        {printData && (
          <div className="text-center w-full">
            {event.logo_url && (
               <img src={event.logo_url} alt="Logo" className="h-20 object-contain mx-auto mb-6 grayscale" />
            )}
            <h1 className="text-3xl font-black mb-2 uppercase leading-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
              {printData.nombre}
            </h1>
            {printData.cargo && (
              <p className="text-lg font-bold text-gray-700 mt-4 border-t-2 border-black pt-2 uppercase">
                {printData.cargo}
              </p>
            )}
            {printData.institucion && (
              <p className="text-md font-medium text-gray-600 uppercase mt-1">
                {printData.institucion}
              </p>
            )}
            <p className="mt-8 text-xs text-gray-400 font-bold uppercase tracking-widest">
              {event.name}
            </p>
          </div>
        )}
      </div>

      <div 
        className="min-h-screen w-full flex items-center justify-center overflow-hidden fixed inset-0 z-50 bg-[#050505] print:hidden"
        style={{ backgroundImage: `radial-gradient(circle at center, ${event.primary_color}20 0%, transparent 70%)` }}
      >
        {/* CONTENEDOR DE NOTIFICACIONES TOAST */}
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

        {/* MODAL PARA NUEVO PUNTO DE CONTROL */}
        <AnimatePresence>
          {showNewZoneModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-1000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>
                <h2 className="text-2xl font-bold text-white mb-2">Añadir Nuevo Punto de Control</h2>
                <p className="text-gray-400 text-sm mb-6">Escribe el nombre de la nueva zona para llevar la trazabilidad (Ej. Taller B, Salón Norte).</p>
                
                <input 
                  type="text" 
                  autoFocus
                  value={newZoneInput}
                  onChange={(e) => setNewZoneInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmNewZone()}
                  placeholder="Nombre de la zona..."
                  className="w-full bg-black/50 border border-white/10 text-white rounded-xl py-3 px-4 focus:outline-none focus:border-accent mb-6"
                />
                
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => {
                      setShowNewZoneModal(false);
                      setActiveZone('Entrada Principal');
                    }} 
                    className="px-5 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 transition-colors font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmNewZone} 
                    disabled={!newZoneInput.trim()}
                    className="px-5 py-2.5 rounded-lg text-black bg-accent font-bold transition-transform active:scale-95 shadow-4d-static disabled:opacity-50 cursor-pointer"
                  >
                    Añadir Zona
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <input 
          ref={scannerRef} type="text" value={scannerInput} onChange={(e) => setScannerInput(e.target.value)}
          onKeyDown={handleLaserScan} className="absolute opacity-0 -z-50" autoComplete="off"
        />

        {/* BARRA SUPERIOR DE CONTROLES */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-100 flex flex-col md:flex-row gap-3">
          
          {/* SELECTOR DE PUNTO DE CONTROL */}
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <MapPin className="h-5 w-5 text-accent" />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Punto de Control</span>
              <select 
                value={activeZone} onChange={handleZoneChange}
                className="bg-transparent text-white text-sm md:text-base font-bold outline-none cursor-pointer appearance-none leading-none"
              >
                {availableZones.map(z => <option key={z} value={z} className="bg-[#050505] text-white">{z}</option>)}
                <option value="NEW" className="bg-primary/20 text-primary">+ Añadir Nuevo Punto...</option>
              </select>
            </div>
          </div>

          {/* ASIGNACIÓN DE OPERARIO (STAFF) */}
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <UserCheck className="h-5 w-5 text-green-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Operario Responsable</span>
              <input 
                type="text" 
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Nombre o Terminal..."
                className="bg-transparent text-white text-sm md:text-base font-bold outline-none border-b border-transparent focus:border-green-400/50 placeholder:text-gray-600 w-32 md:w-40"
              />
            </div>
          </div>

          {/* INTERRUPTOR DE AUTO-IMPRESIÓN */}
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <Printer className={`h-5 w-5 ${autoPrint ? 'text-primary' : 'text-gray-500'}`} />
            <div className="flex flex-col mr-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Auto-Imprimir</span>
              <span className={`text-sm md:text-base font-bold leading-none ${autoPrint ? 'text-white' : 'text-gray-500'}`}>
                {autoPrint ? 'ACTIVADO' : 'APAGADO'}
              </span>
            </div>
            <button 
              type="button" 
              onClick={() => setAutoPrint(!autoPrint)} 
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoPrint ? 'bg-primary' : 'bg-gray-700'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${autoPrint ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

        </div>

        {/* INDICADOR DE RED OFFLINE */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-100 flex items-center gap-3">
          {pendingSync > 0 && (
            <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/50 rounded-xl px-4 py-2 shadow-lg backdrop-blur-md">
              {isSyncing ? <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" /> : <CloudUpload className="h-4 w-4 text-yellow-400 animate-pulse" />}
              <span className="text-yellow-400 text-xs font-bold tracking-widest">{pendingSync} PENDIENTES</span>
            </div>
          )}
          <div className={`flex items-center justify-center p-3 rounded-xl border backdrop-blur-md shadow-lg transition-colors ${isOnline ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/50'}`}>
            {isOnline ? <Wifi className="h-5 w-5 text-green-400" /> : <WifiOff className="h-5 w-5 text-red-400 animate-pulse" />}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isCameraOpen && (
            <motion.div key="camera-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-[#050505] flex flex-col items-center justify-center p-4 md:p-6">
              <button onClick={() => setIsCameraOpen(false)} className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors cursor-pointer z-50">
                <X className="h-8 w-8"/>
              </button>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8 flex items-center gap-3 mt-16">
                <Camera className="h-6 w-6 md:h-8 md:w-8 text-primary"/> Escaneo en: {activeZone}
              </h2>
              
              <div className={`w-full max-w-2xl mx-auto bg-black border-4 rounded-4xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] min-h-75 relative transition-colors duration-300 flex items-center justify-center ${status === 'success' ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]' : status === 'error' ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]' : 'border-white/10'}`}>
                <div id="kiosco-camera-reader" className="w-full h-full bg-black rounded-3xl overflow-hidden flex items-center justify-center"></div>
              </div>

              <div className="w-full max-w-2xl mx-auto mt-6 h-32 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {status === 'waiting' && (
                    <motion.div key="msg-waiting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center text-center">
                      <QrCode className="h-8 w-8 text-gray-400 mb-2 animate-pulse" />
                      <p className="text-gray-300 font-medium">Apunta el código QR a la cámara</p>
                    </motion.div>
                  )}
                  {status === 'processing' && (
                    <motion.div key="msg-processing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center text-center">
                      <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                    </motion.div>
                  )}
                  {status === 'success' && (
                    <motion.div key="msg-success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full bg-green-500/20 border border-green-500/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                      <h2 className="text-2xl font-black text-white">¡Ingreso Exitoso, {welcomeName}!</h2>
                      {autoPrint && <p className="text-sm text-green-300 mt-1 animate-pulse">Imprimiendo gafete...</p>}
                    </motion.div>
                  )}
                  {status === 'error' && (
                    <motion.div key="msg-error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full bg-red-600/20 border border-red-600/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                      <h2 className="text-xl font-black text-white mb-1">Acceso Denegado</h2>
                      <p className="text-sm text-red-200">{errorMsg}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {!isCameraOpen && status === 'waiting' && (
            <motion.div key="laser-waiting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -50 }} className="text-center flex flex-col items-center justify-center p-6 md:p-10 w-full mt-16">
              {event.logo_url ? <img src={event.logo_url} alt="Logo" className="h-24 md:h-32 mb-8 md:mb-10 object-contain drop-shadow-2xl opacity-80" /> : <div className="h-16 md:h-20 mb-8 md:mb-10"></div>}
              
              <div className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-4xl backdrop-blur-md shadow-2xl relative overflow-hidden max-w-lg w-full mx-auto flex flex-col items-center">
                <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
                <QrCode className="h-24 w-24 md:h-32 md:w-32 text-gray-300 mx-auto mb-6 md:mb-8 animate-pulse" />
                <h1 className="text-3xl md:text-5xl font-black text-white mb-3 md:mb-4 tracking-tight">Check-in Automático</h1>
                <p className="text-lg md:text-2xl text-accent font-bold mb-8 md:mb-12 border-b border-accent/30 pb-2">{activeZone}</p>
                <button type="button" onClick={() => setIsCameraOpen(true)} className="bg-primary hover:bg-primary/80 text-white font-bold py-4 md:py-5 px-6 md:px-10 rounded-xl md:rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-3 w-full text-base md:text-xl shadow-[0_0_30px_rgba(79,70,229,0.3)] z-10 cursor-pointer">
                  <Camera className="h-5 w-5 md:h-6 md:w-6" /> O Escanear con Celular
                </button>
              </div>
              <p className="mt-8 md:mt-12 text-gray-600 font-bold tracking-widest uppercase flex items-center justify-center gap-2 text-xs md:text-sm">
                <RefreshCw className="h-3 w-3 md:h-4 md:w-4 animate-spin"/> Sistema Listo para Escanear
              </p>
            </motion.div>
          )}

          {/* PANTALLAS DE PROCESO */}
          {!isCameraOpen && status === 'processing' && (
            <motion.div key="laser-processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <Loader2 className="h-24 w-24 md:h-32 md:w-32 text-accent animate-spin mx-auto" />
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-8">Verificando en {activeZone}...</h2>
            </motion.div>
          )}

          {!isCameraOpen && status === 'success' && (
            <motion.div key="laser-success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="fixed inset-0 bg-green-50 z-100 flex flex-col items-center justify-center p-6 md:p-10">
              <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="text-center">
                <CheckCircle2 className="h-32 w-32 md:h-48 md:w-48 text-white mx-auto mb-6 md:mb-8 drop-shadow-lg" />
                <h1 className="text-4xl md:text-7xl font-black text-white tracking-tight drop-shadow-md mb-4 leading-tight">¡Bienvenido,<br className="md:hidden"/> {welcomeName}!</h1>
                <p className="text-xl md:text-3xl text-green-100 font-bold bg-black/20 inline-block px-6 py-3 md:px-8 md:py-4 rounded-full mt-4">Acceso a {activeZone} Autorizado</p>
                {autoPrint && <p className="text-xl text-white mt-8 animate-pulse font-bold flex items-center justify-center gap-2"><Printer className="h-6 w-6"/> Imprimiendo Gafete...</p>}
              </motion.div>
            </motion.div>
          )}

          {!isCameraOpen && status === 'error' && (
            <motion.div key="laser-error" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-red-600 z-100 flex flex-col items-center justify-center p-6 md:p-10 text-center">
              <AlertCircle className="h-32 w-32 md:h-40 md:w-40 text-white mx-auto mb-6 md:mb-8 drop-shadow-lg" />
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-md mb-4 md:mb-6">Acceso Denegado</h1>
              <p className="text-lg md:text-2xl text-red-100 font-bold max-w-2xl mx-auto bg-black/20 p-4 md:p-6 rounded-2xl">{errorMsg}</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
}