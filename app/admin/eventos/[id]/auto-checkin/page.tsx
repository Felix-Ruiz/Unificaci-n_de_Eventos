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
  
  // ESTADOS DEL ESCÁNER FÍSICO (Láser)
  const [scannerInput, setScannerInput] = useState('');
  const scannerRef = useRef<HTMLInputElement>(null);
  
  // REFS MAESTROS
  const isProcessingRef = useRef(false); 
  const scannerInstanceRef = useRef<any>(null);

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

  // Mantiene el foco en el láser físico si la cámara no está abierta
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (scannerRef.current && status === 'waiting' && !isCameraOpen) {
        scannerRef.current.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, [status, isCameraOpen]);

  // ==========================================
  // MOTOR DE CÁMARA (NUEVA ARQUITECTURA ANTI-CONGELAMIENTO)
  // ==========================================
  useEffect(() => {
    if (!isCameraOpen) return;
    
    let isMounted = true;

    // Usamos un pequeño retraso para asegurar que el div exista después de la animación
    const timer = setTimeout(async () => {
      if (!isMounted) return;

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const html5QrCode = new Html5Qrcode("auto-checkin-qr");
        scannerInstanceRef.current = html5QrCode;
        
        html5QrCode.start(
          { facingMode: "environment" }, 
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            const cleanDoc = decodedText.trim();
            
            // 1. Si ya estamos procesando, ignoramos más lecturas
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;

            // 2. APAGAMOS LA CÁMARA INMEDIATAMENTE para destruir la imagen y liberar la memoria
            if (scannerInstanceRef.current) {
              scannerInstanceRef.current.stop().then(() => {
                scannerInstanceRef.current.clear();
                scannerInstanceRef.current = null;
                setIsCameraOpen(false); // Oculta el componente visual de la cámara
                
                // 3. Pasamos al procesamiento (indicando que viene de la cámara)
                processDoc(cleanDoc, true);
              }).catch((err: any) => {
                console.error(err);
                setIsCameraOpen(false);
                processDoc(cleanDoc, true);
              });
            }
          },
          (errorMessage: string) => {
            // Silencia errores cuando no detecta un QR en el fotograma actual
          }
        ).catch((err: any) => {
          console.error("Error iniciando cámara", err);
          alert("No se pudo iniciar la cámara. Verifica los permisos del navegador.");
          setIsCameraOpen(false);
        });
      } catch (e) {
        console.error(e);
      }
    }, 300); 

    // Limpieza al cerrar la cámara con la X (Desmontaje)
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerInstanceRef.current && scannerInstanceRef.current.isScanning) {
        scannerInstanceRef.current.stop().then(() => {
          scannerInstanceRef.current.clear();
        }).catch(console.error);
      }
    };
  }, [isCameraOpen]);

  // Función principal de procesamiento de asistencia
  const processDoc = async (cleanDoc: string, isFromCamera: boolean = false) => {
    if (!cleanDoc) {
      isProcessingRef.current = false;
      return;
    }
    
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

      // Después de 3 segundos, quitamos la pantalla verde
      setTimeout(() => {
        setStatus('waiting');
        setWelcomeName('');
        isProcessingRef.current = false; // Liberamos el sistema
        
        // ¡LA MAGIA AQUÍ! Si el escaneo vino de la cámara, la VOLVEMOS A ENCENDER SOLA
        if (isFromCamera) {
          setIsCameraOpen(true);
        } else if (scannerRef.current) {
          scannerRef.current.focus();
        }
      }, 3000);

    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
      
      // Esperamos 4 segundos para que lean el error
      setTimeout(() => {
        setStatus('waiting');
        setErrorMsg('');
        isProcessingRef.current = false; // Liberamos el sistema
        
        // VOLVEMOS A ENCENDER LA CÁMARA SOLA INCLUSO SI HUBO ERROR
        if (isFromCamera) {
          setIsCameraOpen(true);
        } else if (scannerRef.current) {
          scannerRef.current.focus();
        }
      }, 4000);
    }
  };

  // Manejo del Escáner Láser Físico (Pistola USB)
  const handleLaserScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const doc = scannerInput.trim();
      setScannerInput(''); 
      
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      
      // false = no vino de la cámara
      await processDoc(doc, false);
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
      className="min-h-screen w-full flex items-center justify-center overflow-hidden cursor-none m-0 p-0 absolute inset-0 z-50"
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
        
        {/* VISTA DE LA CÁMARA */}
        {isCameraOpen && (
          <motion.div 
            key="camera-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center p-4 md:p-6"
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
            
            <div className="w-full max-w-lg bg-black border-2 border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center min-h-75 md:min-h-100">
              <div id="auto-checkin-qr" className="w-full h-full object-cover flex items-center justify-center bg-black">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </div>
            </div>
            <p className="text-gray-400 mt-6 text-center text-sm md:text-base">
              La cámara está lista. Escanea el código del asistente..
            </p>
          </motion.div>
        )}

        {/* VISTA DE ESPERA */}
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

        {/* PANTALLA DE PROCESAMIENTO */}
        {status === 'processing' && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <Loader2 className="h-24 w-24 md:h-32 md:w-32 text-accent animate-spin mx-auto" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mt-8">Verificando Credencial...</h2>
          </motion.div>
        )}

        {/* PANTALLA DE ÉXITO */}
        {status === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 bg-green-500 z-100 flex flex-col items-center justify-center p-6 md:p-10"
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

        {/* PANTALLA DE ERROR */}
        {status === 'error' && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-red-600 z-100 flex flex-col items-center justify-center p-6 md:p-10 text-center"
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