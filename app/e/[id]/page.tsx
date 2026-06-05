"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Sparkles, 
  Lock, 
  Clock, 
  Users, 
  CalendarDays 
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useParams } from 'next/navigation';

export default function FormularioPublico() {
  const params = useParams();
  const eventId = params?.id as string;

  const [loadingInit, setLoadingInit] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [status, setStatus] = useState<'open' | 'paused' | 'full' | 'expired'>('open');
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [userFound, setUserFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isKiosk = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('kiosk') === 'true';

  useEffect(() => {
    if (!eventId) return;

    async function loadEvent() {
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();
          
        if (eventError || eventData.is_deleted) {
          throw new Error("Evento no encontrado");
        }
        
        setEvent(eventData);

        const { count } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId);
        
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
          .eq('event_id', eventId)
          .order('order_index', { ascending: true });
          
        setFields(fieldsData || []);
        
      } catch (error) {
        setEvent(null);
      } finally {
        setLoadingInit(false);
      }
    }
    
    loadEvent();
  }, [eventId]);

  const handleFieldChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Manejador especial para los grupos de Checkbox (Selección Múltiple)
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
          const fn = (f.field_name || '').toLowerCase();
          
          if (fn.includes('correo')) prefilledData[f.id] = data.email || '';
          if (fn.includes('nombre')) prefilledData[f.id] = `${data.nombre} ${data.apellido}`.trim();
          if (fn.includes('institución') || fn.includes('institucion')) prefilledData[f.id] = data.institucion || '';
          if (fn.includes('cargo')) prefilledData[f.id] = data.cargo || '';
          if (fn.includes('país') || fn.includes('pais')) prefilledData[f.id] = data.pais || '';
          if (fn.includes('ciudad')) prefilledData[f.id] = data.ciudad || '';
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

  // EVALUACIÓN DE LÓGICA: Mostrar u Ocultar
  const shouldShowField = (field: any) => {
    if (!field.options) return true;
    
    try {
      const parsed = JSON.parse(field.options);
      
      if (!parsed.logic || !parsed.logic.dependsOnId) {
        return true;
      }
      
      const parentField = fields.find(f => f.id === parsed.logic.dependsOnId);
      if (!parentField) return true;

      const parentVal = formData[parentField.id] || '';
      
      // Si el padre es de selección múltiple, evaluamos si contiene la opción
      const isMatch = parentField.field_type === 'checkbox-group' 
        ? parentVal.split(', ').includes(parsed.logic.dependsOnValue)
        : parentVal === parsed.logic.dependsOnValue;

      const action = parsed.logic.action || 'show';
      
      if (action === 'hide') {
        return !isMatch;
      }
      
      if (action === 'show') {
        return isMatch;
      }
      
      return true; // Si la acción es 'require', la pregunta siempre debe mostrarse
      
    } catch { 
      return true; 
    }
  };

  // EVALUACIÓN DE LÓGICA: Hacer Obligatoria
  const isFieldRequired = (field: any) => {
    if (field.is_required) return true; 
    
    if (!field.options) return false;
    
    try {
      const parsed = JSON.parse(field.options);
      
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
      
    } catch { 
      return false; 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (honeypot) { 
      setSuccess(true); 
      return; 
    }
    
    setIsSubmitting(true);
    
    try {
      let nombre = '', apellido = '', email = '', institucion = '', cargo = '', pais = '', ciudad = '', documento = '';
      const finalFormData = { ...formData };
      
      fields.forEach(f => {
        // Evitamos enviar datos de campos que la lógica ocultó
        if (!shouldShowField(f)) {
          delete finalFormData[f.id];
          delete finalFormData[`${f.id}_otra`];
          return;
        }

        const fn = (f.field_name || '').toLowerCase();
        const val = formData[f.id] || '';
        
        // Mapear "Otra" si aplica (para select, radio o checkbox-group)
        if (['select', 'radio'].includes(f.field_type) && val === 'Otra' && formData[`${f.id}_otra`]) {
          finalFormData[f.id] = formData[`${f.id}_otra`];
        } else if (f.field_type === 'checkbox-group' && val.includes('Otra') && formData[`${f.id}_otra`]) {
          // Si es múltiple y contiene otra, reemplazamos 'Otra' por el valor escrito
          let arr = val.split(', ');
          arr = arr.map(v => v === 'Otra' ? formData[`${f.id}_otra`] : v);
          finalFormData[f.id] = arr.join(', ');
        }
        
        const finalVal = finalFormData[f.id] || val;
        
        if (fn.includes('documento') && !fn.includes('tipo')) documento = finalVal;
        if (fn.includes('nombre')) { 
          const parts = finalVal.split(' '); 
          nombre = parts[0] || ''; 
          apellido = parts.slice(1).join(' ') || ''; 
        }
        if (fn.includes('correo')) email = finalVal;
        if (fn.includes('institución') || fn.includes('institucion')) institucion = finalVal;
        if (fn.includes('cargo')) cargo = finalVal;
        if (fn.includes('país') || fn.includes('pais')) pais = finalVal;
        if (fn.includes('ciudad')) ciudad = finalVal;
      });

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
          ciudad 
        }, { onConflict: 'documento_identidad' });

      await supabase
        .from('registrations')
        .insert([{ 
          event_id: event.id, 
          historic_user_doc: documento, 
          form_data: finalFormData 
        }]);

      setSuccess(true);
      
      if (isKiosk) {
        setTimeout(() => window.location.reload(), 3000);
      }
      
    } catch (error: any) { 
      alert("Error en el servidor al enviar el registro."); 
    } finally { 
      setIsSubmitting(false); 
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

  if (status !== 'open') {
    const messages = {
      paused: { 
        icon: Lock, 
        color: 'text-yellow-500', 
        bg: 'bg-yellow-500/10', 
        title: 'Inscripciones Pausadas', 
        desc: 'El registro se encuentra cerrado temporalmente.' 
      },
      full: { 
        icon: Users, 
        color: 'text-red-500', 
        bg: 'bg-red-500/10', 
        title: 'Aforo Completo', 
        desc: 'Lo sentimos, hemos alcanzado el límite máximo de asistentes permitidos.' 
      },
      expired: { 
        icon: Clock, 
        color: 'text-gray-400', 
        bg: 'bg-white/5', 
        title: 'Registro Cerrado', 
        desc: 'La fecha límite de inscripción para este evento ha finalizado.' 
      }
    };
    
    const m = messages[status];
    
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden" 
        style={{ '--primary': event.primary_color || '#4f46e5', '--accent': event.accent_color || '#0ea5e9' } as React.CSSProperties}
      >
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 ${m.bg} blur-[120px] rounded-full pointer-events-none`}></div>
        <div className="bg-surface/50 backdrop-blur-xl border border-white/5 p-10 rounded-3xl max-w-md w-full text-center shadow-2xl relative z-10">
          <m.icon className={`h-16 w-16 ${m.color} mx-auto mb-6`} />
          <h2 className="text-2xl font-bold text-white mb-2">{m.title}</h2>
          <p className="text-gray-400">{m.desc}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden" 
        style={{ '--primary': event.primary_color || '#4f46e5', '--accent': event.accent_color || '#0ea5e9' } as React.CSSProperties}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-green-500/20 blur-[150px] rounded-full pointer-events-none"></div>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="bg-surface/80 backdrop-blur-2xl border border-white/10 p-12 rounded-4xl max-w-md w-full text-center shadow-2xl relative z-10"
        >
          <CheckCircle2 className="h-20 w-20 text-green-400 mx-auto mb-4 relative z-10" />
          <h2 className="text-3xl font-bold text-white mb-3">¡Inscripción Exitosa!</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Tu registro para <span className="text-white font-medium">{event.name}</span> ha sido confirmado.
          </p>
          
          {isKiosk ? (
            <p className="text-primary text-sm font-bold animate-pulse">
              Preparando para el siguiente asistente...
            </p>
          ) : (
            <button 
              onClick={() => window.location.reload()} 
              className="text-primary hover:text-accent font-medium transition-colors"
            >
              Realizar otro registro
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-background py-16 px-4 flex justify-center relative overflow-hidden" 
      style={{ '--primary': event.primary_color || '#4f46e5', '--accent': event.accent_color || '#0ea5e9' } as React.CSSProperties}
    >
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px]"></div>
      </div>
      
      <motion.div 
        initial={{ y: 30, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ duration: 0.6 }} 
        className="w-full max-w-3xl bg-surface/60 backdrop-blur-2xl border border-white/10 rounded-4xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative z-10 h-max"
      >
        <div className="h-1.5 w-full bg-linear-to-r from-primary via-accent to-primary background-animate"></div>
        
        {/* BANNER GIGANTE DE PORTADA */}
        {event.banner_url && (
          <div className="w-full h-48 md:h-72 overflow-hidden relative bg-black/50">
            <img 
              src={event.banner_url} 
              alt="Banner Evento" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-linear-to-t from-surface/90 to-transparent"></div>
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
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{event.name}</h1>
            <div className="flex items-center justify-center gap-2 mt-3 text-primary/80">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-medium tracking-widest uppercase">Registro Oficial</p>
            </div>
          </div>

          {/* DESCRIPCIÓN DEL EVENTO */}
          {event.description && (
            <div className="mb-12 bg-white/5 border border-white/10 p-6 rounded-2xl">
              <div className="flex items-center gap-2 text-accent mb-3">
                <CalendarDays className="h-5 w-5"/> 
                <h3 className="font-bold">Información del Evento</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* HONEYPOT INVISIBLE */}
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
                  <div className="bg-linear-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 p-5 rounded-2xl flex items-start gap-4 shadow-lg backdrop-blur-md">
                    <div className="bg-green-500/20 p-2 rounded-full mt-1">
                      <UserCheck className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="text-green-400 font-bold text-lg">¡Bienvenido de vuelta!</h4>
                      <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                        Hemos autocompletado tu información basándonos en tu historial. Verifica que todo esté correcto antes de continuar.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-6">
              {fields.map((field, idx) => {
                
                // Aplicar lógica de Ocultar/Mostrar
                if (!shouldShowField(field)) return null;

                const currentValue = formData[field.id] || '';
                const fieldName = field.field_name || '';
                const isDocField = fieldName.toLowerCase().includes('documento') && !fieldName.toLowerCase().includes('tipo');
                
                // Aplicar lógica de Obligatoriedad
                const isRequiredNow = isFieldRequired(field);

                // Opciones parseadas para Select, Radio y Checkbox-Group
                let optionsList: string[] = [];
                if (['select', 'radio', 'checkbox-group'].includes(field.field_type)) {
                  try {
                    const parsed = JSON.parse(field.options);
                    optionsList = [...(parsed.choices || [])];
                    if (!optionsList.includes('Otra')) optionsList.push('Otra');
                  } catch {
                    optionsList = ['Otra'];
                  }
                }

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: idx * 0.05 }} 
                    key={field.id} 
                    className="relative group"
                  >
                    
                    {field.field_type !== 'checkbox' && (
                      <label className="block text-xs font-bold tracking-wider uppercase text-gray-400 mb-2 ml-1 group-focus-within:text-primary transition-colors">
                        {fieldName} {isRequiredNow && <span className="text-accent ml-1">*</span>}
                      </label>
                    )}
                    
                    {field.field_type === 'select' ? (
                      
                      <div className="space-y-3">
                        <div className="relative">
                          <select 
                            required={isRequiredNow} 
                            value={currentValue} 
                            onChange={(e) => handleFieldChange(field.id, e.target.value)} 
                            className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-3.5 px-4 appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all hover:bg-black/60 cursor-pointer"
                          >
                            <option value="" disabled className="bg-surface text-gray-500">Selecciona una opción...</option>
                            {optionsList.map((opt: string) => (
                              <option key={opt} value={opt} className="bg-surface text-white">
                                {opt}
                              </option>
                            ))}
                            {currentValue && currentValue !== 'Otra' && !optionsList.includes(currentValue) && (
                              <option value={currentValue} className="bg-surface text-white">
                                {currentValue}
                              </option>
                            )}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-focus-within:text-primary">
                            ▼
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {currentValue === 'Otra' && (
                            <motion.input 
                              initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                              animate={{ opacity: 1, height: 'auto', marginTop: 12 }} 
                              exit={{ opacity: 0, height: 0, marginTop: 0 }} 
                              type="text" 
                              required 
                              value={formData[`${field.id}_otra`] || ''} 
                              onChange={(e) => handleFieldChange(`${field.id}_otra`, e.target.value)} 
                              className="w-full bg-primary/5 border border-primary/30 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-primary/40" 
                              placeholder={`Específica tu ${fieldName.toLowerCase()}...`} 
                            />
                          )}
                        </AnimatePresence>
                      </div>
                      
                    ) : field.field_type === 'radio' ? (
                      
                      <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {optionsList.map((opt: string) => (
                            <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${currentValue === opt ? 'bg-primary/10 border-primary/50' : 'bg-black/40 border-white/10 hover:border-gray-500'}`}>
                              <input 
                                type="radio" 
                                name={field.id}
                                value={opt}
                                required={isRequiredNow && !currentValue}
                                checked={currentValue === opt}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                className="w-5 h-5 accent-primary cursor-pointer"
                              />
                              <span className="text-sm text-gray-300">{opt}</span>
                            </label>
                          ))}
                        </div>

                        <AnimatePresence>
                          {currentValue === 'Otra' && (
                            <motion.input 
                              initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                              animate={{ opacity: 1, height: 'auto', marginTop: 12 }} 
                              exit={{ opacity: 0, height: 0, marginTop: 0 }} 
                              type="text" 
                              required 
                              value={formData[`${field.id}_otra`] || ''} 
                              onChange={(e) => handleFieldChange(`${field.id}_otra`, e.target.value)} 
                              className="w-full bg-primary/5 border border-primary/30 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-primary/40" 
                              placeholder={`Específica tu ${fieldName.toLowerCase()}...`} 
                            />
                          )}
                        </AnimatePresence>
                      </div>

                    ) : field.field_type === 'checkbox-group' ? (
                      
                      <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {optionsList.map((opt: string) => {
                            const isChecked = currentValue.split(', ').includes(opt);
                            return (
                              <label key={opt} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-accent/10 border-accent/50' : 'bg-black/40 border-white/10 hover:border-gray-500'}`}>
                                <div className="flex items-center h-5 mt-0.5">
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={(e) => handleCheckboxGroupChange(field.id, opt, e.target.checked)}
                                    className="w-5 h-5 appearance-none rounded border-2 border-gray-500 checked:bg-accent checked:border-accent flex items-center justify-center transition-colors cursor-pointer after:content-['✓'] after:text-black after:font-bold after:opacity-0 checked:after:opacity-100 after:text-xs"
                                  />
                                </div>
                                <span className="text-sm text-gray-300 leading-tight">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                        
                        {/* Fake input oculto para manejar el required del grupo de checkboxes */}
                        {isRequiredNow && !currentValue && (
                           <input type="checkbox" required className="absolute opacity-0 pointer-events-none -bottom-4" />
                        )}

                        <AnimatePresence>
                          {currentValue.split(', ').includes('Otra') && (
                            <motion.input 
                              initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                              animate={{ opacity: 1, height: 'auto', marginTop: 12 }} 
                              exit={{ opacity: 0, height: 0, marginTop: 0 }} 
                              type="text" 
                              required 
                              value={formData[`${field.id}_otra`] || ''} 
                              onChange={(e) => handleFieldChange(`${field.id}_otra`, e.target.value)} 
                              className="w-full bg-accent/5 border border-accent/30 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-accent/40" 
                              placeholder={`Específica cuáles otras...`} 
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
                        className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all hover:bg-black/60 resize-none" 
                      />
                      
                    ) : field.field_type === 'checkbox' ? (
                      
                      <div className="flex items-start gap-3 mt-4 bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="flex items-center h-5">
                          <input 
                            type="checkbox" 
                            required={isRequiredNow} 
                            checked={currentValue === 'true'} 
                            onChange={(e) => handleFieldChange(field.id, e.target.checked ? 'true' : 'false')} 
                            className="w-5 h-5 appearance-none rounded border-2 border-gray-500 checked:bg-primary checked:border-primary flex items-center justify-center transition-colors cursor-pointer after:content-['✓'] after:text-white after:opacity-0 checked:after:opacity-100 after:text-xs"
                          />
                        </div>
                        <label 
                          className="text-sm text-gray-300 leading-tight cursor-pointer" 
                          onClick={() => handleFieldChange(field.id, currentValue === 'true' ? 'false' : 'true')}
                        >
                          {fieldName} {isRequiredNow && <span className="text-accent">*</span>}
                        </label>
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
                          placeholder={isDocField ? "Ingresa tu número..." : ""} 
                          className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all hover:bg-black/60" 
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

            <div className="pt-10 mt-10 border-t border-white/5">
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full relative group overflow-hidden rounded-xl disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-linear-to-r from-primary to-accent opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center justify-center gap-3 py-4 px-6 text-white font-bold text-lg tracking-wide shadow-2xl transition-transform active:scale-[0.98]">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" /> Procesando...
                    </>
                  ) : (
                    <>Confirmar Inscripción</>
                  )}
                </div>
              </button>
            </div>
            
          </form>
        </div>
      </motion.div>
    </div>
  );
}