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

  // CORRECCIÓN DEL ERROR DE LA CÁMARA (El setTimeout asegura que el div ya exista en el DOM)
  useEffect(() => {
    if (!isCameraOpen) return;
    
    let scanner: any = null;

    const initScanner = async () => {
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      
      setTimeout(() => {
        const element = document.getElementById("auto-checkin-qr");
        if (element) {
          scanner = new Html5QrcodeScanner(
            "auto-checkin-qr",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          );
          
          scanner.render(
            (decodedText: string) => {
              scanner.clear();
              setIsCameraOpen(false);
              processDoc(decodedText);
            },
            (error: any) => {
              // Silenciar errores de frames vacíos
            }
          );
        }
      }, 300); // 300ms es suficiente para que Framer Motion termine de animar
    };

    initScanner();

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
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
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6"
          >
            <button 
              onClick={() => setIsCameraOpen(false)} 
              className="absolute top-8 right-8 text-white bg-white/10 hover:bg-white/20 p-4 rounded-full transition-colors cursor-pointer"
              style={{ cursor: 'pointer' }}
            >
              <X className="h-8 w-8"/>
            </button>
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
              <Camera className="h-8 w-8 text-primary"/> Apunta el Código QR
            </h2>
            <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl">
              <div id="auto-checkin-qr" className="w-full"></div>
            </div>
          </motion.div>
        )}

        {status === 'waiting' && !isCameraOpen && (
          <motion.div 
            key="waiting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -50 }}
            className="text-center flex flex-col items-center justify-center p-10 w-full"
          >
            {event.logo_url ? (
              <img src={event.logo_url} alt="Logo" className="h-32 mb-10 object-contain drop-shadow-2xl opacity-80" />
            ) : (
              <div className="h-20 mb-10"></div>
            )}
            
            <div className="bg-white/5 border border-white/10 p-12 rounded-[3rem] backdrop-blur-md shadow-2xl relative overflow-hidden max-w-lg w-full mx-auto flex flex-col items-center">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
              
              <QrCode className="h-32 w-32 text-gray-300 mx-auto mb-8 animate-pulse" />
              <h1 className="text-5xl font-black text-white mb-4 tracking-tight">Check-in Automático</h1>
              <p className="text-2xl text-gray-400 font-medium mb-12">Acerca tu credencial al lector láser</p>
              
              <button 
                onClick={() => setIsCameraOpen(true)}
                style={{ cursor: 'pointer' }}
                className="bg-primary hover:bg-primary/80 text-white font-bold py-5 px-10 rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-3 w-full text-xl shadow-[0_0_30px_rgba(79,70,229,0.3)] z-10"
              >
                <Camera className="h-6 w-6" /> O Escanear con Tablet / Celular
              </button>
            </div>
            
            <p className="mt-12 text-gray-600 font-bold tracking-widest uppercase flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin"/> Sistema en Espera Automática...
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
            <Loader2 className="h-32 w-32 text-accent animate-spin mx-auto" />
            <h2 className="text-3xl font-bold text-white mt-8">Verificando Credencial...</h2>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 bg-green-500 z-50 flex flex-col items-center justify-center p-10"
          >
            <motion.div 
              initial={{ y: 50 }} animate={{ y: 0 }} 
              className="text-center"
            >
              <CheckCircle2 className="h-48 w-48 text-white mx-auto mb-8 drop-shadow-lg" />
              <h1 className="text-7xl font-black text-white tracking-tight drop-shadow-md mb-4">
                ¡Bienvenido, {welcomeName}!
              </h1>
              <p className="text-3xl text-green-100 font-bold bg-black/20 inline-block px-8 py-4 rounded-full">
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
            className="fixed inset-0 bg-red-600 z-50 flex flex-col items-center justify-center p-10 text-center"
          >
            <AlertCircle className="h-40 w-40 text-white mx-auto mb-8 drop-shadow-lg" />
            <h1 className="text-6xl font-black text-white tracking-tight drop-shadow-md mb-6">
              Acceso Denegado
            </h1>
            <p className="text-2xl text-red-100 font-bold max-w-2xl mx-auto bg-black/20 p-6 rounded-2xl">
              {errorMsg}
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}