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
  
  const [scannerInput, setScannerInput] = useState('');
  const scannerRef = useRef<HTMLInputElement>(null);

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

  // CÁMARA MEJORADA USANDO LA VERSIÓN "CORE" (Sin cuadros blancos)
  useEffect(() => {
    if (!isCameraOpen) return;
    
    let html5QrCode: any = null;

    const initScanner = async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      // Damos 400ms para que Framer Motion termine de animar la ventana modal
      setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode("auto-checkin-qr");
          
          html5QrCode.start(
            { facingMode: "environment" }, // Fuerza el uso de la cámara trasera si es un celular
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText: string) => {
              // Éxito al escanear
              if (html5QrCode) {
                html5QrCode.stop().then(() => {
                  setIsCameraOpen(false);
                  processDoc(decodedText);
                }).catch(console.error);
              }
            },
            (errorMessage: string) => {
              // Silenciar alertas de lectura vacía
            }
          ).catch((err: any) => {
            console.error("Error iniciando cámara", err);
            alert("No se pudo iniciar la cámara. Verifica los permisos del navegador.");
            setIsCameraOpen(false);
          });
        } catch (e) {
          console.error(e);
        }
      }, 400);
    };

    initScanner();

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isCameraOpen]);

  const processDoc = async (doc: string) => {
    const cleanDoc = doc.trim();
    if (!cleanDoc) return;
    
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
        if (scannerRef.current) scannerRef.current.focus();
      }, 3000);

    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
      
      setTimeout(() => {
        setStatus('waiting');
        setErrorMsg('');
        if (scannerRef.current) scannerRef.current.focus();
      }, 4000);
    }
  };

  const handleLaserScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const doc = scannerInput;
      setScannerInput(''); 
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
      className="min-h-screen w-full flex items-center justify-center overflow-hidden relative cursor-none m-0 p-0 inset-0 z-50"
      style={{ 
        backgroundColor: '#050505',
        backgroundImage: `radial-gradient(circle at center, ${event.primary_color}20 0%, transparent 70%)` 
      }}
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
        
        {isCameraOpen && (
          <motion.div 
            key="camera-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 md:p-6"
          >
            <button 
              onClick={() => setIsCameraOpen(false)} 
              className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors cursor-pointer z-50"
              style={{ cursor: 'pointer' }}
            >
              <X className="h-8 w-8"/>
            </button>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8 flex items-center gap-3">
              <Camera className="h-6 w-6 md:h-8 md:w-8 text-primary"/> Apunta el Código QR
            </h2>
            
            {/* CONTENEDOR DE LA CÁMARA ARREGLADO */}
            <div className="w-full max-w-lg bg-black border-2 border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center min-h-75 md:min-h-100">
              <div id="auto-checkin-qr" className="w-full h-full object-cover flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </div>
            </div>
            <p className="text-gray-400 mt-6 text-center text-sm md:text-base">Acerca la credencial al recuadro para leer el código.</p>
          </motion.div>
        )}

        {status === 'waiting' && !isCameraOpen && (
          <motion.div 
            key="waiting"
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
            
            <div className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-4xl md:rounded-[3rem] backdrop-blur-md shadow-2xl relative overflow-hidden max-w-lg w-full mx-auto flex flex-col items-center">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
              
              <QrCode className="h-24 w-24 md:h-32 md:w-32 text-gray-300 mx-auto mb-6 md:mb-8 animate-pulse" />
              <h1 className="text-3xl md:text-5xl font-black text-white mb-3 md:mb-4 tracking-tight">Check-in Automático</h1>
              <p className="text-lg md:text-2xl text-gray-400 font-medium mb-8 md:mb-12">Acerca tu credencial al lector láser</p>
              
              <button 
                onClick={() => setIsCameraOpen(true)}
                style={{ cursor: 'pointer' }}
                className="bg-primary hover:bg-primary/80 text-white font-bold py-4 md:py-5 px-6 md:px-10 rounded-xl md:rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-3 w-full text-base md:text-xl shadow-[0_0_30px_rgba(79,70,229,0.3)] z-10"
              >
                <Camera className="h-5 w-5 md:h-6 md:w-6" /> O Escanear con Celular
              </button>
            </div>
            
            <p className="mt-8 md:mt-12 text-gray-600 font-bold tracking-widest uppercase flex items-center justify-center gap-2 text-xs md:text-sm">
              <RefreshCw className="h-3 w-3 md:h-4 md:w-4 animate-spin"/> Sistema en Espera Automática...
            </p>
          </motion.div>
        )}

        {status === 'processing' && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <Loader2 className="h-24 w-24 md:h-32 md:w-32 text-accent animate-spin mx-auto" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mt-8">Verificando Credencial...</h2>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 bg-green-500 z-50 flex flex-col items-center justify-center p-6 md:p-10"
          >
            <motion.div 
              initial={{ y: 50 }} animate={{ y: 0 }} 
              className="text-center"
            >
              <CheckCircle2 className="h-32 w-32 md:h-48 md:w-48 text-white mx-auto mb-6 md:mb-8 drop-shadow-lg" />
              <h1 className="text-4xl md:text-7xl font-black text-white tracking-tight drop-shadow-md mb-4 leading-tight">
                ¡Bienvenido,<br className="md:hidden"/> {welcomeName}!
              </h1>
              <p className="text-xl md:text-3xl text-green-100 font-bold bg-black/20 inline-block px-6 py-3 md:px-8 md:py-4 rounded-full mt-4">
                Acceso Autorizado
              </p>
            </motion.div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-red-600 z-50 flex flex-col items-center justify-center p-6 md:p-10 text-center"
          >
            <AlertCircle className="h-32 w-32 md:h-40 md:w-40 text-white mx-auto mb-6 md:mb-8 drop-shadow-lg" />
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-md mb-4 md:mb-6">
              Acceso Denegado
            </h1>
            <p className="text-lg md:text-2xl text-red-100 font-bold max-w-2xl mx-auto bg-black/20 p-4 md:p-6 rounded-2xl">
              {errorMsg}
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}