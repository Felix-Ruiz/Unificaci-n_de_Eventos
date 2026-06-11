"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, FileText, ShieldCheck } from 'lucide-react';

export default function Footer() {
  const [activeModal, setActiveModal] = useState<'habeas' | 'terms' | 'map' | null>(null);
  const closeModal = () => setActiveModal(null);
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="relative border-t-4 border-accent py-6 mt-8 z-10 overflow-hidden bg-primary">
        
        {/* FONDO "FULL HD" */}
        <div className="absolute inset-0 bg-linear-to-br from-primary via-black to-background z-0 opacity-90"></div>

        {/* DISEÑO TECNOLÓGICO "VIVO" */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.1] mix-blend-screen">
          <svg className="absolute left-0 top-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M-50 40 L 120 40 L 180 100 L 400 100 M -50 120 L 80 120 L 140 180 L 350 180 M 350 180 L 400 130 L 500 130" stroke="white" strokeWidth="1.5" fill="none"/>
            <circle cx="400" cy="100" r="3" fill="white" />
            <circle cx="500" cy="130" r="3" fill="white" />
            <path d="M 600 0 L 600 50 L 650 100 L 800 100" stroke="white" strokeWidth="1.5" fill="none"/>
            <circle cx="800" cy="100" r="3" fill="white" />
          </svg>
          <svg className="absolute -right-24 -bottom-24 w-96 h-96 text-white animate-[spin_60s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <circle cx="12" cy="12" r="3" strokeWidth="0.5"></circle>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-4 border-b border-white/10 pb-5 mb-5 text-center md:text-left">
            <div>
              <h3 className="text-white font-black text-sm md:text-base uppercase tracking-widest mb-2 drop-shadow-md">
                <a href="https://www.acofi.edu.co/" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors duration-300">
                  Asociación Colombiana de Facultades de Ingeniería (ACOFI)
                </a>
              </h3>
              
              <div className="text-gray-300 text-xs space-y-2 font-medium">
                <button onClick={() => setActiveModal('map')} className="flex items-center justify-center md:justify-start gap-2 hover:text-accent transition-colors duration-300 w-full md:w-auto group">
                  <MapPin className="w-4 h-4 text-accent group-hover:animate-bounce" />
                  <span className="border-b border-transparent group-hover:border-accent pb-0.5">
                    Carrera 68D 25B - 86 oficina 205, Edificio Torre Central
                  </span>
                </button>

                <p className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                    <a href="tel:+576016966285" className="hover:text-accent transition-colors flex items-center justify-center md:justify-start gap-1">
                        Fijo (57 601) 696 6285
                    </a>
                    <span className="hidden md:inline text-gray-500 font-black">|</span>
                    <a href="tel:+573003221059" className="hover:text-accent transition-colors flex items-center justify-center md:justify-start gap-1">
                        Móvil (57) 300 322 1059
                    </a>
                    <span className="hidden md:inline text-gray-500 font-black">|</span>
                    <span className="flex items-center justify-center md:justify-start gap-1">
                        Bogotá, D.C., Colombia
                    </span>
                </p>

                <p className="flex flex-col md:flex-row md:items-center mt-1">
                    <a href="mailto:fruiz@acofi.edu.co?subject=Soporte%20Eventos%20ACOFI" className="hover:text-white text-accent transition-colors flex items-center justify-center md:justify-start gap-1.5 bg-black/30 px-3 py-1.5 rounded-full border border-white/10 w-fit mx-auto md:mx-0 shadow-sm">
                        <span className="font-bold">Soporte Técnico:</span> <span className="text-gray-300 hover:text-white">fruiz@acofi.edu.co</span>
                    </a>
                </p>
              </div>
            </div>
            
            <div className="hidden md:block opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 relative z-10">
                <img src="/logoAcofiC.png" alt="Sello ACOFI" className="h-14 object-contain" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-[10px] font-bold tracking-widest text-center md:text-left">
              <p>© {currentYear} ACOFI. Todos los derechos reservados.</p>
              <p className="mt-0.5 opacity-70">Plataforma tecnológica de Acreditación Digital.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-accent">
              <button onClick={() => setActiveModal('habeas')} className="hover:text-white transition drop-shadow-sm cursor-pointer">
                Política de Datos (Habeas Data)
              </button>
              <span className="text-gray-600 hidden md:inline">|</span>
              <button onClick={() => setActiveModal('terms')} className="hover:text-white transition drop-shadow-sm cursor-pointer">
                Términos y Condiciones
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* SISTEMA DE MODALES LEGALES Y MAPA */}
      <AnimatePresence>
        {activeModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-1000 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className={`bg-white rounded-lg shadow-2xl w-full flex flex-col overflow-hidden border-t-4 border-accent ${activeModal === 'map' ? 'max-w-4xl' : 'max-w-3xl max-h-[85vh]'}`}
            >
              
              <div className="p-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-black font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  {activeModal === 'habeas' && <><FileText className="h-5 w-5 text-accent"/> Política de Tratamiento de Datos</>}
                  {activeModal === 'terms' && <><ShieldCheck className="h-5 w-5 text-accent"/> Términos y Condiciones</>}
                  {activeModal === 'map' && <><MapPin className="w-5 h-5 text-accent" /> Ubicación Oficial ACOFI</>}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-red-500 font-black text-xl leading-none cursor-pointer">×</button>
              </div>
              
              <div className={`overflow-y-auto custom-scrollbar ${activeModal === 'map' ? 'p-0' : 'p-8 text-gray-700 text-sm leading-relaxed space-y-4'}`}>
                
                {activeModal === 'map' && (
                  <div className="w-full h-[50vh] md:h-112.5 bg-gray-200">
                    <iframe 
                      title="Mapa de Ubicación ACOFI"
                      src="https://maps.google.com/maps?q=Carrera%2068D%2025B%20-%2086%20oficina%20205,%20Bogota&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      allowFullScreen 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                )}

                {activeModal === 'habeas' && (
                  <>
                    <p><strong>1. MARCO LEGAL Y OBJETIVO</strong><br/>
                    De conformidad con lo dispuesto en la Ley Estatutaria 1581 de 2012 y el Decreto Reglamentario 1377 de 2013 de la República de Colombia, la Asociación Colombiana de Facultades de Ingeniería (ACOFI) informa su política de recolección, almacenamiento y tratamiento de datos personales.</p>
                    
                    <p><strong>2. FINALIDAD DEL TRATAMIENTO</strong><br/>
                    Los datos personales recolectados en esta plataforma son utilizados estricta y exclusivamente para los siguientes fines:
                    <br/>- Registro de asistencia a eventos, foros y asambleas.
                    <br/>- Emisión, registro y entrega de credenciales e insignias digitales institucionales.
                    <br/>- Comunicación directa referente a certificaciones o actualizaciones de la plataforma.</p>
                    
                    <p><strong>3. ACCESO PÚBLICO Y VERIFICACIÓN</strong><br/>
                    Al aceptar la emisión de una credencial digital, el titular autoriza que su nombre, programa certificado y número de identificación estén disponibles en el directorio público de verificación para consulta de terceros.</p>

                    <p><strong>4. DERECHOS DEL TITULAR</strong><br/>
                    El titular de los datos tiene derecho a conocer, actualizar, rectificar y solicitar la supresión de sus datos personales. Para ejercer estos derechos, puede comunicarse a los canales oficiales de ACOFI.</p>
                  </>
                )}

                {activeModal === 'terms' && (
                  <>
                    <p><strong>1. ACEPTACIÓN DE LOS TÉRMINOS</strong><br/>
                    El acceso, consulta y uso de la Plataforma de Registro y Credenciales Digitales de ACOFI atribuye la condición de usuario e implica la aceptación plena de los presentes Términos y Condiciones.</p>

                    <p><strong>2. NATURALEZA DE LAS CREDENCIALES</strong><br/>
                    Las insignias y certificados digitales emitidos a través de este sistema son representaciones gráficas inmutables de los logros o participaciones validados por ACOFI. Cada insignia posee un identificador único (ID) rastreable.</p>

                    <p><strong>3. USO INTRANSFERIBLE</strong><br/>
                    Las credenciales son de uso personal e intransferible. El profesional acreditado es responsable del uso que se le dé a los enlaces de verificación pública de sus insignias.</p>

                    <p><strong>4. DERECHO DE REVOCACIÓN</strong><br/>
                    ACOFI se reserva el derecho absoluto de revocar, eliminar o anular cualquier credencial digital en caso de detectar fraude, suplantación de identidad o vulneración de códigos éticos.</p>
                  </>
                )}
                
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
                <button onClick={closeModal} className="bg-black text-white px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-colors cursor-pointer">
                  Aceptar y Cerrar
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}