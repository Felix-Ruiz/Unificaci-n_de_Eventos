"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle2, QrCode, AlertCircle, RefreshCw, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AutoCheckInPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // ESTADOS DEL LÁSER FÍSICO
  const [scannerInput, setScannerInput] = useState('');
  const scannerRef = useRef<HTMLInputElement>(null);
  
  // COMPUERTAS LÓGICAS (CÁMARA SIEMPRE ACTIVA)
  const isProcessingRef = useRef(false); 
  const cooldownRef = useRef<Set<string>>(new Set()); 

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [status, setStatus] = useState<'waiting' | 'processing' | 'success' | 'error'>('waiting');
  const [welcomeName, setWelcomeName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [nameFieldId, setNameFieldId] = useState<string>('');

  useEffect(() => {
    if (!eventId) return;
    loadEventData();
  }, [eventId]);

  async function loadEventData() {
    try {
      const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).single();
      setEvent(eventData);

      const { data: fieldsData } = await supabase.from('event_fields').select('id, field_name').eq('event_id', eventId);
      const nameF = fieldsData?.find((f: any) => f.field_name.toLowerCase().includes('nombre'));
      if (nameF) setNameFieldId(nameF.id);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (scannerRef.current && status === 'waiting' && !isCameraOpen) {
        scannerRef.current.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, [status, isCameraOpen]);

  // INICIO DE LA CÁMARA (NUNCA SE APAGA)
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
            { fps: 10, qrbox: { width: 250, height: 250 } },
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
            (errorMessage: string) => {
              // Silenciar
            }
          );
        } catch (err: any) {
          console.error("Error iniciando cámara", err);
          alert("No se pudo iniciar la cámara. Verifica permisos.");
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

  const processDoc = async (cleanDoc: string) => {
    setStatus('processing');

    try {
      const { data: reg, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('historic_user_doc', cleanDoc)
        .single();

      if (regError || !reg) {
        throw new Error("Credencial no encontrada o no registrada para este evento.");
      }

      if (!reg.attended) {
        await supabase
          .from('registrations')
          .update({ attended: true })
          .eq('id', reg.id);
      }

      const name = nameFieldId && reg.form_data[nameFieldId] ? reg.form_data[nameFieldId] : 'Invitado';
      const firstName = name.split(' ')[0];
      
      setWelcomeName(firstName);
      setStatus('success');

      setTimeout(() => {
        setStatus('waiting');
        setWelcomeName('');
        isProcessingRef.current = false; 
        if (!isCameraOpen && scannerRef.current) scannerRef.current.focus();
      }, 3000);

    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
      
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
    <div 
      className="min-h-screen w-full flex items-center justify-center overflow-hidden cursor-none m-0 p-0 fixed inset-0 z-50 bg-[#050505]"
      style={{ backgroundImage: `radial-gradient(circle at center, ${event.primary_color}20 0%, transparent 70%)` }}
    >
      <input 
        ref={scannerRef}
        type="text" 
        value={scannerInput}
        onChange={(e) => setScannerInput(e.target.value)}
        onKeyDown={handleLaserScan}
        autoFocus
        className="absolute opacity-0 -z-50" 
        autoComplete="off"
      />

      <AnimatePresence mode="wait">
        
        {/* ==================================================== */}
        {/* VISTA DE CÁMARA SIEMPRE ACTIVA EN MÓVIL/TABLET       */}
        {/* ==================================================== */}
        {isCameraOpen && (
          <motion.div 
            key="camera-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#050505] flex flex-col p-4 md:p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                <Camera className="h-6 w-6 text-primary"/> Escaneo en Progreso
              </h2>
              <button 
                onClick={() => setIsCameraOpen(false)} 
                className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-6 w-6"/>
              </button>
            </div>
            
            <div className={`w-full max-w-2xl mx-auto bg-black border-4 rounded-4xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex-1 min-h-[40vh] max-h-[50vh] relative transition-colors duration-300 ${status === 'success' ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]' : status === 'error' ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]' : 'border-white/10'}`}>
              <div id="kiosco-camera-reader" className="w-full h-full bg-black"></div>
            </div>

            <div className="w-full max-w-2xl mx-auto mt-6 h-40 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {status === 'waiting' && (
                  <motion.div 
                    key="msg-waiting"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center text-center"
                  >
                    <QrCode className="h-10 w-10 text-gray-400 mb-2 animate-pulse" />
                    <p className="text-gray-300 text-lg md:text-xl font-medium">Enfoca el código QR en la cámara</p>
                  </motion.div>
                )}

                {status === 'processing' && (
                  <motion.div 
                    key="msg-processing"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center text-center"
                  >
                    <Loader2 className="h-12 w-12 text-primary animate-spin mb-3" />
                    <p className="text-white text-xl font-bold">Verificando...</p>
                  </motion.div>
                )}

                {status === 'success' && (
                  <motion.div 
                    key="msg-success"
                    initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="w-full bg-green-500/20 border border-green-500/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg"
                  >
                    <CheckCircle2 className="h-12 w-12 text-green-400 mb-2" />
                    <h2 className="text-2xl md:text-3xl font-black text-white">¡Adelante, {welcomeName}!</h2>
                  </motion.div>
                )}

                {status === 'error' && (
                  <motion.div 
                    key="msg-error"
                    initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="w-full bg-red-600/20 border border-red-600/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg"
                  >
                    <AlertCircle className="h-10 w-10 text-red-400 mb-2" />
                    <h2 className="text-xl md:text-2xl font-black text-white mb-1">Acceso Denegado</h2>
                    <p className="text-sm md:text-base text-red-200 font-medium">{errorMsg}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ==================================================== */}
        {/* VISTAS DEL LÁSER FÍSICO (Cuando la cámara está off)  */}
        {/* ==================================================== */}
        {!isCameraOpen && status === 'waiting' && (
          <motion.div 
            key="laser-waiting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -50 }}
            className="text-center flex flex-col items-center justify-center p-6 md:p-10 w-full"
          >
            {event.logo_url ? (
              <img src={event.logo_url} alt="Logo" className="h-24 md:h-32 mb-8 md:mb-10 object-contain drop-shadow-2xl opacity-80" />
            ) : (
              <div className="h-16 md:h-20 mb-8 md:mb-10"></div>
            )}
            
            <div className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-4xl backdrop-blur-md shadow-2xl relative overflow-hidden max-w-lg w-full mx-auto flex flex-col items-center">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
              
              <QrCode className="h-24 w-24 md:h-32 md:w-32 text-gray-300 mx-auto mb-6 md:mb-8 animate-pulse" />
              <h1 className="text-3xl md:text-5xl font-black text-white mb-3 md:mb-4 tracking-tight">Check-in Automático</h1>
              <p className="text-lg md:text-2xl text-gray-400 font-medium mb-8 md:mb-12">Acerca tu credencial al lector láser</p>
              
              <button 
                onClick={() => setIsCameraOpen(true)}
                className="bg-primary hover:bg-primary/80 text-white font-bold py-4 md:py-5 px-6 md:px-10 rounded-xl md:rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-3 w-full text-base md:text-xl shadow-[0_0_30px_rgba(79,70,229,0.3)] z-10 cursor-pointer"
              >
                <Camera className="h-5 w-5 md:h-6 md:w-6" /> O Escanear con Celular
              </button>
            </div>
            
            <p className="mt-8 md:mt-12 text-gray-600 font-bold tracking-widest uppercase flex items-center justify-center gap-2 text-xs md:text-sm">
              <RefreshCw className="h-3 w-3 md:h-4 md:w-4 animate-spin"/> Sistema en Espera Automática...
            </p>
          </motion.div>
        )}

        {!isCameraOpen && status === 'processing' && (
          <motion.div 
            key="laser-processing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <Loader2 className="h-24 w-24 md:h-32 md:w-32 text-accent animate-spin mx-auto" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mt-8">Verificando Credencial...</h2>
          </motion.div>
        )}

        {!isCameraOpen && status === 'success' && (
          <motion.div 
            key="laser-success"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 bg-green-500 z-100 flex flex-col items-center justify-center p-6 md:p-10"
          >
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="text-center">
              <CheckCircle2 className="h-32 w-32 md:h-48 md:w-48 text-white mx-auto mb-6 md:mb-8 drop-shadow-lg" />
              <h1 className="text-4xl md:text-7xl font-black text-white tracking-tight drop-shadow-md mb-4 leading-tight">
                ¡Bienvenido,<br className="md:hidden"/> {welcomeName}!
              </h1>
              <p className="text-xl md:text-3xl text-green-100 font-bold bg-black/20 inline-block px-6 py-3 md:px-8 md:py-4 rounded-full mt-4">Acceso Autorizado</p>
            </motion.div>
          </motion.div>
        )}

        {!isCameraOpen && status === 'error' && (
          <motion.div 
            key="laser-error"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-red-600 z-100 flex flex-col items-center justify-center p-6 md:p-10 text-center"
          >
            <AlertCircle className="h-32 w-32 md:h-40 md:w-40 text-white mx-auto mb-6 md:mb-8 drop-shadow-lg" />
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-md mb-4 md:mb-6">Acceso Denegado</h1>
            <p className="text-lg md:text-2xl text-red-100 font-bold max-w-2xl mx-auto bg-black/20 p-4 md:p-6 rounded-2xl">{errorMsg}</p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}