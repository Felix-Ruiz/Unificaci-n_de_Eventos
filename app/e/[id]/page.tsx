"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, CheckCircle2, AlertCircle, UserCheck, Sparkles, 
  Lock, Clock, Users, CalendarDays, ShieldCheck, Info, X, 
  FileText, ExternalLink, Smartphone, Globe, Upload, Check
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '../../../context/LanguageContext';

import Footer from '../../../components/Footer';

const publicTranslations: Record<string, Record<string, string>> = {
  es: {
    btnSubmit: "Confirmar Inscripción",
    btnProcessing: "Procesando...",
    welcomeBackTitle: "¡Bienvenido de vuelta!",
    welcomeBackDesc: "Hemos autocompletado tu información basándonos en tu historial. Verifica que todo esté correcto antes de continuar.",
    optSelect: "Selecciona una opción...",
    optOtherLabel: "Específica tu respuesta...",
    optOtherWhich: "Específica cuáles otras...",
    checkHabeasData1: "He leído y acepto las ",
    checkHabeasData2: "Condiciones de Registro",
    checkHabeasData3: " de ACOFI.",
    checkHabeasReq: "Requerido para procesar tu inscripción y emitir credenciales.",
    secCheck: "Verificación de Seguridad",
    successTitle: "¡Inscripción Exitosa!",
    successDesc: "Tu registro ha sido confirmado.",
    btnAnother: "Realizar otro registro",
    kioskNext: "Preparando para el siguiente asistente...",
    reqError: "Por favor, marca la casilla de seguridad Cloudflare (No soy un robot) antes de continuar.",
    policyError: "Debes leer y marcar la casilla aceptando las Condiciones de Registro para continuar.",
    fileInstruction: "Haz clic o arrastra para subir un archivo",
    fileFormats: "PDF, Word, PNG, JPG (Max. 1MB)",
    fileSuccess: "Archivo adjuntado correctamente",
    fileUploading: "Subiendo archivo...",
    fileRemove: "Eliminar y cambiar",
    fileErrorSize: "El archivo supera el peso máximo de 1MB.",
    fileErrorUpload: "Hubo un problema al subir el archivo a nuestro servidor.",
    placeholderText: "Escribe tu respuesta aquí...",
    placeholderNum: "Ingresa tu número..."
  },
  en: {
    btnSubmit: "Confirm Registration",
    btnProcessing: "Processing...",
    welcomeBackTitle: "Welcome back!",
    welcomeBackDesc: "We have auto-filled your information based on your history. Please verify that everything is correct before continuing.",
    optSelect: "Select an option...",
    optOtherLabel: "Specify your answer...",
    optOtherWhich: "Specify which others...",
    checkHabeasData1: "I have read and accept the ",
    checkHabeasData2: "Registration Conditions",
    checkHabeasData3: " of ACOFI.",
    checkHabeasReq: "Required to process your registration and issue credentials.",
    secCheck: "Security Verification",
    successTitle: "Registration Successful!",
    successDesc: "Your registration has been confirmed.",
    btnAnother: "Register another person",
    kioskNext: "Preparing for the next attendee...",
    reqError: "Please check the Cloudflare security box (I am not a robot) before continuing.",
    policyError: "You must read and check the box accepting the Registration Conditions to continue.",
    fileInstruction: "Click or drag to upload a file",
    fileFormats: "PDF, Word, PNG, JPG (Max. 1MB)",
    fileSuccess: "File attached successfully",
    fileUploading: "Uploading file...",
    fileRemove: "Remove and change",
    fileErrorSize: "The file exceeds the maximum limit of 1MB.",
    fileErrorUpload: "There was a problem uploading the file to our server.",
    placeholderText: "Type your answer here...",
    placeholderNum: "Enter your number..."
  }
};

