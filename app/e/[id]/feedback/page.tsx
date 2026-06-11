"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useParams } from 'next/navigation';
import { Loader2, Star, MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '../../../../components/Footer';

export default function FeedbackPage() {
  const params = useParams();
  const eventIdOrSlug = params?.id as string;

  const [loadingInit, setLoadingInit] = useState(true);
  const [event, setEvent] = useState<any>(null);
  
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

        const { data: eventData, error } = await query.single();
          
        if (error || !eventData || eventData.is_deleted) {
          throw new Error("Evento no encontrado");
        }
        
        // Verificar si el switch nativo de feedback está encendido
        if (!eventData.send_feedback_survey) {
          throw new Error("La encuesta de este evento no está habilitada.");
        }
        
        setEvent(eventData);
      } catch (error: any) {
        setErrorMsg(error.message);
      } finally {
        setLoadingInit(false);
      }
    }
    
    loadEvent();
  }, [eventIdOrSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return alert("Por favor, selecciona una calificación de 1 a 5 estrellas.");
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from('event_feedback').insert([{
        event_id: event.id,
        rating: rating,
        comment: comment.trim() || null
      }]);

      if (error) throw error;
      setSuccess(true);
    } catch (error) {
      alert("Hubo un error al enviar tu respuesta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInit) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (errorMsg || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background text-center">
        <div>
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h1>
          <p className="text-gray-400">{errorMsg || "Evento no encontrado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col bg-background relative" 
      style={{ '--primary': event.primary_color || '#4f46e5', '--accent': event.accent_color || '#0ea5e9' } as React.CSSProperties}
    >
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px]"></div>
      </div>
      
      <div className="flex-1 flex justify-center py-16 px-4 relative z-10 items-center">
        <motion.div 
          initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} 
          className="w-full max-w-2xl bg-surface/60 backdrop-blur-2xl border border-white/10 rounded-4xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          <div className="h-1.5 w-full bg-linear-to-r from-primary via-accent to-primary background-animate"></div>
          
          <div className="p-8 md:p-12 text-center">
            {event.logo_url && <img src={event.logo_url} alt={event.name} className="h-20 mx-auto mb-6 object-contain drop-shadow-2xl" />}
            
            <AnimatePresence mode="wait">
              {!success ? (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}>
                  <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">¿Qué te pareció el evento?</h1>
                  <p className="text-gray-400 text-sm mb-10">Tu opinión nos ayuda a mejorar para futuras ediciones de <strong className="text-white">{event.name}</strong>.</p>

                  <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* SISTEMA INTERACTIVO DE ESTRELLAS */}
                    <div className="space-y-4">
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star} type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                            className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                          >
                            <Star 
                              className={`h-12 w-12 transition-colors duration-200 ${
                                (hoverRating || rating) >= star ? 'fill-accent text-accent drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]' : 'text-gray-600'
                              }`} 
                            />
                          </button>
                        ))}
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest text-primary">
                        {rating === 1 && "Muy Malo"} {rating === 2 && "Malo"} {rating === 3 && "Regular"} {rating === 4 && "Bueno"} {rating === 5 && "¡Excelente!"}
                      </p>
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> Comentarios adicionales (Opcional)
                      </label>
                      <textarea 
                        value={comment} onChange={(e) => setComment(e.target.value)} rows={4} 
                        placeholder="Escribe qué te gustó más o qué podríamos mejorar..."
                        className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                      />
                    </div>

                    <button 
                      type="submit" disabled={isSubmitting || rating === 0} 
                      className="w-full relative group overflow-hidden rounded-xl disabled:opacity-50 mt-6"
                    >
                      <div className="absolute inset-0 bg-linear-to-r from-primary to-accent opacity-90 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative flex items-center justify-center gap-3 py-4 px-6 text-white font-bold text-lg tracking-wide shadow-2xl transition-transform active:scale-[0.98]">
                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Send className="h-5 w-5" /> Enviar Calificación</>}
                      </div>
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10">
                  <CheckCircle2 className="h-24 w-24 text-green-400 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(74,222,128,0.4)]" />
                  <h2 className="text-3xl font-bold text-white mb-3">¡Gracias por tu Feedback!</h2>
                  <p className="text-gray-400">Hemos recibido tus comentarios exitosamente. Valoramos mucho tu opinión.</p>
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}