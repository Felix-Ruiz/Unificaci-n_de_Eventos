"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Settings, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  CheckCircle2, 
  GitBranch, 
  X, 
  ShieldAlert, 
  Clock, 
  Users, 
  Palette, 
  ImagePlus, 
  AlignLeft,
  Link2,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Info,
  Mail,
  ChevronDown,
  Lock,
  Smartphone,
  ThumbsUp,
  Bot
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../../lib/supabase';
import { useRouter } from 'next/navigation';

import FeedbackAdminPanel from '../../../../components/FeedbackAdminPanel';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'radio' | 'checkbox-group' | 'number' | 'textarea' | 'checkbox' | 'date';
  isRequired: boolean;
  options: string[];
  isDefault: boolean;
  logic?: { dependsOnId: string; dependsOnValue: string; action: 'show' | 'hide' | 'require'; } | null;
  _ui_showLogic?: boolean;
}

const AccordionSection = ({ id, icon: Icon, title, isOpen, onToggle, children }: any) => {
  return (
    <div className="bg-white dark:bg-surface border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden transition-all shadow-sm dark:shadow-none">
      <button 
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-5 md:p-6 bg-gray-50 dark:bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }} 
            animate={{ height: 'auto' }} 
            exit={{ height: 0 }} 
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-5 md:p-6 pt-0 border-t border-gray-200 dark:border-white/5 mt-4 space-y-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function NuevoEventoPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'error' | 'info' | 'success' } | null>(null);

  const showToast = (title: string, desc: string, type: 'error' | 'info' | 'success' = 'info') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 5000);
  };
  
  const [openSection, setOpenSection] = useState<string>('detalles');

  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventSlug, setEventSlug] = useState('');
  
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [accentColor, setAccentColor] = useState('#0ea5e9');
  const [bgColor, setBgColor] = useState('#09090b');
  
  // CAMPO DINÁMICO PARA EL CORREO DEL CREADOR/COORDINADOR
  const [creatorEmail, setCreatorEmail] = useState('');

  useEffect(() => {
    async function getCreator() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setCreatorEmail(session.user.email);
      } else {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.email) setCreatorEmail(data.user.email);
      }
    }
    getCreator();
  }, []);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [maxCapacity, setMaxCapacity] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [onePerDevice, setOnePerDevice] = useState(false);
  const [turnstileEnabled, setTurnstileEnabled] = useState(true);

  const [sendNotifications, setSendNotifications] = useState(true);
  const [sendFeedbackSurvey, setSendFeedbackSurvey] = useState(false);
  const [thankYouEnabled, setThankYouEnabled] = useState(false);
  const [thankYouText, setThankYouText] = useState('');
  const [thankYouUrl, setThankYouUrl] = useState('');

  const [requireHabeasData, setRequireHabeasData] = useState(true);
  const [habeasDataUrl, setHabeasDataUrl] = useState('');

  const [fields, setFields] = useState<FormField[]>([
    { id: 'f-tipo-doc', label: 'Tipo de Documento', type: 'select', isRequired: true, options: ['Cédula de Ciudadanía', 'Tarjeta de Identidad', 'Cédula de Extranjería', 'Pasaporte', 'NIT'], isDefault: true },
    { id: 'f-doc', label: 'Documento de Identidad', type: 'text', isRequired: true, options: [], isDefault: true },
    { id: 'f-email', label: 'Correo Electrónico', type: 'email', isRequired: true, options: [], isDefault: true },
    { id: 'f-nom', label: 'Nombre Completo', type: 'text', isRequired: true, options: [], isDefault: true },
    { id: 'f-inst', label: 'Institución', type: 'select', isRequired: true, options: [], isDefault: true },
    { id: 'f-cargo', label: 'Cargo', type: 'select', isRequired: true, options: [], isDefault: true },
    { id: 'f-pais', label: 'País', type: 'select', isRequired: true, options: [], isDefault: true },
    { id: 'f-ciudad', label: 'Ciudad', type: 'select', isRequired: true, options: [], isDefault: true },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? '' : section);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBannerPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSlugFormat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    const formattedSlug = text
      .toLowerCase()
      .trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    
    setEventSlug(formattedSlug);
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: `f-custom-${Date.now()}`,
      label: 'Nueva Pregunta',
      type: 'text',
      isRequired: false,
      options: [],
      isDefault: false,
      logic: null,
      _ui_showLogic: false
    };
    setFields([...fields, newField]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, key: keyof FormField, value: any) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const updateFieldLogic = (id: string, logicKey: 'dependsOnId' | 'dependsOnValue' | 'action', value: string) => {
    setFields(fields.map(f => {
      if (f.id !== id) return f;
      const currentLogic = f.logic || { dependsOnId: '', dependsOnValue: '', action: 'show' };
      return { ...f, logic: { ...currentLogic, [logicKey]: value } };
    }));
  };

  const clearFieldLogic = (id: string) => {
    setFields(fields.map(f => f.id === id ? { ...f, logic: null, _ui_showLogic: false } : f));
  };

  const handleExcelForOptions = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const rawOptions = data.slice(1).map(row => row[0]).filter(val => val && String(val).trim() !== '');
        const uniqueOptions = Array.from(new Set(rawOptions.map(String)));
        
        if (!uniqueOptions.includes('Otra')) {
          uniqueOptions.push('Otra');
        }

        updateField(id, 'options', uniqueOptions);
        showToast('Opciones Importadas', `Se cargaron ${uniqueOptions.length} opciones desde el archivo Excel.`, 'success');
      } catch (error) {
        showToast('Error de Formato', 'No se pudo leer el archivo Excel. Revisa el formato e intenta de nuevo.', 'error');
      }
      if (e.target) e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleManualOptionAdd = (id: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val) {
        const field = fields.find(f => f.id === id);
        if (field && !field.options.includes(val)) {
          let newOptions = field.options.filter(o => o !== 'Otra');
          newOptions.push(val);
          newOptions.push('Otra');
          updateField(id, 'options', newOptions);
        }
        e.currentTarget.value = '';
      }
    }
  };

  const handleSaveEvent = async () => {
    if (!eventName) return showToast('Campo Requerido', 'Debes asignarle un nombre al evento para poder guardarlo.', 'error');
    
    setIsSaving(true);

    try {
      if (eventSlug) {
        const { data: existingSlug } = await supabase
          .from('events')
          .select('id')
          .eq('slug', eventSlug)
          .single();
        
        if (existingSlug) {
          throw new Error("El Alias para la URL ya está en uso. Por favor elige otro.");
        }
      }

      let logoUrl = null;
      let bannerUrl = null;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile);
        
        if (!uploadError) {
          logoUrl = supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
        }
      }

      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `banner-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, bannerFile);
        
        if (!uploadError) {
          bannerUrl = supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
        }
      }

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert([{ 
          name: eventName, 
          slug: eventSlug || null, 
          description: eventDescription,
          logo_url: logoUrl, 
          banner_url: bannerUrl,
          send_notifications: sendNotifications,
          require_habeas_data: requireHabeasData, 
          habeas_data_url: habeasDataUrl || null,
          send_feedback_survey: sendFeedbackSurvey,
          max_capacity: maxCapacity ? parseInt(maxCapacity) : null,
          close_date: closeDate ? new Date(closeDate).toISOString() : null,
          primary_color: primaryColor,
          accent_color: accentColor,
          bg_color: bgColor,
          form_password: formPassword || null,
          one_per_device: onePerDevice,
          thank_you_enabled: thankYouEnabled,
          thank_you_text: thankYouText || null,
          thank_you_url: thankYouUrl || null,
          turnstile_enabled: turnstileEnabled,
          creator_email: creatorEmail.trim() || null // AQUÍ GUARDAMOS LO QUE HAYA EN EL INPUT
        }])
        .select()
        .single();

      if (eventError) throw eventError;

      const fieldsToInsert = fields.map((f, index) => ({
        event_id: eventData.id,
        field_name: f.label,
        field_type: f.type,
        is_required: f.isRequired,
        is_default: f.isDefault,
        options: JSON.stringify({ choices: f.options, logic: f.logic || null }),
        order_index: index
      }));

      const { error: fieldsError } = await supabase
        .from('event_fields')
        .insert(fieldsToInsert);

      if (fieldsError) throw fieldsError;

      showToast('¡Éxito!', 'El evento y su formulario fueron creados correctamente.', 'success');
      setTimeout(() => router.push('/admin/dashboard'), 1500);

    } catch (error: any) {
      showToast('Error del Servidor', error.message || 'No se pudo guardar el evento.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto relative pb-20">
      
      {/* CONTENEDOR DE TOASTS */}
      <div className="fixed top-6 right-6 z-9999 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.9 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-start gap-3 w-80 p-4 rounded-xl shadow-2xl border backdrop-blur-xl ${
                toast.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-900 dark:text-red-200' : 
                toast.type === 'success' ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-900 dark:text-green-200' : 
                'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-900 dark:text-blue-200'
              }`}
            >
              {toast.type === 'error' && <AlertCircle className="h-6 w-6 text-red-500 shrink-0" />}
              {toast.type === 'success' && <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />}
              {toast.type === 'info' && <Info className="h-6 w-6 text-blue-500 shrink-0" />}
              
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{toast.title}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">{toast.desc}</p>
              </div>
              
              <button type="button" onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Crear Nuevo Evento</h1>
          <p className="text-gray-600 dark:text-gray-400">Configura la información y diseña el formulario de inscripción.</p>
        </div>
        <button 
          onClick={handleSaveEvent}
          disabled={isSaving}
          className={`bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-lg flex items-center justify-center gap-2 transition-all shadow-4d-static active:translate-y-1 active:shadow-none cursor-pointer ${
            isSaving ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> 
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" /> 
              Publicar Evento
            </>
          )}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA: ACORDEÓN DE FUNCIONALIDADES */}
        <div className="lg:col-span-4 space-y-4">
          
          <AccordionSection id="detalles" icon={Settings} title="Detalles y Diseño Base" isOpen={openSection === 'detalles'} onToggle={toggleSection}>
            <div className="space-y-1.5">
              <label className="text-sm text-gray-700 dark:text-gray-400 font-bold">Nombre del Evento</label>
              <input 
                type="text" 
                value={eventName} 
                onChange={(e) => setEventName(e.target.value)} 
                placeholder="Ej. Congreso Nacional de Ingeniería 2026" 
                className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:border-accent outline-none" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-700 dark:text-gray-400 font-bold flex items-center gap-2">
                <Link2 className="h-4 w-4"/> Alias para la URL (Slug)
              </label>
              <div className="flex bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden group">
                  <span className="bg-gray-100 dark:bg-white/5 px-3 py-3 text-gray-500 text-sm border-r border-gray-300 dark:border-gray-700 flex items-center select-none">
                      acofi.org/e/
                  </span>
                  <input 
                    type="text" 
                    value={eventSlug} 
                    onChange={handleSlugFormat} 
                    placeholder="ej-congreso-2026" 
                    className="w-full bg-transparent py-3 px-4 text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600" 
                  />
              </div>
              <p className="text-[10px] text-gray-500">Link público: acofi.org/e/{eventSlug || '[código-automático]'}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-700 dark:text-gray-400 font-bold flex items-center gap-2">
                <AlignLeft className="h-4 w-4"/> Descripción (Landing Page)
              </label>
              <textarea 
                value={eventDescription} 
                onChange={(e) => setEventDescription(e.target.value)} 
                placeholder="Escribe aquí los detalles del evento..." 
                rows={4}
                className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:border-accent outline-none resize-none" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700 dark:text-gray-400 font-bold cursor-pointer">Logo Oficial</label>
                <div 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary bg-gray-50 dark:bg-black/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" className="h-full w-full object-contain p-2" />
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6 text-gray-400 mb-1 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-gray-500">Subir Logo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleLogoChange} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-gray-700 dark:text-gray-400 font-bold cursor-pointer">Banner Portada</label>
                <div 
                  onClick={() => bannerInputRef.current?.click()} 
                  className="w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary bg-gray-50 dark:bg-black/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group"
                >
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <ImagePlus className="h-6 w-6 text-gray-400 mb-1 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-gray-500">Subir Portada</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" ref={bannerInputRef} onChange={handleBannerChange} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm text-gray-700 dark:text-gray-400 font-bold flex items-center gap-2">
                <Palette className="h-4 w-4"/> Identidad de Marca (Colores)
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-gray-500 font-bold">Fondo General</label>
                  <div className="flex bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                    <input 
                      type="color" 
                      value={bgColor} 
                      onChange={(e) => setBgColor(e.target.value)} 
                      className="w-12 h-10 cursor-pointer border-0 p-0 bg-transparent" 
                    />
                    <input 
                      type="text" 
                      value={bgColor.toUpperCase()} 
                      onChange={(e) => setBgColor(e.target.value)} 
                      className="w-full bg-transparent px-2 text-xs text-gray-900 dark:text-white outline-none" 
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-gray-500 font-bold">Color Primario</label>
                  <div className="flex bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)} 
                      className="w-12 h-10 cursor-pointer border-0 p-0 bg-transparent" 
                    />
                    <input 
                      type="text" 
                      value={primaryColor.toUpperCase()} 
                      onChange={(e) => setPrimaryColor(e.target.value)} 
                      className="w-full bg-transparent px-2 text-xs text-gray-900 dark:text-white outline-none" 
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-gray-500 font-bold">Color Botón</label>
                  <div className="flex bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                    <input 
                      type="color" 
                      value={accentColor} 
                      onChange={(e) => setAccentColor(e.target.value)} 
                      className="w-12 h-10 cursor-pointer border-0 p-0 bg-transparent" 
                    />
                    <input 
                      type="text" 
                      value={accentColor.toUpperCase()} 
                      onChange={(e) => setAccentColor(e.target.value)} 
                      className="w-full bg-transparent px-2 text-xs text-gray-900 dark:text-white outline-none" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection id="seguridad" icon={ShieldAlert} title="Acceso y Restricciones" isOpen={openSection === 'seguridad'} onToggle={toggleSection}>
            
            <div className="flex items-center justify-between bg-gray-50 dark:bg-black/30 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex-1 pr-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Bot className="h-4 w-4 text-purple-500"/> Protección Anti-Bots
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Verifica y detiene ataques automatizados con Cloudflare Turnstile.</p>
              </div>
              <button 
                type="button" 
                role="switch"
                aria-checked={turnstileEnabled}
                onClick={() => setTurnstileEnabled(!turnstileEnabled)} 
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  turnstileEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  turnstileEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-white/5">
              <label className="text-sm text-gray-700 dark:text-gray-400 font-bold flex items-center gap-2">
                <Lock className="h-4 w-4"/> Restringir con Contraseña (Opcional)
              </label>
              <input 
                type="text" 
                value={formPassword} 
                onChange={(e) => setFormPassword(e.target.value)} 
                placeholder="Dejar vacío para formulario abierto..." 
                className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:border-accent outline-none" 
              />
              <p className="text-[10px] text-gray-500">Si digitas una clave, los usuarios deberán colocarla para poder rellenar el formulario.</p>
            </div>

            <div className="flex items-center justify-between bg-gray-50 dark:bg-black/30 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex-1 pr-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-primary"/> Una Respuesta por Equipo
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Bloquea respuestas múltiples del mismo dispositivo o IP.</p>
              </div>
              <button 
                type="button" 
                role="switch"
                aria-checked={onePerDevice}
                onClick={() => setOnePerDevice(!onePerDevice)} 
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  onePerDevice ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  onePerDevice ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-700 dark:text-gray-400 font-bold flex items-center gap-2">
                <Users className="h-4 w-4"/> Aforo Máximo (Capacidad)
              </label>
              <input 
                type="number" 
                value={maxCapacity} 
                onChange={(e) => setMaxCapacity(e.target.value)} 
                placeholder="Ej. 1000 (Vacio para ilimitado)" 
                className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:border-accent outline-none" 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm text-gray-700 dark:text-gray-400 font-bold flex items-center gap-2">
                <Clock className="h-4 w-4"/> Fecha y Hora de Cierre Automático
              </label>
              <input 
                type="datetime-local" 
                value={closeDate} 
                onChange={(e) => setCloseDate(e.target.value)} 
                className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:border-accent outline-none" 
              />
            </div>
          </AccordionSection>

          <AccordionSection id="comunicaciones" icon={Mail} title="Comunicaciones y Mensajes" isOpen={openSection === 'comunicaciones'} onToggle={toggleSection}>
            <div className="flex items-center justify-between bg-gray-50 dark:bg-black/30 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Enviar Ticket por Correo</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Envía un código QR automático al inscribirse.</p>
              </div>
              <button 
                type="button" 
                role="switch"
                aria-checked={sendNotifications}
                onClick={() => setSendNotifications(!sendNotifications)} 
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  sendNotifications ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  sendNotifications ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* CAMPO DINÁMICO PARA EL CORREO DEL COORDINADOR */}
            <AnimatePresence>
              {sendNotifications && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }} 
                  className="space-y-1.5 pt-4 border-t border-gray-200 dark:border-white/5 overflow-hidden"
                >
                  <label className="text-sm text-gray-700 dark:text-gray-400 font-bold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary"/> Correo para Alertas (Coordinador)
                  </label>
                  <input 
                    type="email" 
                    value={creatorEmail} 
                    onChange={(e) => setCreatorEmail(e.target.value)} 
                    placeholder="Ej. coordinador@universidad.edu.co" 
                    className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:border-accent outline-none" 
                  />
                  <p className="text-[10px] text-gray-500">A este correo llegarán las alertas cuando alguien se inscriba al evento.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <ThumbsUp className="h-4 w-4 text-accent"/> Pantalla de Agradecimiento
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Personaliza el cierre del registro u obliga una redirección externa.</p>
                </div>
                <button 
                  type="button" 
                  role="switch"
                  aria-checked={thankYouEnabled}
                  onClick={() => setThankYouEnabled(!thankYouEnabled)} 
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    thankYouEnabled ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    thankYouEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {thankYouEnabled && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-600 dark:text-gray-400 font-bold">Texto de Cierre Personalizado</label>
                      <textarea 
                        value={thankYouText} 
                        onChange={(e) => setThankYouText(e.target.value)} 
                        placeholder="Ej: ¡Inscripción aprobada exitosamente! Conserva el código QR que enviamos a tu buzón institucional." 
                        rows={3} 
                        className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-900 dark:text-white focus:border-accent outline-none resize-none" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-600 dark:text-gray-400 font-bold">Redirección Automática (URL)</label>
                      <input 
                        type="url" 
                        value={thankYouUrl} 
                        onChange={(e) => setThankYouUrl(e.target.value)} 
                        placeholder="https://chat.whatsapp.com/grupo-del-evento" 
                        className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-900 dark:text-white focus:border-accent outline-none" 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-white/5 mt-4">
              <FeedbackAdminPanel 
                enabled={sendFeedbackSurvey} 
                onChange={setSendFeedbackSurvey} 
              />
            </div>
          </AccordionSection>

          <AccordionSection id="legal" icon={ShieldCheck} title="Políticas Legal e Identidad" isOpen={openSection === 'legal'} onToggle={toggleSection}>
            <div className="flex items-center justify-between bg-gray-50 dark:bg-black/30 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Casilla Habeas Data</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Obligatoria para inscribirse.</p>
              </div>
              <button 
                type="button" 
                role="switch"
                aria-checked={requireHabeasData}
                onClick={() => setRequireHabeasData(!requireHabeasData)} 
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  requireHabeasData ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  requireHabeasData ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {requireHabeasData && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }} 
                  className="space-y-1.5 overflow-hidden"
                >
                    <label className="text-xs text-gray-500 font-bold flex items-center gap-1.5">
                       <Link2 className="h-3 w-3"/> URL de la Política Externa (Opcional)
                    </label>
                    <input 
                      type="url" 
                      value={habeasDataUrl} 
                      onChange={(e) => setHabeasDataUrl(e.target.value)} 
                      placeholder="Ej. https://acofi.org/politica-datos" 
                      className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 px-4 text-xs text-gray-900 dark:text-white focus:border-accent outline-none" 
                    />
                </motion.div>
              )}
            </AnimatePresence>
          </AccordionSection>

        </div>

        {/* COLUMNA DERECHA: CONSTRUCTOR DINÁMICO DE FORMULARIOS */}
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-surface border border-gray-200 dark:border-white/5 p-6 md:p-8 rounded-2xl shadow-sm dark:shadow-none">
            
            <div className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-white/5 pb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Diseño del Formulario de Inscripción</h2>
              <span className="text-xs bg-primary/10 dark:bg-primary/20 text-primary px-3 py-1 rounded-full font-bold">
                {fields.length} Preguntas
              </span>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {fields.map((field, index) => {
                  const availableParentQuestions = fields.slice(0, index).filter(f => f.type === 'select' || f.type === 'radio');
                  const selectedParent = field.logic?.dependsOnId ? availableParentQuestions.find(f => f.id === field.logic!.dependsOnId) : null;

                  return (
                    <motion.div 
                      key={field.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      className={`group bg-gray-50 dark:bg-black/30 border ${field.logic ? 'border-primary/50 shadow-[0_0_15px_rgba(79,70,229,0.1)]' : 'border-gray-200 dark:border-gray-800'} rounded-xl p-5 hover:border-gray-400 dark:hover:border-gray-600 transition-all relative`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        
                        <div className="md:col-span-4">
                          <input 
                            type="text" 
                            value={field.label} 
                            onChange={(e) => updateField(field.id, 'label', e.target.value)} 
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-accent outline-none text-gray-900 dark:text-white font-bold px-1 py-1 transition-colors" 
                            placeholder="Escribe la pregunta o etiqueta..." 
                          />
                        </div>

                        <div className="md:col-span-3">
                          <select 
                            value={field.type} 
                            onChange={(e) => updateField(field.id, 'type', e.target.value)} 
                            className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 rounded-lg p-2 focus:outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="text">Texto Corto</option>
                            <option value="textarea">Párrafo Largo</option>
                            <option value="email">Correo</option>
                            <option value="number">Número</option>
                            <option value="date">Fecha</option>
                            <option value="select">Lista Desplegable</option>
                            <option value="radio">Única Respuesta</option>
                            <option value="checkbox-group">Selección Múltiple</option>
                            <option value="checkbox">Casilla Verificación (Sí/No)</option>
                          </select>
                        </div>

                        <div className="md:col-span-3 flex items-center justify-end gap-3">
                          <span className="text-xs text-gray-500 font-bold">Obligatorio</span>
                          <button 
                            type="button" 
                            role="switch"
                            aria-checked={field.isRequired}
                            onClick={() => updateField(field.id, 'isRequired', !field.isRequired)} 
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${field.isRequired ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${field.isRequired ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-1">
                          <button 
                            type="button" 
                            onClick={() => updateField(field.id, '_ui_showLogic', !field._ui_showLogic)} 
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${field.logic ? 'bg-primary text-white' : 'text-gray-500 hover:text-accent hover:bg-accent/10'}`}
                            title="Configurar Lógica Condicional"
                          >
                            <GitBranch className="h-4 w-4" />
                          </button>
                          
                          <button 
                            type="button" 
                            onClick={() => handleRemoveField(field.id)} 
                            className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                      </div>

                      {field._ui_showLogic && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 bg-primary/5 -mx-5 px-5 pb-2 rounded-b-xl overflow-hidden">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                              <GitBranch className="h-4 w-4" /> Lógica Condicional
                            </h4>
                            {field.logic && (
                                <button type="button" onClick={() => clearFieldLogic(field.id)} className="text-xs text-red-500 hover:text-red-600 cursor-pointer">Quitar Lógica</button>
                            )}
                          </div>
                          
                          {availableParentQuestions.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">No hay preguntas previas condicionales válidas.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="text-xs text-gray-500 font-bold">Acción:</label>
                                <select value={field.logic?.action || 'show'} onChange={(e) => updateFieldLogic(field.id, 'action', e.target.value)} className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg p-2 focus:border-primary outline-none cursor-pointer">
                                  <option value="show">Mostrar la pregunta si...</option>
                                  <option value="hide">Ocultar la pregunta si...</option>
                                  <option value="require">Hacer Obligatoria si...</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 font-bold">Depende de la pregunta:</label>
                                <select value={field.logic?.dependsOnId || ''} onChange={(e) => updateFieldLogic(field.id, 'dependsOnId', e.target.value)} className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg p-2 focus:border-primary outline-none cursor-pointer">
                                  <option value="">Seleccionar...</option>
                                  {availableParentQuestions.map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 font-bold">Y su respuesta sea igual a:</label>
                                <select value={field.logic?.dependsOnValue || ''} onChange={(e) => updateFieldLogic(field.id, 'dependsOnValue', e.target.value)} disabled={!field.logic?.dependsOnId} className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg p-2 disabled:opacity-50 focus:border-primary outline-none cursor-pointer">
                                  <option value="">Seleccionar respuesta...</option>
                                  {selectedParent?.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox-group') && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-3">
                          
                          <div className="flex justify-between items-center">
                            <label className="text-xs text-gray-500 font-bold">Opciones Disponibles</label>
                            <div className="relative shrink-0">
                                <input type="file" accept=".xlsx, .xls" id={`excel-${field.id}`} className="hidden" onChange={(e) => handleExcelForOptions(field.id, e)} />
                                <label htmlFor={`excel-${field.id}`} className="cursor-pointer bg-primary/10 hover:bg-primary text-primary hover:text-white text-[11px] font-bold py-1.5 px-3 rounded-md flex items-center gap-1.5 transition-colors border border-primary/20">
                                    <FileSpreadsheet className="h-3 w-3" /> Importar Excel
                                </label>
                            </div>
                          </div>
                          
                          <input 
                            type="text" 
                            onKeyDown={(e) => handleManualOptionAdd(field.id, e)} 
                            className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg p-2.5 outline-none focus:border-accent" 
                            placeholder="Escribe la opción y presiona ENTER..." 
                          />
                          
                          {field.options.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {field.options.map(opt => (
                                <div key={opt} className="flex items-center gap-1.5 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-2.5 py-1.5 rounded-md text-xs text-gray-700 dark:text-gray-300">
                                  <span>{opt}</span>
                                  {opt !== 'Otra' && (
                                    <button type="button" onClick={() => updateField(field.id, 'options', field.options.filter(o => o !== opt))} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              <button 
                type="button" 
                onClick={handleAddField} 
                className="w-full mt-6 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-accent bg-transparent text-gray-500 hover:text-accent font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="h-5 w-5" /> 
                Añadir Pregunta Nueva
              </button>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}