export default function FormularioPublico() {
  const params = useParams();
  const router = useRouter();
  const eventIdOrSlug = params?.id as string;

  const { language, setLanguage } = useLanguage();
  const t = publicTranslations[language];

  const [loadingInit, setLoadingInit] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [status, setStatus] = useState<'open' | 'paused' | 'full' | 'expired' | 'locked_device'>('open');
  
  const [isLockedByPassword, setIsLockedByPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});

  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  
  const [acceptHabeas, setAcceptHabeas] = useState(false);
  const [showHabeasModal, setShowHabeasModal] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [userFound, setUserFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [clientIp, setClientIp] = useState('');

  const [toast, setToast] = useState<{ title: string; desc: string; type: 'error' | 'info' | 'success' } | null>(null);

  const showToast = (title: string, desc: string, type: 'error' | 'info' | 'success' = 'error') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 5000);
  };

  const isKiosk = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('kiosk') === 'true';

  useEffect(() => {
    if (!loadingInit && status === 'open' && !isLockedByPassword && !isKiosk && event?.turnstile_enabled && turnstileRef.current) {
      const renderTurnstile = () => {
        if ((window as any).turnstile) {
          try {
            (window as any).turnstile.render(turnstileRef.current, {
              sitekey: '1x00000000000000000000AA', 
              callback: (token: string) => setTurnstileToken(token),
              theme: 'auto'
            });
          } catch (e) {
            console.error("Error renderizando Turnstile:", e);
          }
        }
      };

      if (!(window as any).turnstile) {
        const script = document.createElement('script');
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = renderTurnstile;
        document.head.appendChild(script);
      } else {
        renderTurnstile();
      }
    }
  }, [loadingInit, status, isLockedByPassword, isKiosk, event]);

  useEffect(() => {
    if (!eventIdOrSlug) return;

    async function loadEvent() {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventIdOrSlug);
        let query = supabase.from('events').select('*');
        if (isUUID) {
          query = query.eq('id', eventIdOrSlug);
        } else {
          query = query.eq('slug', eventIdOrSlug);
        }

        const { data: eventData, error: eventError } = await query.single();
          
        if (eventError || eventData.is_deleted) {
          throw new Error("Evento no encontrado");
        }
        
        setEvent(eventData);

        let detectedIp = '';
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipResponse.json();
          detectedIp = ipData.ip;
          setClientIp(detectedIp);
        } catch (ipErr) {
          console.error("Error resolviendo IP:", ipErr);
        }

        if (eventData.one_per_device && !isKiosk && detectedIp) {
          const { data: ipCheck } = await supabase
            .from('registrations')
            .select('id')
            .eq('event_id', eventData.id)
            .eq('ip_address', detectedIp)
            .limit(1);

          if (ipCheck && ipCheck.length > 0) {
            setStatus('locked_device');
            setLoadingInit(false);
            return;
          }
        }

        if (eventData.form_password) {
          setIsLockedByPassword(true);
        }

        const { count } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventData.id);
        
        const isFull = eventData.max_capacity && count && count >= eventData.max_capacity;
        const isExpired = eventData.close_date && new Date() > new Date(eventData.close_date);

        if (!eventData.is_active) {
          setStatus('paused');
        } else if (isFull) {
          setStatus('full');
        } else if (isExpired) {
          setStatus('expired');
        }

        const { data: fieldsData } = await supabase
          .from('event_fields')
          .select('*')
          .eq('event_id', eventData.id)
          .order('order_index', { ascending: true });
          
        const preParsedFields = (fieldsData || []).map(f => {
          let parsed = {};
          try { parsed = JSON.parse(f.options || '{}'); } catch(e) {}
          return { ...f, preParsedOptions: parsed };
        });

        setFields(preParsedFields);
        
      } catch (error) {
        setEvent(null);
      } finally {
        setLoadingInit(false);
      }
    }
    
    loadEvent();
  }, [eventIdOrSlug]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === event.form_password) {
      setIsLockedByPassword(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  const handleFieldChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCheckboxGroupChange = (fieldId: string, option: string, isChecked: boolean) => {
    setFormData(prev => {
      const currentVal = prev[fieldId] || '';
      let arr = currentVal ? currentVal.split(', ') : [];
      if (isChecked) {
        if (!arr.includes(option)) arr.push(option);
      } else {
        arr = arr.filter(o => o !== option);
      }
      return { ...prev, [fieldId]: arr.join(', ') };
    });
  };

  const handleVerifyDocument = async (documento: string) => {
    if (!documento.trim()) return;
    setIsVerifying(true);
    try {
      const { data } = await supabase
        .from('historic_users')
        .select('*')
        .eq('documento_identidad', documento.trim())
        .single();
        
      if (data) {
        setUserFound(true);
        let prefilledData: Record<string, string> = {};
        
        fields.forEach(f => {
          const parsedOpts = f.preParsedOptions || {};
          const sk = parsedOpts.system_key || '';
          const fn = (f.field_name || '').toLowerCase();
          
          if (sk === 'email' || (fn.includes('correo') && !fn.includes('confirm'))) prefilledData[f.id] = data.email || '';
          if (sk === 'email_conf' || fn.includes('confirmar correo')) prefilledData[f.id] = data.email || '';
          if (sk === 'nombre') prefilledData[f.id] = data.nombre || '';
          if (sk === 'apellido') prefilledData[f.id] = data.apellido || '';
          if (!sk && fn.includes('nombre') && !fn.includes('apellido')) prefilledData[f.id] = `${data.nombre || ''} ${data.apellido || ''}`.trim();
          if (sk === 'institucion' || fn.includes('institución') || fn.includes('institucion')) prefilledData[f.id] = data.institucion || '';
          if (sk === 'cargo' || fn.includes('cargo')) prefilledData[f.id] = data.cargo || '';
          if (sk === 'pais' || fn.includes('país') || fn.includes('pais')) prefilledData[f.id] = data.pais || '';
          if (sk === 'ciudad' || fn.includes('ciudad')) prefilledData[f.id] = data.ciudad || '';
          if (sk === 'telefono' || fn.includes('teléfono') || fn.includes('telefono')) prefilledData[f.id] = data.telefono || '';
          if (sk === 'genero' || fn.includes('género') || fn.includes('genero')) prefilledData[f.id] = data.genero || '';
          if (sk === 'direccion' || fn.includes('dirección') || fn.includes('direccion')) prefilledData[f.id] = data.direccion || '';
        });
        setFormData(prev => ({ ...prev, ...prefilledData }));
      } else {
        setUserFound(false);
      }
    } catch { 
      setUserFound(false); 
    } finally { 
      setIsVerifying(false); 
    }
  };

  const shouldShowField = (field: any) => {
    const parsed = field.preParsedOptions || {};
    if (!parsed.logic || !parsed.logic.dependsOnId) return true;
    
    const parentField = fields.find(f => f.id === parsed.logic.dependsOnId);
    const action = parsed.logic.action || 'show';
    
    if (!parentField) {
      return action === 'hide';
    }
    
    const parentVal = formData[parentField.id] || '';
    
    if (!parentVal) {
      return action === 'hide';
    }
    
    const isMatch = parentField.field_type === 'checkbox-group' 
      ? parentVal.split(', ').includes(parsed.logic.dependsOnValue)
      : parentVal === parsed.logic.dependsOnValue;
      
    if (action === 'hide') return !isMatch;
    if (action === 'show') return isMatch;
    return true;
  };

  const isFieldRequired = (field: any) => {
    if (field.is_required) return true; 
    const parsed = field.preParsedOptions || {};
    if (parsed.logic && parsed.logic.action === 'require' && parsed.logic.dependsOnId) {
      const parentField = fields.find(f => f.id === parsed.logic.dependsOnId);
      const parentVal = formData[parsed.logic.dependsOnId] || '';
      if (parentField?.field_type === 'checkbox-group') {
        return parentVal.split(', ').includes(parsed.logic.dependsOnValue);
      } else {
        return parentVal === parsed.logic.dependsOnValue;
      }
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (honeypot) { 
      setSuccess(true); 
      return; 
    }

    if (event?.turnstile_enabled && !turnstileToken && !isKiosk) {
      showToast('Error', t.reqError, 'error');
      return;
    }

    if (event.require_habeas_data && !acceptHabeas) {
      showToast('Error', t.policyError, 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let nombre = '', apellido = '', email = '', emailConf = '', institucion = '', cargo = '', pais = '', ciudad = '', documento = '', telefono = '', genero = '', direccion = '';
      const finalFormData = { ...formData };
      
      fields.forEach(f => {
        if (!shouldShowField(f)) {
          delete finalFormData[f.id];
          delete finalFormData[`${f.id}_otra`];
          return;
        }

        const parsedOpts = f.preParsedOptions || {};
        const sk = parsedOpts.system_key || '';
        const fn = (f.field_name || '').toLowerCase();
        const val = formData[f.id] || '';
        
        if (['select', 'radio'].includes(f.field_type) && val === 'Otra' && formData[`${f.id}_otra`]) {
          finalFormData[f.id] = formData[`${f.id}_otra`];
        } else if (f.field_type === 'checkbox-group' && val.includes('Otra') && formData[`${f.id}_otra`]) {
          let arr = val.split(', ');
          arr = arr.map(v => v === 'Otra' ? formData[`${f.id}_otra`] : v);
          finalFormData[f.id] = arr.join(', ');
        }
        
        const finalVal = finalFormData[f.id] || val;
        
        if (sk === 'documento_identidad' || (fn.includes('documento') && !fn.includes('tipo'))) documento = finalVal;
        if (sk === 'nombre') nombre = finalVal;
        if (sk === 'apellido') apellido = finalVal;
        if (!sk && fn.includes('nombre') && !fn.includes('apellido')) { 
          const parts = finalVal.split(' '); 
          nombre = parts[0] || ''; 
          apellido = parts.slice(1).join(' ') || ''; 
        }
        if (sk === 'email' || (fn.includes('correo') && !fn.includes('confirm'))) email = finalVal;
        if (sk === 'email_conf' || fn.includes('confirmar correo')) emailConf = finalVal;
        if (sk === 'institucion' || fn.includes('institución') || fn.includes('institucion')) institucion = finalVal;
        if (sk === 'cargo' || fn.includes('cargo')) cargo = finalVal;
        if (sk === 'pais' || fn.includes('país') || fn.includes('pais')) pais = finalVal;
        if (sk === 'ciudad' || fn.includes('ciudad')) ciudad = finalVal;
        if (sk === 'telefono' || fn.includes('teléfono') || fn.includes('telefono')) telefono = finalVal;
        if (sk === 'genero' || fn.includes('género') || fn.includes('genero')) genero = finalVal;
        if (sk === 'direccion' || fn.includes('dirección') || fn.includes('direccion')) direccion = finalVal;
      });

      if (email && emailConf && email.trim().toLowerCase() !== emailConf.trim().toLowerCase()) {
        showToast('Error', language === 'es' ? 'Los correos no coinciden.' : 'Emails do not match.', 'error');
        setIsSubmitting(false);
        return;
      }

      if (documento) {
        const { data: existingReg } = await supabase
          .from('registrations')
          .select('id')
          .eq('event_id', event.id)
          .eq('historic_user_doc', documento)
          .limit(1);

        if (existingReg && existingReg.length > 0) {
          showToast('Error', language === 'es' ? 'Registro Duplicado.' : 'Duplicate Record.', 'error');
          setIsSubmitting(false);
          return;
        }
      }

      await supabase
        .from('historic_users')
        .upsert({ 
          documento_identidad: documento, 
          email, 
          nombre: nombre || 'Sin Nombre', 
          apellido, 
          institucion, 
          cargo, 
          pais, 
          ciudad,
          telefono,
          genero,
          direccion 
        }, { onConflict: 'documento_identidad' });

      await supabase
        .from('registrations')
        .insert([{ 
          event_id: event.id,
          historic_user_doc: documento, 
          form_data: finalFormData,
          ip_address: clientIp || null 
        }]);

      if (email && event.send_notifications) {
        try {
          await fetch('/api/send-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              nombre: `${nombre} ${apellido}`.trim(),
              eventName: event.name,
              documento: documento,
              institucion: institucion || 'No especificada',
              creatorEmail: event.creator_email,
              emailSubject: event.email_subject,
              emailBody: event.email_body,
              lang: language
            })
          });
        } catch (emailErr) {
          console.error("Error enviando correo:", emailErr);
        }
      }

      if (event.one_per_device && !isKiosk) {
        navigator.cookieEnabled ? localStorage.setItem(`acofi_reg_${event.id}`, 'true') : null;
      }

      if (event.thank_you_enabled && event.thank_you_url && !isKiosk) {
        setTimeout(() => {
          window.location.href = event.thank_you_url;
        }, 1200);
        return;
      }

      setSuccess(true);
      
    } catch (error: any) { 
      showToast('Error', 'Error en el servidor. Intenta de nuevo.', 'error');
    } finally { 
      setIsSubmitting(false); 
      if (event?.turnstile_enabled && (window as any).turnstile && turnstileRef.current) {
        (window as any).turnstile.reset(turnstileRef.current);
        setTurnstileToken('');
      }
    }
  };

  if (loadingInit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <AlertCircle className="h-16 w-16 text-red-500" />
      </div>
    );
  }

  const primaryCode = event.primary_color || '#4f46e5';
  const accentCode = event.accent_color || '#0ea5e9';
  const backgroundCode = event.bg_color || '#0f172a';

  const DynamicStyleBlock = () => (
    <style dangerouslySetInnerHTML={{__html: `
      #acofi-form-wrapper .bg-primary { background-color: ${primaryCode} !important; }
      #acofi-form-wrapper .text-primary { color: ${primaryCode} !important; }
      #acofi-form-wrapper .border-primary { border-color: ${primaryCode} !important; }
      #acofi-form-wrapper .bg-accent { background-color: ${accentCode} !important; }
      #acofi-form-wrapper .text-accent { color: ${accentCode} !important; }
      #acofi-form-wrapper .border-accent { border-color: ${accentCode} !important; }
      #acofi-form-wrapper .hover\\:bg-primary\\/90:hover { background-color: ${primaryCode}E6 !important; }
      #acofi-form-wrapper .focus\\:border-primary:focus { border-color: ${primaryCode} !important; }
      #acofi-form-wrapper .focus\\:ring-primary:focus { --tw-ring-color: ${primaryCode} !important; box-shadow: 0 0 0 1px ${primaryCode} !important; }
      #acofi-form-wrapper .focus\\:border-accent:focus { border-color: ${accentCode} !important; }
      #acofi-form-wrapper .focus\\:ring-accent:focus { --tw-ring-color: ${accentCode} !important; box-shadow: 0 0 0 1px ${accentCode} !important; }
      #acofi-form-wrapper .from-primary { --tw-gradient-from: ${primaryCode} !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important; }
      #acofi-form-wrapper .to-accent { --tw-gradient-to: ${accentCode} !important; }
      #acofi-form-wrapper .via-accent { --tw-gradient-stops: var(--tw-gradient-from), ${accentCode}, var(--tw-gradient-to) !important; }
      #acofi-form-wrapper .accent-primary { accent-color: ${primaryCode} !important; }
      #acofi-form-wrapper .checked\\:bg-accent:checked { background-color: ${accentCode} !important; border-color: ${accentCode} !important; }
      #acofi-form-wrapper .checked\\:bg-primary:checked { background-color: ${primaryCode} !important; border-color: ${primaryCode} !important; }
      
      /* Estilos para el texto enriquecido de la descripción */
      .event-description-html a { color: ${accentCode}; text-decoration: underline; font-weight: bold; }
      .event-description-html a:hover { color: ${primaryCode}; }
      .event-description-html h1 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; }
      .event-description-html h2 { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; }
      .event-description-html h3 { font-size: 1.125rem; font-weight: bold; margin-bottom: 0.5rem; }
      .event-description-html p { margin-bottom: 0.5rem; }
    `}} />
  );

  if (isLockedByPassword) {
    return (
      <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: backgroundCode }}>
        <DynamicStyleBlock />
        <div id="acofi-form-wrapper" className="flex-1 flex items-center justify-center p-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[150px] rounded-full pointer-events-none"></div>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/95 dark:bg-surface/80 backdrop-blur-2xl border border-gray-200 dark:border-white/10 p-10 rounded-4xl max-w-sm w-full text-center shadow-2xl relative z-10">
            <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/30">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{language === 'es' ? 'Formulario Protegido' : 'Protected Form'}</h2>
            
            <form onSubmit={handlePasswordSubmit}>
              <input 
                type="password" 
                value={passwordInput} 
                onChange={e => setPasswordInput(e.target.value)} 
                className={`w-full bg-white dark:bg-black/50 border ${passwordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-xl py-3.5 px-4 text-center text-gray-900 dark:text-white focus:outline-none focus:border-primary transition-colors mb-4`} 
              />
              <button type="submit" className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-4d-static active:translate-y-1 transition-transform cursor-pointer">
                {language === 'es' ? 'Desbloquear' : 'Unlock'}
              </button>
            </form>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  if (status !== 'open') {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: backgroundCode }}>
        <DynamicStyleBlock />
        <div id="acofi-form-wrapper" className="flex-1 flex items-center justify-center p-4 relative">
          <div className="bg-white/95 dark:bg-surface/50 backdrop-blur-xl border border-gray-200 dark:border-white/5 p-10 rounded-3xl max-w-md w-full text-center shadow-2xl relative z-10">
            <Lock className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
               {language === 'es' ? 'No disponible' : 'Not available'}
            </h2>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: backgroundCode }}>
        <DynamicStyleBlock />
        <div id="acofi-form-wrapper" className="flex-1 flex items-center justify-center p-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-green-500/10 blur-[150px] rounded-full pointer-events-none"></div>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white/95 dark:bg-surface/80 backdrop-blur-2xl border border-gray-200 dark:border-white/10 p-12 rounded-4xl max-w-md w-full text-center shadow-2xl relative z-10"
          >
            <CheckCircle2 className="h-20 w-20 text-green-500 dark:text-green-400 mx-auto mb-4 relative z-10" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{t.successTitle}</h2>
            
            {event.thank_you_enabled && event.thank_you_text && (
                <p className="text-gray-700 dark:text-gray-300 mb-8 text-md font-bold bg-gray-100 dark:bg-black/30 p-4 rounded-xl border border-gray-200 dark:border-gray-800 leading-relaxed">
                  {event.thank_you_text}
                </p>
            )}
            
            {!event.thank_you_enabled && (
               <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                  {t.successDesc}
               </p>
            )}
            
            {isKiosk ? (
              <p className="text-primary text-sm font-bold animate-pulse">
                {t.kioskNext}
              </p>
            ) : !event.one_per_device ? (
              <button 
                onClick={() => window.location.reload()} 
                className="text-primary hover:text-accent font-medium transition-colors cursor-pointer"
              >
                {t.btnAnother}
              </button>
            ) : null}
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: backgroundCode }}>
      <DynamicStyleBlock />
      
      <div className="absolute top-4 right-4 z-900">
        <button 
          onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
          className="bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/20 text-white p-2.5 rounded-full transition-colors cursor-pointer flex items-center justify-center shadow-lg"
          title="Change Language"
        >
          <Globe className="h-5 w-5" />
          <span className="ml-2 text-xs font-bold mr-1">{language.toUpperCase()}</span>
        </button>
      </div>

      <div className="fixed top-6 right-6 z-9999 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.9 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-start gap-3 w-80 p-4 rounded-xl shadow-2xl border backdrop-blur-xl ${
                toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : 
                toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-900' : 
                'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {toast.type === 'error' && <AlertCircle className="h-6 w-6 text-red-500 shrink-0" />}
              {toast.type === 'success' && <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />}
              {toast.type === 'info' && <Info className="h-6 w-6 text-blue-500 shrink-0" />}
              
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900 mb-1">{toast.title}</h4>
                <p className="text-xs text-gray-600 leading-snug">{toast.desc}</p>
              </div>
              
              <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-900 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showHabeasModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-1000 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border-t-4 border-accent"
            >
              <div className="p-5 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                <h2 className="text-gray-900 dark:text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent"/> {language === 'es' ? 'Condiciones de Registro' : 'Registration Conditions'}
                </h2>
                <button onClick={() => { setShowHabeasModal(false); }} className="text-gray-400 hover:text-red-500 font-black text-xl leading-none cursor-pointer">×</button>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar p-8 text-gray-700 dark:text-gray-300 text-sm space-y-4 leading-relaxed text-justify">
                  {event.habeas_data_url ? (
                    <div className="h-[50vh] w-full">
                       <iframe src={event.habeas_data_url} className="w-full h-full border-0 rounded-lg bg-white"></iframe>
                    </div>
                  ) : (
                    <>
                      <p><strong>Condiciones de registro:</strong> La Asociación Colombiana de Facultades de Ingeniería (ACOFI) utilizará los datos personales registrados exclusivamente para propósitos administrativos, de promoción de este portal, de información sobre las diferentes actividades de la Asociación y para la validación e identificación del usuario en el portal. Así mismo, podrá enviar a los usuarios registrados, a través del correo electrónico o correspondencia física, información promocional de la Asociación, información proporcionada por proveedores o instituciones que mantengan una relación comercial o institucional activa con la Asociación, invitaciones a eventos o cualquier otro tipo de información que considere de interés para sus usuarios. La Asociación no entregará la información personal de sus usuarios a terceros. Los usuarios podrán cancelar o inactivar su registro en cualquier momento.</p>
                    </>
                  )}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-black/30 border-t border-gray-200 dark:border-white/10 text-center">
                <button 
                  onClick={() => {
                    setAcceptHabeas(true);
                    setShowHabeasModal(false);
                  }} 
                  className="bg-primary text-white px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-primary/80 transition-colors cursor-pointer"
                >
                  {language === 'es' ? 'Aceptar y Cerrar' : 'Accept and Close'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px]"></div>
      </div>
      
      <div id="acofi-form-wrapper" className="flex-1 flex justify-center py-16 px-4 relative mb-16 mt-6">
        <motion.div 
          initial={{ y: 30, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ duration: 0.6 }} 
          className="w-full max-w-3xl bg-white/90 dark:bg-surface/60 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-4xl shadow-[0_0_50px_rgba(0,0,0,0.05)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative z-10 h-max"
        >
          <div className="h-1.5 w-full bg-linear-to-r from-primary via-accent to-primary background-animate"></div>
          
          {event.banner_url && (
            <div className="w-full h-48 md:h-72 overflow-hidden relative bg-gray-100 dark:bg-black/50">
              <img 
                src={event.banner_url} 
                alt="Banner Evento" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-linear-to-t from-white/90 dark:from-surface/90 to-transparent"></div>
            </div>
          )}
          
          <div className={`p-8 md:p-14 ${event.banner_url ? '-mt-16 relative z-10' : ''}`}>
            
            <div className="text-center mb-12">
              {event.logo_url && (
                <motion.img 
                  initial={{ scale: 0.8, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  transition={{ delay: 0.2 }} 
                  src={event.logo_url} 
                  alt={event.name} 
                  className="h-24 mx-auto mb-8 object-contain drop-shadow-2xl" 
                />
              )}
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{event.name}</h1>
            </div>

            {/* INTEGRACIÓN DEL TEXTO ENRIQUECIDO EN EL LADO PÚBLICO */}
            {event.description && (
              <div className="mb-12 bg-gray-50 dark:bg-white/5 p-6 rounded-2xl border border-gray-200 dark:border-white/10">
                <div 
                  className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed event-description-html"
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="absolute opacity-0 -z-50 w-0 h-0 overflow-hidden" aria-hidden="true">
                <input 
                  type="text" 
                  name="b_name" 
                  tabIndex={-1} 
                  autoComplete="off" 
                  value={honeypot} 
                  onChange={e => setHoneypot(e.target.value)} 
                />
              </div>

              <AnimatePresence>
                {userFound && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -20 }} 
                    animate={{ opacity: 1, height: 'auto', y: 0 }} 
                    exit={{ opacity: 0, height: 0 }} 
                    className="overflow-hidden"
                  >
                    <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/5 border border-green-200 dark:border-green-500/20 p-5 rounded-2xl flex items-start gap-4 shadow-lg backdrop-blur-md">
                      <div className="bg-green-100 dark:bg-green-500/20 p-2 rounded-full mt-1">
                        <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="text-green-700 dark:text-green-400 font-bold text-lg">{t.welcomeBackTitle}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                          {t.welcomeBackDesc}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-6">
                {fields.map((field, idx) => {
                  
                  if (!shouldShowField(field)) return null;

                  const currentValue = formData[field.id] || '';
                  const fieldName = field.field_name || '';
                  const isRequiredNow = isFieldRequired(field);

                  let allowOther = true;
                  let systemKey = null;
                  let description = '';
                  let optionsList: string[] = [];
                  
                  const parsedOpts = field.preParsedOptions || {};
                  description = parsedOpts.description || '';
                  systemKey = parsedOpts.system_key || null;

                  if (['select', 'radio', 'checkbox-group'].includes(field.field_type)) {
                    optionsList = [...(parsedOpts.choices || [])];
                    allowOther = parsedOpts.allowOther ?? true;
                    if (allowOther && !optionsList.includes('Otra')) optionsList.push('Otra');
                  }

                  const isDocField = systemKey === 'documento_identidad' || (fieldName.toLowerCase().includes('documento') && !fieldName.toLowerCase().includes('tipo'));
                  const inputBaseClasses = "w-full bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all hover:bg-gray-50 dark:hover:bg-black/60";

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: idx * 0.05 }} 
                      key={field.id} 
                      className="relative group"
                    >
                      
                      {field.field_type !== 'checkbox' && (
                        <div className="mb-2">
                          <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 ml-1 group-focus-within:text-primary transition-colors">
                            {fieldName} {isRequiredNow && <span className="text-accent ml-1">*</span>}
                          </label>
                          {description && (
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 ml-1 leading-tight">
                              {description}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {field.field_type === 'select' ? (
                        
                        <div className="space-y-3">
                          <div className="relative">
                            <select 
                              required={isRequiredNow} 
                              value={currentValue} 
                              onChange={(e) => handleFieldChange(field.id, e.target.value)} 
                              className={`${inputBaseClasses} appearance-none cursor-pointer`}
                            >
                              <option value="" disabled className="text-gray-500">{t.optSelect}</option>
                              {optionsList.map((opt: string) => (
                                <option key={opt} value={opt} className="text-gray-900 dark:text-white bg-white dark:bg-surface">
                                  {opt}
                                </option>
                              ))}
                              {currentValue && currentValue !== 'Otra' && !optionsList.includes(currentValue) && (
                                <option value={currentValue} className="text-gray-900 dark:text-white bg-white dark:bg-surface">
                                  {currentValue}
                                </option>
                              )}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-focus-within:text-primary">
                              ▼
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {allowOther && currentValue === 'Otra' && (
                              <motion.input 
                                initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                                animate={{ opacity: 1, height: 'auto', marginTop: 12 }} 
                                exit={{ opacity: 0, height: 0, marginTop: 0 }} 
                                type="text" 
                                required 
                                value={formData[`${field.id}_otra`] || ''} 
                                onChange={(e) => handleFieldChange(`${field.id}_otra`, e.target.value)} 
                                className="w-full bg-primary/5 border border-primary/30 text-gray-900 dark:text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-primary/40" 
                                placeholder={t.optOtherLabel} 
                              />
                            )}
                          </AnimatePresence>
                        </div>
                        
                      ) : field.field_type === 'radio' ? (
                        
                        <div className="space-y-3 bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {optionsList.map((opt: string) => (
                              <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${currentValue === opt ? 'bg-primary/10 border-primary/50' : 'bg-white dark:bg-black/40 border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-gray-500'}`}>
                                <input 
                                  type="radio" 
                                  name={field.id}
                                  value={opt}
                                  required={isRequiredNow && !currentValue}
                                  checked={currentValue === opt}
                                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                  className="w-5 h-5 accent-primary cursor-pointer"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                              </label>
                            ))}
                          </div>

                          <AnimatePresence>
                            {allowOther && currentValue === 'Otra' && (
                              <motion.input 
                                initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                                animate={{ opacity: 1, height: 'auto', marginTop: 12 }} 
                                exit={{ opacity: 0, height: 0, marginTop: 0 }} 
                                type="text" 
                                required 
                                value={formData[`${field.id}_otra`] || ''} 
                                onChange={(e) => handleFieldChange(`${field.id}_otra`, e.target.value)} 
                                className="w-full bg-primary/5 border border-primary/30 text-gray-900 dark:text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-primary/40" 
                                placeholder={t.optOtherLabel} 
                              />
                            )}
                          </AnimatePresence>
                        </div>

                      ) : field.field_type === 'checkbox-group' ? (
                        
                        <div className="space-y-3 bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {optionsList.map((opt: string) => {
                              const isChecked = currentValue.split(', ').includes(opt);
                              return (
                                <label key={opt} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-accent/10 border-accent/50' : 'bg-white dark:bg-black/40 border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-gray-500'}`}>
                                  <div className="flex items-center h-5 mt-0.5">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={(e) => handleCheckboxGroupChange(field.id, opt, e.target.checked)}
                                      className="w-5 h-5 appearance-none rounded border-2 border-gray-400 dark:border-gray-500 checked:bg-accent checked:border-accent flex items-center justify-center transition-colors cursor-pointer after:content-['✓'] after:text-white dark:after:text-black after:font-bold after:opacity-0 checked:after:opacity-100 after:text-xs"
                                    />
                                  </div>
                                  <span className="text-sm text-gray-700 dark:text-gray-300 leading-tight">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                          
                          {isRequiredNow && !currentValue && (
                             <input type="checkbox" required className="absolute opacity-0 pointer-events-none -bottom-4" />
                          )}

                          <AnimatePresence>
                            {allowOther && currentValue.split(', ').includes('Otra') && (
                              <motion.input 
                                initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                                animate={{ opacity: 1, height: 'auto', marginTop: 12 }} 
                                exit={{ opacity: 0, height: 0, marginTop: 0 }} 
                                type="text" 
                                required 
                                value={formData[`${field.id}_otra`] || ''} 
                                onChange={(e) => handleFieldChange(`${field.id}_otra`, e.target.value)} 
                                className="w-full bg-accent/5 border border-accent/30 text-gray-900 dark:text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-accent/40" 
                                placeholder={t.optOtherWhich} 
                              />
                            )}
                          </AnimatePresence>
                        </div>

                      ) : field.field_type === 'textarea' ? (
                        
                        <textarea 
                          required={isRequiredNow} 
                          value={currentValue} 
                          onChange={(e) => handleFieldChange(field.id, e.target.value)} 
                          rows={4} 
                          className={`${inputBaseClasses} resize-none`}
                        />
                        
                      ) : field.field_type === 'checkbox' ? (
                        
                        <div className="flex items-start gap-3 mt-4 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                          <div className="flex items-center h-5">
                            <input 
                              type="checkbox" 
                              required={isRequiredNow} 
                              checked={currentValue === 'true'} 
                              onChange={(e) => handleFieldChange(field.id, e.target.checked ? 'true' : 'false')} 
                              className="w-5 h-5 appearance-none rounded border-2 border-gray-400 dark:border-gray-500 checked:bg-primary flex items-center justify-center transition-colors cursor-pointer after:content-['✓'] after:text-white after:opacity-0 checked:after:opacity-100 after:text-xs"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label 
                              className="text-sm text-gray-700 dark:text-gray-300 leading-tight cursor-pointer" 
                              onClick={() => handleFieldChange(field.id, currentValue === 'true' ? 'false' : 'true')}
                            >
                              {fieldName} {isRequiredNow && <span className="text-accent">*</span>}
                            </label>
                            {description && (
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 leading-tight">
                                {description}
                              </p>
                            )}
                          </div>
                        </div>

                      ) : field.field_type === 'file' ? (
                        
                        <div className="space-y-2">
                          <div className="relative flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-primary rounded-xl p-4 bg-gray-50 dark:bg-black/20 transition-colors group">
                            
                            {uploadingFields[field.id] ? (
                              <div className="flex flex-col items-center gap-2 text-primary py-2">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span className="text-xs font-bold">{t.fileUploading}</span>
                              </div>
                            ) : currentValue && currentValue.startsWith('http') ? (
                              <div className="flex flex-col items-center gap-2 text-green-500 py-2 relative z-20">
                                <CheckCircle2 className="h-6 w-6" />
                                <span className="text-xs font-bold">{t.fileSuccess}</span>
                                <button 
                                  type="button" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleFieldChange(field.id, '');
                                  }} 
                                  className="text-[10px] text-red-500 hover:text-red-700 underline mt-1 cursor-pointer"
                                >
                                  {t.fileRemove}
                                </button>
                              </div>
                            ) : (
                              <>
                                <input 
                                  type="file" 
                                  required={isRequiredNow && (!currentValue || !currentValue.startsWith('http'))}
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    if (file.size > 1024 * 1024) {
                                      showToast('Error', t.fileErrorSize, 'error');
                                      e.target.value = '';
                                      return;
                                    }
                                    
                                    setUploadingFields(prev => ({...prev, [field.id]: true}));
                                    
                                    try {
                                      const fileExt = file.name.split('.').pop();
                                      const fileName = `inscripcion-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                                      
                                      const { error: uploadErr } = await supabase.storage.from('archivos').upload(fileName, file);
                                      if (uploadErr) throw uploadErr;
                                      
                                      const { data } = supabase.storage.from('archivos').getPublicUrl(fileName);
                                      handleFieldChange(field.id, data.publicUrl);
                                      
                                    } catch (err) {
                                      console.error("Error subiendo archivo:", err);
                                      showToast('Error', t.fileErrorUpload, 'error');
                                      e.target.value = '';
                                    } finally {
                                      setUploadingFields(prev => ({...prev, [field.id]: false}));
                                    }
                                  }}
                                />
                                <div className="text-center space-y-1 text-gray-500 dark:text-gray-400">
                                  <Upload className="h-6 w-6 mx-auto group-hover:text-primary transition-colors" />
                                  <p className="text-xs font-semibold">{t.fileInstruction}</p>
                                  <p className="text-[10px] text-gray-400">{t.fileFormats}</p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                      ) : (
                        
                        <div className="relative">
                          <input 
                            type={field.field_type} 
                            required={isRequiredNow} 
                            value={currentValue} 
                            onChange={(e) => handleFieldChange(field.id, e.target.value)} 
                            onBlur={(e) => { 
                              if (isDocField) handleVerifyDocument(e.target.value); 
                            }} 
                            placeholder={isDocField ? t.placeholderNum : t.placeholderText} 
                            className={inputBaseClasses}
                          />
                          {isDocField && isVerifying && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          )}
                        </div>
                        
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {event.require_habeas_data && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl flex items-start gap-4 hover:border-accent/50 transition-colors cursor-pointer"
                  onClick={() => setAcceptHabeas(!acceptHabeas)}
                >
                  <div className="flex items-center h-5 mt-1">
                    <input 
                      type="checkbox" 
                      required 
                      checked={acceptHabeas} 
                      onChange={(e) => setAcceptHabeas(e.target.checked)} 
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 appearance-none rounded border-2 border-gray-400 dark:border-gray-500 checked:bg-accent flex items-center justify-center transition-colors cursor-pointer after:content-['✓'] after:text-white dark:after:text-black after:font-bold after:opacity-0 checked:after:opacity-100 after:text-xs"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-tight">
                      {t.checkHabeasData1}
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHabeasModal(true);
                        }}
                        className="text-accent font-bold hover:underline ml-1 mr-1"
                      >
                        {t.checkHabeasData2}
                      </span>
                      {t.checkHabeasData3} <span className="text-accent">*</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{t.checkHabeasReq}</p>
                  </div>
                </motion.div>
              )}

              {!isKiosk && event?.turnstile_enabled && (
                <div className="flex flex-col items-center justify-center mt-6 pt-4 border-t border-gray-200 dark:border-white/5">
                  <p className="text-xs text-gray-500 mb-3 font-bold uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> {t.secCheck}
                  </p>
                  <div ref={turnstileRef} className="min-h-16.25 flex items-center justify-center"></div>
                </div>
              )}

              <div className="pt-8 mt-8 border-t border-gray-200 dark:border-white/5">
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full relative group overflow-hidden rounded-xl disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-linear-to-r from-primary to-accent opacity-90 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center justify-center gap-3 py-4 px-6 text-white font-bold text-lg tracking-wide shadow-2xl transition-transform active:scale-[0.98] cursor-pointer">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" /> {t.btnProcessing}
                      </>
                    ) : (
                      <>{t.btnSubmit}</>
                    )}
                  </div>
                </button>
              </div>
              
            </form>
          </div>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  );
}