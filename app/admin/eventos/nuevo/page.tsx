"use client";

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Settings, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  CheckCircle2, 
  Bell, 
  GitBranch, 
  X, 
  ShieldAlert, 
  Clock, 
  Users, 
  Palette, 
  ImagePlus, 
  AlignLeft,
  Link as LinkIcon,
  ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../../lib/supabase';
import { useRouter } from 'next/navigation';

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

export default function NuevoEventoPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  
  const [eventName, setEventName] = useState('');
  const [eventSlug, setEventSlug] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [sendNotifications, setSendNotifications] = useState(true);
  
  const [requireHabeasData, setRequireHabeasData] = useState(true);
  const [habeasDataUrl, setHabeasDataUrl] = useState('');

  const [maxCapacity, setMaxCapacity] = useState('');
  const [closeDate, setCloseDate] = useState('');
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [accentColor, setAccentColor] = useState('#0ea5e9');

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
    // Convierte a minúsculas, reemplaza espacios por guiones y quita caracteres especiales
    const formatted = e.target.value
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');
    setEventSlug(formatted);
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
        if (!uniqueOptions.includes('Otra')) uniqueOptions.push('Otra');

        updateField(id, 'options', uniqueOptions);
        alert(`Se cargaron ${uniqueOptions.length} opciones exitosamente.`);
      } catch (error) {
        alert("Error leyendo el archivo Excel.");
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
    if (!eventName) return alert("Debes asignarle un nombre al evento.");
    
    setIsSaving(true);

    try {
      // Validar si el slug ya existe antes de subir imágenes
      if (eventSlug) {
        const { data: existingSlug } = await supabase.from('events').select('id').eq('slug', eventSlug).single();
        if (existingSlug) {
          throw new Error("El Alias del evento (URL) ya está en uso. Por favor, elige otro.");
        }
      }

      let logoUrl = null;
      let bannerUrl = null;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile);
        if (!uploadError) {
          logoUrl = supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
        }
      }

      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `banner-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, bannerFile);
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
          max_capacity: maxCapacity ? parseInt(maxCapacity) : null,
          close_date: closeDate ? new Date(closeDate).toISOString() : null,
          primary_color: primaryColor,
          accent_color: accentColor
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

      const { error: fieldsError } = await supabase.from('event_fields').insert(fieldsToInsert);
      if (fieldsError) throw fieldsError;

      alert("¡Evento y formulario creados con éxito!");
      router.push('/admin/dashboard');

    } catch (error: any) {
      alert("Error guardando el evento: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto relative pb-20">
      
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Crear Nuevo Evento</h1>
          <p className="text-gray-400">Configura la información y diseña el formulario de inscripción.</p>
        </div>
        <button 
          onClick={handleSaveEvent}
          disabled={isSaving}
          className={`bg-primary text-white font-bold py-3 px-8 rounded-lg flex items-center justify-center gap-2 transition-transform shadow-4d-static ${
            isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/90 active:translate-y-1 active:shadow-none'
          }`}
        >
          {isSaving ? (
            <span className="animate-pulse">Guardando...</span>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" /> 
              Publicar Evento
            </>
          )}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface border border-white/5 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" /> 
              Ajustes Principales
            </h2>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Nombre del Evento</label>
                <input 
                  type="text" 
                  value={eventName} 
                  onChange={(e) => setEventName(e.target.value)} 
                  placeholder="Ej. Congreso EIEI 2026" 
                  className="w-full bg-black/50 border border-gray-700 rounded-lg py-3 px-4 text-white focus:border-accent outline-none" 
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm text-gray-400 font-medium flex items-center gap-2">
                  <LinkIcon className="h-4 w-4"/> Alias del Evento (URL Amigable)
                </label>
                <div className="flex bg-black/50 border border-gray-700 rounded-lg overflow-hidden focus-within:border-accent">
                  <span className="bg-white/5 px-3 py-3 text-gray-500 text-sm border-r border-gray-700 flex items-center whitespace-nowrap">
                    acofi.org/e/
                  </span>
                  <input 
                    type="text" 
                    value={eventSlug} 
                    onChange={handleSlugFormat} 
                    placeholder="congreso-2026" 
                    className="w-full bg-transparent py-3 px-4 text-white outline-none" 
                  />
                </div>
                <p className="text-[10px] text-gray-500">Dejar en blanco para generar código automático.</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-sm text-gray-400 font-medium flex items-center gap-2">
                  <AlignLeft className="h-4 w-4"/> Descripción (Landing Page)
                </label>
                <textarea 
                  value={eventDescription} 
                  onChange={(e) => setEventDescription(e.target.value)} 
                  placeholder="Escribe aquí los detalles del evento, agenda o un mensaje de bienvenida..." 
                  rows={4}
                  className="w-full bg-black/50 border border-gray-700 rounded-lg py-3 px-4 text-white focus:border-accent outline-none resize-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Logo Oficial</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className="w-full h-24 border-2 border-dashed border-gray-700 hover:border-primary bg-black/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Preview" className="h-full w-full object-contain p-2" />
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6 text-gray-500 mb-1 group-hover:text-primary transition-colors" />
                        <span className="text-[10px] text-gray-400">Subir Logo</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleLogoChange} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Banner Portada</label>
                  <div 
                    onClick={() => bannerInputRef.current?.click()} 
                    className="w-full h-24 border-2 border-dashed border-gray-700 hover:border-primary bg-black/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group"
                  >
                    {bannerPreview ? (
                      <img src={bannerPreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <ImagePlus className="h-6 w-6 text-gray-500 mb-1 group-hover:text-primary transition-colors" />
                        <span className="text-[10px] text-gray-400">Subir Portada</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" ref={bannerInputRef} onChange={handleBannerChange} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="text-sm text-gray-400 font-medium flex items-center gap-2">
                  <Palette className="h-4 w-4"/> Identidad de Marca
                </label>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-gray-500">Color Primario</label>
                    <div className="flex bg-black/50 border border-gray-700 rounded-lg overflow-hidden">
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
                        className="w-full bg-transparent px-2 text-xs text-white outline-none" 
                      />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-gray-500">Color Botón</label>
                    <div className="flex bg-black/50 border border-gray-700 rounded-lg overflow-hidden">
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
                        className="w-full bg-transparent px-2 text-xs text-white outline-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-surface border border-white/5 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" /> 
              Legal y Privacidad
            </h2>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Casilla Habeas Data</h3>
                  <p className="text-xs text-gray-400">Obligatorio para inscribirse</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setRequireHabeasData(!requireHabeasData)} 
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    requireHabeasData ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                >
                  <span 
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      requireHabeasData ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                  />
                </button>
              </div>

              <AnimatePresence>
                {requireHabeasData && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <div className="space-y-2 mt-2">
                      <label className="text-xs text-gray-500 font-medium">Enlace de la Política (URL)</label>
                      <input 
                        type="url" 
                        value={habeasDataUrl} 
                        onChange={(e) => setHabeasDataUrl(e.target.value)} 
                        placeholder="Ej. https://acofi.edu.co/privacidad" 
                        className="w-full bg-black/50 border border-gray-700 rounded-lg py-2.5 px-4 text-sm text-white focus:border-accent outline-none" 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-surface border border-white/5 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-yellow-500" /> 
              Control de Aforo
            </h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium flex items-center gap-2">
                  <Users className="h-4 w-4"/> Aforo Máximo (Opcional)
                </label>
                <input 
                  type="number" 
                  value={maxCapacity} 
                  onChange={(e) => setMaxCapacity(e.target.value)} 
                  placeholder="Ej. 500" 
                  className="w-full bg-black/50 border border-gray-700 rounded-lg py-3 px-4 text-white focus:border-accent outline-none" 
                />
                <p className="text-xs text-gray-500">Se pausará al llegar al límite.</p>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-sm text-gray-400 font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4"/> Fecha y Hora de Cierre
                </label>
                <input 
                  type="datetime-local" 
                  value={closeDate} 
                  onChange={(e) => setCloseDate(e.target.value)} 
                  className="w-full bg-black/50 border border-gray-700 rounded-lg py-3 px-4 text-white focus:border-accent outline-none" 
                />
                <p className="text-xs text-gray-500">El registro se cerrará automáticamente.</p>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Constructor de Preguntas */}
        <div className="lg:col-span-8">
          <div className="bg-surface border border-white/5 p-6 md:p-8 rounded-2xl">
            
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <h2 className="text-xl font-bold text-white">Campos del Formulario</h2>
              <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-medium">
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
                      className={`group bg-black/30 border ${
                        field.logic ? 'border-primary/50 shadow-[0_0_15px_rgba(79,70,229,0.1)]' : 'border-gray-800'
                      } rounded-xl p-5 hover:border-gray-600 transition-all relative`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        
                        <div className="md:col-span-4">
                          <input 
                            type="text" 
                            value={field.label} 
                            onChange={(e) => updateField(field.id, 'label', e.target.value)} 
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-700 focus:border-accent outline-none text-white font-medium px-1 py-1 transition-colors" 
                            placeholder="Escribe la pregunta..." 
                          />
                        </div>

                        <div className="md:col-span-3">
                          <select 
                            value={field.type} 
                            onChange={(e) => updateField(field.id, 'type', e.target.value)} 
                            className="w-full bg-black/50 border border-gray-700 text-sm text-gray-300 rounded-lg p-2 focus:outline-none focus:border-accent"
                          >
                            <option value="text">Texto Corto</option>
                            <option value="textarea">Párrafo Largo</option>
                            <option value="email">Correo</option>
                            <option value="number">Número</option>
                            <option value="date">Fecha</option>
                            <option value="select">Lista Desplegable</option>
                            <option value="radio">Única Respuesta (Examen)</option>
                            <option value="checkbox-group">Selección Múltiple</option>
                            <option value="checkbox">Casilla Verificación (Sí/No)</option>
                          </select>
                        </div>

                        <div className="md:col-span-3 flex items-center justify-end gap-3">
                          <span className="text-xs text-gray-400 font-medium">Obligatorio</span>
                          <button 
                            type="button" 
                            onClick={() => updateField(field.id, 'isRequired', !field.isRequired)} 
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                              field.isRequired ? 'bg-primary' : 'bg-gray-700'
                            }`}
                          >
                            <span 
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                                field.isRequired ? 'translate-x-4' : 'translate-x-0'
                              }`} 
                            />
                          </button>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-1">
                          <button 
                            type="button" 
                            onClick={() => updateField(field.id, '_ui_showLogic', !field._ui_showLogic)} 
                            className={`p-2 rounded-lg transition-colors ${
                              field.logic ? 'bg-primary text-white' : 'text-gray-500 hover:text-accent hover:bg-accent/10'
                            }`}
                          >
                            <GitBranch className="h-4 w-4" />
                          </button>
                          
                          <button 
                            type="button" 
                            onClick={() => handleRemoveField(field.id)} 
                            className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                      </div>

                      {field._ui_showLogic && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: 'auto' }} 
                          className="mt-4 pt-4 border-t border-gray-800 bg-primary/5 -mx-5 px-5 pb-2 rounded-b-xl overflow-hidden"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                              <GitBranch className="h-4 w-4" /> Lógica Condicional
                            </h4>
                            {field.logic && (
                              <button 
                                type="button" 
                                onClick={() => clearFieldLogic(field.id)} 
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Quitar Lógica
                              </button>
                            )}
                          </div>
                          
                          {availableParentQuestions.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">
                              Crea una 'Lista Desplegable' o 'Única Respuesta' ANTES de esta para poder aplicar lógica.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="text-xs text-gray-400">Acción:</label>
                                <select 
                                  value={field.logic?.action || 'show'} 
                                  onChange={(e) => updateFieldLogic(field.id, 'action', e.target.value)} 
                                  className="w-full bg-black/50 border border-gray-700 text-sm text-white rounded-lg p-2 focus:border-primary outline-none"
                                >
                                  <option value="show">Mostrar la pregunta si...</option>
                                  <option value="hide">Ocultar la pregunta si...</option>
                                  <option value="require">Hacer Obligatoria si...</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-400">Depende de la pregunta:</label>
                                <select 
                                  value={field.logic?.dependsOnId || ''} 
                                  onChange={(e) => updateFieldLogic(field.id, 'dependsOnId', e.target.value)} 
                                  className="w-full bg-black/50 border border-gray-700 text-sm text-white rounded-lg p-2 focus:border-primary outline-none"
                                >
                                  <option value="">Seleccionar...</option>
                                  {availableParentQuestions.map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-400">Y su respuesta sea igual a:</label>
                                <select 
                                  value={field.logic?.dependsOnValue || ''} 
                                  onChange={(e) => updateFieldLogic(field.id, 'dependsOnValue', e.target.value)} 
                                  disabled={!field.logic?.dependsOnId} 
                                  className="w-full bg-black/50 border border-gray-700 text-sm text-white rounded-lg p-2 disabled:opacity-50 focus:border-primary outline-none"
                                >
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
                        <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col gap-3">
                          
                          <div className="flex justify-between items-center">
                            <label className="text-xs text-gray-400 font-medium">Opciones Disponibles</label>
                            <div className="relative shrink-0">
                              <input 
                                type="file" 
                                accept=".xlsx, .xls" 
                                id={`excel-${field.id}`} 
                                className="hidden" 
                                onChange={(e) => handleExcelForOptions(field.id, e)}
                              />
                              <label 
                                htmlFor={`excel-${field.id}`} 
                                className="cursor-pointer bg-primary/10 hover:bg-primary text-primary hover:text-white text-[11px] font-bold py-1.5 px-3 rounded-md flex items-center gap-1.5 transition-colors border border-primary/20"
                              >
                                <FileSpreadsheet className="h-3 w-3" /> 
                                Importar Excel
                              </label>
                            </div>
                          </div>
                          
                          <input 
                            type="text" 
                            onKeyDown={(e) => handleManualOptionAdd(field.id, e)} 
                            className="w-full bg-black/50 border border-gray-700 text-sm text-white rounded-lg p-2.5 outline-none focus:border-accent" 
                            placeholder="Escribe la opción y presiona ENTER..." 
                          />
                          
                          {field.options.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {field.options.map(opt => (
                                <div 
                                  key={opt} 
                                  className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-md text-xs text-gray-300"
                                >
                                  <span>{opt}</span>
                                  {opt !== 'Otra' && (
                                    <button 
                                      type="button" 
                                      onClick={() => updateField(field.id, 'options', field.options.filter(o => o !== opt))} 
                                      className="text-gray-500 hover:text-red-400 transition-colors"
                                    >
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
                className="w-full mt-6 border-2 border-dashed border-gray-700 hover:border-accent bg-transparent text-gray-400 hover:text-accent font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
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