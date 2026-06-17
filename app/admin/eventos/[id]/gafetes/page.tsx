"use client";

import { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, Printer, ArrowLeft, Search, CheckSquare, Square, Filter } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function GafetesPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS PARA BÚSQUEDA Y SELECCIÓN
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!eventId) return;
    loadData();
  }, [eventId]);

  async function loadData() {
    setLoading(true);
    
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();
    setEvent(eventData);

    const { data: fieldsData } = await supabase
      .from('event_fields')
      .select('*')
      .eq('event_id', eventId);
    setFields(fieldsData || []);

    const { data: regsData } = await supabase
      .from('registrations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }); 
    
    setRegistrations(regsData || []);
    setLoading(false);
  }

  // MOTOR INTELIGENTE PARA EXTRAER CAMPOS (SOPORTA SYSTEM_KEY)
  const getFieldValue = (reg: any, keyword: string) => {
    const field = fields.find((f: any) => {
      let opts: any = {};
      try { opts = JSON.parse(f.options || '{}'); } catch(e){}
      return opts.system_key === keyword || f.field_name?.toLowerCase().includes(keyword.toLowerCase());
    });
    return field ? reg.form_data[field.id] : '';
  };

  const filteredRegistrations = useMemo(() => {
    if (!searchTerm) return registrations;
    return registrations.filter((reg: any) => {
      const docMatch = reg.historic_user_doc.includes(searchTerm);
      const nombre = getFieldValue(reg, 'nombre');
      const apellido = getFieldValue(reg, 'apellido');
      const fullName = [nombre, apellido].filter(Boolean).join(' ');
      const nameMatch = fullName.toLowerCase().includes(searchTerm.toLowerCase());
      const instMatch = getFieldValue(reg, 'institu')?.toLowerCase().includes(searchTerm.toLowerCase());
      return docMatch || nameMatch || instMatch;
    });
  }, [registrations, searchTerm, fields]);

  const itemsToPrint = selectedIds.size > 0 
    ? filteredRegistrations.filter(reg => selectedIds.has(reg.id))
    : filteredRegistrations;

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAllFiltered = () => {
    if (selectedIds.size === filteredRegistrations.length) {
      setSelectedIds(newSet => {
        filteredRegistrations.forEach(r => newSet.delete(r.id));
        return new Set(newSet);
      });
    } else {
      const newSet = new Set(selectedIds);
      filteredRegistrations.forEach(r => newSet.add(r.id));
      setSelectedIds(newSet);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return <div className="text-white text-center mt-20">Evento no encontrado</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-black">
      
      {/* BARRA SUPERIOR DE CONTROLES (Se oculta al imprimir) */}
      <div className="print:hidden bg-surface border-b border-white/5 p-4 flex flex-col md:flex-row justify-between items-center text-white sticky top-0 z-50 shadow-xl gap-4">
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Link href={`/admin/eventos/${eventId}`}>
            <button className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Gafetes: {event.name}</h1>
            <p className="text-sm text-gray-400">
              {itemsToPrint.length} listos para imprimir
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Buscar para imprimir..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>

          <button 
            onClick={selectAllFiltered}
            className="text-sm font-bold text-gray-400 hover:text-white whitespace-nowrap flex items-center gap-2 px-3 cursor-pointer"
          >
            <Filter className="h-4 w-4"/>
            {selectedIds.size > 0 ? 'Limpiar Selección' : 'Seleccionar Vistos'}
          </button>

          <button 
            onClick={() => window.print()} 
            className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 shadow-4d-static transition-transform active:translate-y-1 active:shadow-none whitespace-nowrap cursor-pointer"
          >
            <Printer className="h-5 w-5" /> Imprimir ({itemsToPrint.length})
          </button>
        </div>
      </div>

      {/* ÁREA DE IMPRESIÓN (Optimizada para hojas A4 y CSS seguro) */}
      <div className="p-8 print:p-0 w-full max-w-[210mm] mx-auto bg-white print:bg-transparent min-h-screen">
         
         {itemsToPrint.length === 0 ? (
           <div className="print:hidden h-64 flex items-center justify-center text-gray-400 font-medium">
             No hay inscritos que coincidan con la búsqueda.
           </div>
         ) : (
           <div className="grid grid-cols-2 gap-6 print:gap-0 print:block">
              {itemsToPrint.map((reg: any, index: number) => {
                 const nombre = getFieldValue(reg, 'nombre');
                 const apellido = getFieldValue(reg, 'apellido');
                 const fullName = [nombre, apellido].filter(Boolean).join(' ') || 'Sin Nombre';
                 
                 const cargo = getFieldValue(reg, 'cargo');
                 const inst = getFieldValue(reg, 'institu');
                 const isSelected = selectedIds.has(reg.id);

                 return (
                   <div 
                     key={reg.id}
                     onClick={() => toggleSelection(reg.id)}
                     className={`
                       bg-white border-2 rounded-2xl overflow-hidden shadow-sm h-[130mm] w-[95mm] flex flex-col 
                       print:border print:border-gray-300 print:break-inside-avoid print:shadow-none mx-auto relative
                       print:mb-4 print:float-left print:mx-2 cursor-pointer transition-all
                       ${isSelected ? 'ring-4 ring-primary border-transparent' : 'border-gray-200 hover:border-primary/50'}
                     `}
                   >
                      <div className="print:hidden absolute top-3 right-3 z-10 bg-white rounded-md shadow-sm">
                        {isSelected ? <CheckSquare className="h-6 w-6 text-primary"/> : <Square className="h-6 w-6 text-gray-300"/>}
                      </div>

                      <div 
                        className="h-5 w-full shrink-0 print:bg-black" 
                        style={{ backgroundColor: event.primary_color || '#4f46e5', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      ></div>
                      
                      <div className="p-6 flex flex-col items-center flex-1 text-center">
                        <div className="h-16 w-full flex items-center justify-center mb-6">
                          {event.logo_url ? (
                            <img src={event.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="font-bold text-gray-400 uppercase tracking-widest text-xs">ACOFI</span>
                          )}
                        </div>
                        
                        <h2 className="text-2xl font-black text-gray-900 leading-tight mb-2 uppercase wrap-break-word w-full line-clamp-2">
                          {fullName}
                        </h2>
                        {cargo && <p className="text-md font-bold text-gray-600 mb-1 line-clamp-1">{cargo}</p>}
                        {inst && <p className="text-sm font-medium text-gray-500 mb-6 line-clamp-2">{inst}</p>}
                        
                        <div className="mt-auto mb-2 p-3 bg-white rounded-xl border-2 border-gray-100 shadow-sm inline-block">
                           <QRCodeSVG value={reg.historic_user_doc} size={110} level="H" />
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono tracking-widest">{reg.historic_user_doc}</p>
                      </div>
                      
                      <div 
                        className="py-3 text-center shrink-0"
                        style={{ backgroundColor: '#111827', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      >
                         <p className="text-xs text-white font-bold truncate px-4">
                           {event.name}
                         </p>
                      </div>
                   </div>
                 );
              })}
           </div>
         )}
      </div>
    </div>
  );
}