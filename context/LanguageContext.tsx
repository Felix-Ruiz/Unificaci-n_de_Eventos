"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Asumimos 'es' por defecto para que el Servidor de Vercel pueda construir la app sin problemas
  const [language, setLanguageState] = useState<Language>('es');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Esto solo se ejecuta en el navegador (Cliente)
    const savedLang = localStorage.getItem('acofi_admin_lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguageState(savedLang);
    }
    setIsMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('acofi_admin_lang', lang);
    }
  };

  // 🚨 CRÍTICO: Siempre debemos retornar el Provider, incluso durante el SSR.
  // Usamos opacity para evitar parpadeos visuales molestos mientras lee el localStorage
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <div 
        style={{ 
          opacity: isMounted ? 1 : 0, 
          transition: 'opacity 0.2s ease-in-out',
          height: '100%',
          width: '100%'
        }}
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage debe ser usado dentro de un LanguageProvider');
  }
  return context;
}