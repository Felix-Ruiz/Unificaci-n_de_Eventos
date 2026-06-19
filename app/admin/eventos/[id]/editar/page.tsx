"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Settings, FileSpreadsheet, Image as ImageIcon, 
  CheckCircle2, GitBranch, X, ShieldAlert, Clock, Users, 
  Palette, ImagePlus, AlignLeft, Link2, ShieldCheck, Loader2, 
  AlertCircle, Info, Mail, ChevronDown, Lock, Smartphone, 
  ThumbsUp, Save, Bot, Globe, MessageSquare, Code, Eye, EyeOff
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../../../lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '../../../../../context/LanguageContext';
import FeedbackAdminPanel from '../../../../../components/FeedbackAdminPanel';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'radio' | 'checkbox-group' | 'number' | 'textarea' | 'checkbox' | 'date' | 'file';
  isRequired: boolean;
  options: string[];
  isDefault: boolean;
  logic?: { 
    dependsOnId: string; 
    dependsOnValue: string; 
    action: 'show' | 'hide' | 'require'; 
  } | null;
  _ui_showLogic?: boolean;
  allowOther?: boolean;
  system_key?: string;
  description?: string;
  _ui_showDescription?: boolean;
  _ui_expandedOptions?: boolean;
}

const defaultInstitutions = [
  "Corporación Unificada Nacional de Educación Superior, Bogotá, D.C.",
  "Corporación Universitaria Americana, Barranquilla",
  "Corporación Universitaria Americana, Medellín",
  "Corporación Universitaria Comfacauca, Popayán",
  "Corporación Universitaria del Caribe, Sincelejo",
  "Corporación Universitaria del Huila, Neiva",
  "Corporación Universitaria del Meta, Villavicencio",
  "Corporación Universitaria Empresarial Alexander von Humboldt, Armenia",
  "Corporación Universitaria Iberoamericana, Bogotá, D.C.",
  "Corporación Universitaria Lasallista, Caldas",
  "Corporación Universitaria Minuto de Dios, Bogotá, D.C.",
  "Corporación Universitaria Rafael Núñez, Cartagena",
  "Corporación Universitaria Remington, Medellín",
  "Escuela de Ingenieros Militares, Bogotá, D.C.",
  "Escuela Militar de Aviación Marco Fidel Suárez, Cali",
  "Escuela Militar de Cadetes General José María Córdova, Bogotá, D.C.",
  "Escuela Naval de Cadetes Almirante Padilla, Cartagena",
  "Escuela Tecnológica Instituto Técnico Central, Bogotá, D.C.",
  "Fundación de Educación Superior San José, Bogotá, D.C.",
  "Fundación Universitaria Católica del Norte, Medellín",
  "Fundación Universitaria Católica Lumen Gentium, Cali",
  "Fundación Universitaria Colombo Internacional, Cartagena",
  "Fundación Universitaria Compensar, Bogotá, D.C.",
  "Fundación Universitaria de San Gil, San Gil",
  "Fundación Universitaria del Área Andina, Valledupar",
  "Fundación Universitaria Konrad Lorenz, Bogotá, D.C.",
  "Fundación Universitaria los Libertadores, Bogotá, D.C.",
  "Fundación Universitaria San Mateo, Bogotá, D.C.",
  "Fundación Universitaria Tecnológico Comfenalco, Cartagena",
  "Institución Universitaria Antonio José Camacho, Cali",
  "Institución Universitaria de Barranquilla, Barranquilla",
  "Institución Universitaria de Envigado, Envigado",
  "Institución Universitaria Eam, Armenia",
  "Institución Universitaria Itm, Medellín",
  "Institución Universitaria Pascual Bravo, Medellín",
  "Politécnico Colombiano Jaime Isaza Cadavid, Medellín",
  "Politécnico Grancolombiano, Bogotá, D.C.",
  "Pontificia Universidad Javeriana, Bogotá, D.C.",
  "Pontificia Universidad Javeriana, Cali",
  "Tecnológico de Antioquia, Medellín",
  "Unidad Central del Valle del Cauca, Tuluá",
  "Universidad Antonio Nariño",
  "Universidad Autónoma de Bucaramanga, Bucaramanga",
  "Universidad Autónoma de Manizales, Manizales",
  "Universidad Autónoma de Occidente, Cali",
  "Universidad Autónoma del Caribe, Barranquilla",
  "Universidad Autónoma Latinoamericana, Medellín",
  "Universidad Católica de Colombia, Bogotá, D.C.",
  "Universidad Católica de Manizales, Manizales",
  "Universidad Católica de Oriente, Rionegro",
  "Universidad Católica de Pereira, Pereira",
  "Universidad Central, Bogotá, D.C.",
  "Universidad Cesmag, Pasto",
  "Universidad Cooperativa de Colombia, Ibagué",
  "Universidad Cooperativa de Colombia, Medellín",
  "Universidad de América, Bogotá, D.C.",
  "Universidad de Antioquia, Medellín",
  "Universidad de Bogotá Jorge Tadeo Lozano, Bogotá, D.C.",
  "Universidad de Boyacá, Tunja",
  "Universidad de Caldas, Manizales",
  "Universidad de Cartagena, Cartagena",
  "Universidad de Ciencias Aplicadas y Ambientales, Bogotá, D.C.",
  "Universidad de Córdoba, Montería",
  "Universidad de Cundinamarca",
  "Universidad de Ibagué, Ibagué",
  "Universidad de Investigación y Desarrollo, Bucaramanga",
  "Universidad de la Costa, Barranquilla",
  "Universidad de La Guajira, Riohacha",
  "Universidad de La Sabana, Chía",
  "Universidad de La Salle, Bogotá, D.C.",
  "Universidad de los Andes, Bogotá, D.C.",
  "Universidad de los Llanos, Villavicencio",
  "Universidad de Manizales, Manizales",
  "Universidad de Medellín, Medellín",
  "Universidad de Nariño, Pasto",
  "Universidad de Pamplona, Pamplona",
  "Universidad de San Buenaventura, Bogotá, D.C.",
  "Universidad de San Buenaventura, Cali",
  "Universidad de San Buenaventura, Medellín",
  "Universidad de Santander, Bucaramanga",
  "Universidad de Sucre, Sincelejo",
  "Universidad del Atlántico, Barranquilla",
  "Universidad del Cauca, Popayán",
  "Universidad del Magdalena, Santa Marta",
  "Universidad del Norte, Barranquilla",
  "Universidad del Quindío, Armenia",
  "Universidad del Rosario, Bogotá, D.C.",
  "Universidad del Sinú, Cartagena",
  "Universidad del Sinú, Montería",
  "Universidad del Tolima, Ibagué",
  "Universidad del Valle, Cali",
  "Universidad Distrital Francisco José de Caldas, Bogotá, D.C.",
  "Universidad Eafit, Medellín",
  "Universidad Ean, Bogotá, D.C.",
  "Universidad Ecci, Bogotá, D.C.",
  "Universidad Eia, Envigado",
  "Universidad El Bosque, Bogotá, D.C.",
  "Universidad Escuela Colombiana de Ingeniería Julio Garavito, Bogotá, D.C.",
  "Universidad Francisco de Paula Santander, Cúcuta",
  "Universidad Francisco de Paula Santander, Ocaña",
  "Universidad Icesi, Cali",
  "Universidad Industrial de Santander, Bucaramanga",
  "Universidad Internacional del Trópico Americano, Yopal",
  "Universidad La Gran Colombia, Armenia",
  "Universidad La Gran Colombia, Bogotá, D.C.",
  "Universidad Libre, Barranquilla",
  "Universidad Libre, Bogotá, D.C.",
  "Universidad Libre, Cali",
  "Universidad Mariana, Pasto",
  "Universidad Militar Nueva Granada, Bogotá, D.C.",
  "Universidad Nacional Abierta y a Distancia",
  "Universidad Nacional de Colombia, Bogotá, D.C.",
  "Universidad Nacional de Colombia, Manizales",
  "Universidad Nacional de Colombia, Medellín",
  "Universidad Nacional de Colombia, Palmira",
  "Universidad Pedagógica y Tecnológica de Colombia, Tunja",
  "Universidad Piloto de Colombia, Bogotá, D.C.",
  "Universidad Piloto de Colombia, Girardot",
  "Universidad Pontificia Bolivariana, Bucaramanga",
  "Universidad Pontificia Bolivariana, Medellín",
  "Universidad Pontificia Bolivariana, Montería",
  "Universidad Popular del Cesar, Valledupar",
  "Universidad Santiago de Cali, Cali",
  "Universidad Santo Tomás, Bogotá, D.C.",
  "Universidad Santo Tomás, Bucaramanga",
  "Universidad Sergio Arboleda, Bogotá, D.C.",
  "Universidad Simón Bolívar, Barranquilla",
  "Universidad Surcolombiana, Neiva",
  "Universidad Tecnológica de Bolívar, Cartagena",
  "Universidad Tecnológica de Pereira, Pereira",
  "Universidad Tecnológica del Chocó, Quibdó"
];

const defaultTranslations: Record<string, Record<string, { label: string, options?: string[] }>> = {
  es: {
    tipo_doc: { 
      label: 'Tipo de Documento', 
      options: ['Cédula de Ciudadanía', 'Tarjeta de Identidad', 'Cédula de Extranjería', 'Pasaporte', 'NIT'] 
    },
    documento_identidad: { label: 'Número de Documento' },
    nombre: { label: 'Nombre(s)' },
    apellido: { label: 'Apellido(s)' },
    email: { label: 'Correo Electrónico' },
    email_conf: { label: 'Confirmar Correo' },
    telefono: { label: 'Número de Teléfono' },
    genero: { 
      label: 'Género', 
      options: ['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo'] 
    },
    direccion: { label: 'Dirección' },
    institucion: { label: 'Institución' },
    cargo: { label: 'Cargo' },
    pais: { label: 'País' },
    ciudad: { label: 'Ciudad' }
  },
  en: {
    tipo_doc: { 
      label: 'Document Type', 
      options: ['National ID', 'Identity Card', 'Foreigner ID', 'Passport', 'Tax ID / NIT'] 
    },
    documento_identidad: { label: 'Document Number / ID' },
    nombre: { label: 'First Name(s)' },
    apellido: { label: 'Last Name(s)' },
    email: { label: 'Email Address' },
    email_conf: { label: 'Confirm Email' },
    telefono: { label: 'Phone Number' },
    genero: { 
      label: 'Gender', 
      options: ['Male', 'Female', 'Other', 'Prefer not to say'] 
    },
    direccion: { label: 'Address' },
    institucion: { label: 'Institution / Company' },
    cargo: { label: 'Job Title / Role' },
    pais: { label: 'Country' },
    ciudad: { label: 'City' }
  }
};

const defaultCountries: Record<'es' | 'en', string[]> = {
  es: [
    'Afganistán', 'Akrotiri y Dhekelia', 'Albania', 'Alemania', 'Andorra', 'Angola', 'Anguilla', 'Antártida', 'Antigua y Barbuda', 'Arabia Saudí', 'Argelia', 'Argentina', 'Armenia', 'Aruba', 'Australia', 'Austria', 'Azerbaiyán', 'Bahamas', 'Bangladés', 'Barbados', 'Baréin', 'Belice', 'Bermudas', 'Bielorrusia', 'Bolivia', 'Bonaire, Sint Eustatius y Saba', 'Bosnia y Herzegovina', 'Botsuana', 'Brasil', 'Brunéi', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Bután', 'Bélgica', 'Cabo Verde', 'Camboya', 'Camerún', 'Canadá', 'Chad', 'Chile', 'China', 'Chipre', 'Ciudad del Vaticano', 'Colombia', 'Comores', 'Congo (Brazzaville)', 'Congo (Kinshasa)', 'Corea del Norte', 'Corea del Sur', 'Costa Rica', 'Costa de Marfil', 'Croacia', 'Cuba', 'Curazao', 'Dinamarca', 'Dominica', 'Ecuador', 'Egipto', 'El Salvador', 'Emiratos Árabes Unidos', 'Eritrea', 'Eslovaquia', 'Eslovenia', 'España', 'Estados Unidos', 'Estonia', 'Esuatini', 'Etiopía', 'Filipinas', 'Finlandia', 'Fiyi', 'Francia', 'Gabón', 'Gambia', 'Georgia', 'Georgia del Sur y las Islas Sandwich del Sur', 'Ghana', 'Gibraltar', 'Granada', 'Grecia', 'Groenlandia', 'Guadalupe', 'Guam', 'Guatemala', 'Guayana Francesa', 'Guernsey', 'Guinea', 'Guinea Ecuatorial', 'Guinea-Bisáu', 'Guyana', 'Haití', 'Honduras', 'Hong Kong', 'Hungría', 'India', 'Indonesia', 'Irak', 'Irlanda', 'Irán', 'Isla Bouvet', 'Isla Heard e Islas McDonald', 'Isla Norfolk', 'Isla de Man', 'Isla de Navidad', 'Islandia', 'Islas Caimán', 'Islas Cocos (Keeling)', 'Islas Cook', 'Islas Faroe', 'Islas Malvinas', 'Islas Marianas del Norte', 'Islas Marshall', 'Islas Menores Periféricas de Estados Unidos', 'Islas Pitcairn', 'Islas Salomón', 'Islas Turcas y Caicos', 'Islas Vírgenes (EE. UU.)', 'Islas Vírgenes Británicas', 'Islas Åland', 'Israel', 'Italia', 'Jamaica', 'Japón', 'Jersey', 'Jordan', 'Kazajistán', 'Kenia', 'Kirguistán', 'Kiribati', 'Kosovo', 'Kuwait', 'Laos', 'Lesoto', 'Letonia', 'Liberia', 'Libia', 'Liechtenstein', 'Lituania', 'Luxemburgo', 'Líbano', 'Macao', 'Macedonia del Norte', 'Madagascar', 'Malasia', 'Malaui', 'Maldivas', 'Malta', 'Malí', 'Marruecos', 'Martinica', 'Mauricio', 'Mauritania', 'Mayotte', 'Micronesia', 'Moldavia', 'Mongolia', 'Montenegro', 'Montserrat', 'Mozambique', 'Mónaco', 'México', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Nicaragua', 'Nigeria', 'Niue', 'Noruega', 'Nueva Caledonia', 'Nueva Zelanda', 'Níger', 'Omán', 'Pakistán', 'Palaos', 'Palestina', 'Panamá', 'Papúa Nueva Guinea', 'Paraguay', 'Países Bajos', 'Perú', 'Polinesia Francesa', 'Polonia', 'Portugal', 'Puerto Rico', 'Qatar', 'Reino Unido', 'República Centroafricana', 'República Checa', 'República Dominicana', 'Reunión', 'Ruanda', 'Rumanía', 'Rusia', 'Samoa', 'Samoa Americana', 'San Barthélemy', 'San Cristóbal y Nevis', 'San Marino', 'San Martín', 'San Pedro y Miquelón', 'San Vicente y las Granadinas', 'Santa Elena, Ascensión y Tristán da Cunha', 'Santa Lucía', 'Santo Tomé y Príncipe', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leona', 'Singapur', 'Sint Maarten', 'Siria', 'Somalia', 'Somalilandia', 'Sri Lanka', 'Sudáfrica', 'Sudán', 'Sudán del Sur', 'Suecia', 'Suiza', 'Surinam', 'Svalbard y Jan Mayen', 'Sáhara Occidental', 'Tailandia', 'Taiwán', 'Tanzania', 'Tayikistán', 'Territorio Británico del Océano Índico', 'Territorios del Sur Francés', 'Timor-Leste', 'Togo', 'Tokelau', 'Tonga', 'Transnistria', 'Trinidad y Tobago', 'Turkmenistán', 'Turquía', 'Tuvalu', 'Túnez', 'Ucrania', 'Uganda', 'Uruguay', 'Uzbekistán', 'Vanuatu', 'Venezuela', 'Vietnam', 'Wallis y Futuna', 'Yemen', 'Yibuti', 'Zambia', 'Zimbabue'
  ],
  en: [
    'Afghanistan', 'Akrotiri and Dhekelia', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'Anguilla', 'Antarctica', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Aruba', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan', 'Bolivia', 'Bonaire, Sint Eustatius and Saba', 'Bosnia and Herzegovina', 'Botswana', 'Bouvet Island', 'Brazil', 'British Indian Ocean Territory', 'British Virgin Islands', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Cayman Islands', 'Central African Republic', 'Chad', 'Chile', 'China', 'Christmas Island', 'Cocos (Keeling) Islands', 'Colombia', 'Comoros', 'Congo (Brazzaville)', 'Congo (Kinshasa)', 'Cook Islands', 'Costa Rica', 'Croatia', 'Cuba', 'Curaçao', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Falkland Islands', 'Faroe Islands', 'Fiji', 'Finland', 'France', 'French Guiana', 'French Polynesia', 'French Southern Territories', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Gibraltar', 'Greece', 'Greenland', 'Grenada', 'Guadeloupe', 'Guam', 'Guatemala', 'Guernsey', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Heard Island and McDonald Islands', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Isle of Man', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jersey', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macao', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Martinique', 'Mauritania', 'Mauritius', 'Mayotte', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Montserrat', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Caledonia', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Niue', 'Norfolk Island', 'North Korea', 'North Macedonia', 'Northern Mariana Islands', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Pitcairn Islands', 'Poland', 'Portugal', 'Puerto Rico', 'Qatar', 'Reunion', 'Romania', 'Russia', 'Rwanda', 'Saint Barthélemy', 'Saint Helena, Ascension and Tristan da Cunha', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Martin', 'Saint Pierre and Miquelon', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Sint Maarten', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'Somaliland', 'South Africa', 'South Georgia and the South Sandwich Islands', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Svalbard and Jan Mayen', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tokelau', 'Tonga', 'Transnistria', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Turks and Caicos Islands', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'United States Minor Outlying Islands', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Wallis and Futuna', 'Western Sahara', 'Yemen', 'Zambia', 'Zimbabwe', 'Åland Islands'
  ]
};

const AccordionSection = ({ id, icon: Icon, title, isOpen, onToggle, children }: any) => {
  return (
    <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden transition-all shadow-sm dark:shadow-none">
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

export default function EditarEventoPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;

  const { language: systemLang, setLanguage: setSystemLanguage } = useLanguage();
  const [formLanguage, setFormLanguage] = useState<'es' | 'en'>('es');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const [isLoadingInit, setIsLoadingInit] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'error' | 'info' | 'success' } | null>(null);

  const showToast = (title: string, desc: string, type: 'error' | 'info' | 'success' = 'info') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 5000);
  };
  
  const [openSection, setOpenSection] = useState<string>('detalles');

  // ESTADOS DEL EVENTO
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventSlug, setEventSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [accentColor, setAccentColor] = useState('#0ea5e9');
  const [bgColor, setBgColor] = useState('#09090b');
  
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
  
  const [creatorEmail, setCreatorEmail] = useState('');
  
  // CAMPOS DE CORREO PERSONALIZADO
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const [fields, setFields] = useState<FormField[]>([]);
  const [originalFieldIds, setOriginalFieldIds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // EFECTO DE CARGA INICIAL
  useEffect(() => {
    if (!eventId) return;

    async function loadEvent() {
      try {
        const { data: eventData, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();
          
        if (error) throw error;

        setEventName(eventData.name || '');
        setEventSlug(eventData.slug || '');
        setEventDescription(eventData.description || '');
        
        setPrimaryColor(eventData.primary_color || '#4f46e5');
        setAccentColor(eventData.accent_color || '#0ea5e9');
        setBgColor(eventData.bg_color || '#09090b');
        
        setLogoPreview(eventData.logo_url || null);
        setBannerPreview(eventData.banner_url || null);
        setMaxCapacity(eventData.max_capacity?.toString() || '');
        
        if (eventData.close_date) {
          const date = new Date(eventData.close_date);
          date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
          setCloseDate(date.toISOString().slice(0, 16));
        }

        setFormPassword(eventData.form_password || '');
        setOnePerDevice(eventData.one_per_device || false);
        setTurnstileEnabled(eventData.turnstile_enabled ?? true);
        setSendNotifications(eventData.send_notifications ?? true);
        setSendFeedbackSurvey(eventData.send_feedback_survey || false);
        setThankYouEnabled(eventData.thank_you_enabled || false);
        setThankYouText(eventData.thank_you_text || '');
        setThankYouUrl(eventData.thank_you_url || '');
        setRequireHabeasData(eventData.require_habeas_data ?? true);
        setHabeasDataUrl(eventData.habeas_data_url || '');
        
        setCreatorEmail(eventData.creator_email || '');
        
        // CARGAMOS ASUNTO Y CUERPO DE CORREO
        setEmailSubject(eventData.email_subject || '');
        setEmailBody(eventData.email_body || '');

        const { data: fieldsData } = await supabase
          .from('event_fields')
          .select('*')
          .eq('event_id', eventId)
          .order('order_index');
        
        if (fieldsData) {
          setOriginalFieldIds(fieldsData.map(f => f.id));
          setFields(fieldsData.map(f => {
            const opts = f.options ? JSON.parse(f.options) : {};
            return {
              id: f.id,
              label: f.field_name,
              type: f.field_type as FormField['type'],
              isRequired: f.is_required,
              isDefault: f.is_default,
              options: opts.choices || [],
              logic: opts.logic || null,
              _ui_showLogic: !!opts.logic,
              allowOther: opts.allowOther ?? true,
              system_key: opts.system_key || null,
              description: opts.description || '',
              _ui_showDescription: !!opts.description,
              _ui_expandedOptions: false
            };
          }));
        }
      } catch (err: any) {
        showToast('Error', 'No se pudo cargar la información del evento.', 'error');
      } finally {
        setIsLoadingInit(false);
      }
    }

    loadEvent();
  }, [eventId]);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? '' : section);
  };

  const handleLanguageToggle = (lang: 'es' | 'en') => {
    setFormLanguage(lang);
    setFields(prev => prev.map(f => {
      if (f.isDefault && f.system_key && defaultTranslations[lang][f.system_key]) {
         return {
           ...f,
           label: defaultTranslations[lang][f.system_key].label || f.label,
           options: f.system_key === 'pais' 
            ? defaultCountries[lang] 
            : (defaultTranslations[lang][f.system_key].options || f.options)
         };
      }
      return f;
    }));
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
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    setEventSlug(formattedSlug);
  };

  const handleAddField = () => {
    const newField: FormField = { 
      id: crypto.randomUUID(), 
      label: 'Nueva Pregunta', 
      type: 'text', 
      isRequired: false, 
      options: [], 
      isDefault: false, 
      logic: null, 
      _ui_showLogic: false, 
      allowOther: true,
      description: '',
      _ui_showDescription: false,
      _ui_expandedOptions: false
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

        setFields(prev => prev.map(f => f.id === id ? { ...f, options: uniqueOptions, _ui_expandedOptions: false } : f));
        showToast('Opciones Importadas', `Se cargaron ${uniqueOptions.length} opciones desde Excel.`, 'success');
      } catch (error) {
        showToast('Error de Formato', 'No se pudo leer el archivo Excel.', 'error');
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
          const newOptions = [...field.options, val];
          updateField(id, 'options', newOptions);
        }
        e.currentTarget.value = '';
      }
    }
  };

  const handleUpdateEvent = async () => {
    if (!eventName) {
      return showToast('Campo Requerido', 'Debes mantener el nombre del evento.', 'error');
    }
    setIsSaving(true);

    try {
      if (eventSlug) {
        const { data: existingSlug } = await supabase
          .from('events')
          .select('id')
          .eq('slug', eventSlug)
          .neq('id', eventId)
          .single();
          
        if (existingSlug) {
          throw new Error("El Alias para la URL ya pertenece a otro evento.");
        }
      }

      let finalLogoUrl = logoPreview;
      let finalBannerUrl = bannerPreview;

      if (logoFile) {
        const fileName = `logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('logos').upload(fileName, logoFile);
        if (!error) finalLogoUrl = supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
      }

      if (bannerFile) {
        const fileName = `banner-${Date.now()}.${bannerFile.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('logos').upload(fileName, bannerFile);
        if (!error) finalBannerUrl = supabase.storage.from('logos').getPublicUrl(fileName).data.publicUrl;
      }

      const { error: eventError } = await supabase.from('events').update({
        name: eventName, 
        slug: eventSlug || null, 
        description: eventDescription,
        logo_url: finalLogoUrl, 
        banner_url: finalBannerUrl,
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
        creator_email: creatorEmail?.trim() || null,
        email_subject: emailSubject || null, 
        email_body: emailBody || null
      }).eq('id', eventId);

      if (eventError) throw eventError;

      const currentFieldIds = fields.map(f => f.id);
      const idsToDelete = originalFieldIds.filter(id => !currentFieldIds.includes(id));

      if (idsToDelete.length > 0) {
        await supabase.from('event_fields').delete().in('id', idsToDelete);
      }

      const fieldsToUpsert = fields.map((f, index) => {
        const isNew = !originalFieldIds.includes(f.id);
        const payload: any = {
          event_id: eventId, 
          field_name: f.label, 
          field_type: f.type,
          is_required: f.isRequired, 
          is_default: f.isDefault,
          options: JSON.stringify({ 
            choices: f.options, 
            logic: f.logic || null, 
            allowOther: f.allowOther ?? true, 
            system_key: f.system_key || null,
            description: f.description || '' 
          }),
          order_index: index
        };
        
        if (!isNew) {
           payload.id = f.id;
        } else {
           payload.id = f.id; // Se respeta el ID único que se le asignó al crearlo en el estado del cliente.
        }
        
        return payload;
      });

      const { error: fieldsError } = await supabase.from('event_fields').upsert(fieldsToUpsert);
      if (fieldsError) throw fieldsError;

      showToast('Actualización Exitosa', 'El evento ha sido modificado y publicado.', 'success');
      setTimeout(() => router.push(`/admin/eventos/${eventId}`), 1500);

    } catch (error: any) {
      showToast('Error del Servidor', error.message || 'No se pudo actualizar el evento.', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  if (isLoadingInit) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto relative pb-20">
      
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
              
              <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Editar Evento</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Modifica la información o estructura. <span className="font-bold text-primary">Los registros no se perderán.</span>
          </p>
        </div>
        <div className="flex items-center gap-3 relative">
          
          <button 
            type="button"
            onClick={() => setShowSettingsPanel(!showSettingsPanel)} 
            className="p-3 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:border-white/20 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all cursor-pointer shadow-sm dark:shadow-none"
            title="Configuración de Idioma Global"
          >
            <Globe className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {showSettingsPanel && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="absolute right-40 top-14 bg-white dark:bg-surface border border-gray-200 dark:border-white/10 p-3 rounded-xl shadow-2xl z-50 flex flex-col gap-2 w-44">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-1">Idioma de Sistema</p>
                <button 
                  type="button" 
                  onClick={() => { setSystemLanguage('es'); setShowSettingsPanel(false); }} 
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${systemLang === 'es' ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  Español (ES)
                </button>
                <button 
                  type="button" 
                  onClick={() => { setSystemLanguage('en'); setShowSettingsPanel(false); }} 
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${systemLang === 'en' ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  English (EN)
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={handleUpdateEvent}
            disabled={isSaving}
            className={`bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-lg flex items-center justify-center gap-2 transition-all shadow-4d-static active:translate-y-1 active:shadow-none cursor-pointer ${
              isSaving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Actualizando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" /> Guardar Cambios
              </>
            )}
          </button>
        </div>
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
                    className="w-full bg-transparent py-3 px-4 text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600" 
                  />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-700 dark:text-gray-400 font-bold flex items-center gap-2">
                <AlignLeft className="h-4 w-4"/> Descripción (Landing Page)
              </label>
              <textarea 
                value={eventDescription} 
                onChange={(e) => setEventDescription(e.target.value)} 
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">Verifica y detiene ataques automatizados.</p>
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
            </div>

            <div className="flex items-center justify-between bg-gray-50 dark:bg-black/30 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex-1 pr-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-primary"/> Una Respuesta por Equipo
                  </h3>
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

            <AnimatePresence>
              {sendNotifications && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }} 
                  className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/5 overflow-hidden"
                >
                  <div className="space-y-1.5">
                    <label className="text-sm text-gray-700 dark:text-gray-400 font-bold flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary"/> Correo para Alertas (Coordinador)
                    </label>
                    <input 
                      type="email" 
                      value={creatorEmail || ''} 
                      onChange={(e) => setCreatorEmail(e.target.value)} 
                      placeholder="Ej. coordinador@universidad.edu.co" 
                      className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:border-accent outline-none" 
                    />
                  </div>

                  <div className="p-3.5 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl space-y-1.5">
                    <span className="text-xs font-black text-primary flex items-center gap-1.5 uppercase tracking-wider"><Code className="h-3.5 w-3.5"/> Variables Disponibles</span>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">Puedes inyectar estas etiquetas en cualquier parte del asunto o cuerpo y el sistema las reemplazará automáticamente:</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] font-mono bg-white dark:bg-black/40 text-accent px-2 py-0.5 rounded border border-gray-200 dark:border-white/5 font-bold">{"{{nombre}}"}</span>
                      <span className="text-[10px] font-mono bg-white dark:bg-black/40 text-accent px-2 py-0.5 rounded border border-gray-200 dark:border-white/5 font-bold">{"{{apellido}}"}</span>
                      <span className="text-[10px] font-mono bg-white dark:bg-black/40 text-accent px-2 py-0.5 rounded border border-gray-200 dark:border-white/5 font-bold">{"{{evento}}"}</span>
                      <span className="text-[10px] font-mono bg-white dark:bg-black/40 text-accent px-2 py-0.5 rounded border border-gray-200 dark:border-white/5 font-bold">{"{{documento}}"}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Asunto Personalizado del Correo</label>
                    <input 
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Ej: ¡Confirmado! Tu entrada oficial para {{evento}}"
                      className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 px-4 text-sm text-gray-900 dark:text-white focus:border-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Cuerpo Personalizado del Correo</label>
                    <textarea 
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={5}
                      placeholder={`Ej: Hola {{nombre}},\n\nTu inscripción se procesó con éxito. Adjunto encontrarás tu credencial oficial con el número {{documento}}.`}
                      className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 px-4 text-xs text-gray-900 dark:text-white focus:border-primary outline-none resize-none leading-relaxed"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <ThumbsUp className="h-4 w-4 text-accent"/> Pantalla de Agradecimiento
                    </h3>
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
                        placeholder="Ej: ¡Inscripción aprobada exitosamente!" 
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
                        placeholder="https://chat.whatsapp.com/grupo" 
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
          <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 p-6 md:p-8 rounded-2xl shadow-sm dark:shadow-none">
            
            <div className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-white/5 pb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Diseño del Formulario de Inscripción</h2>
              <div className="flex items-center gap-4">
                {/* SWITCH DE IDIOMAS DEL FORMULARIO */}
                <div className="flex items-center bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-1">
                  <button 
                    type="button"
                    onClick={() => handleLanguageToggle('es')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-1 cursor-pointer ${formLanguage === 'es' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                  >
                    <Globe className="h-3 w-3" /> ES
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleLanguageToggle('en')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-1 cursor-pointer ${formLanguage === 'en' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                  >
                    <Globe className="h-3 w-3" /> EN
                  </button>
                </div>
                <span className="text-xs bg-primary/10 dark:bg-primary/20 text-primary px-3 py-1 rounded-full font-bold">
                  {fields.length} Preguntas
                </span>
              </div>
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
                      className={`group bg-gray-50 dark:bg-black/30 border ${field.logic ? 'border-primary/50 shadow-[0_0_15px_rgba(79,70,229,0.1)]' : 'border-gray-200 dark:border-gray-800'} rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-all relative`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        
                        <div className="md:col-span-4 flex flex-col gap-1">
                          <input 
                            type="text" 
                            value={field.label} 
                            onChange={(e) => updateField(field.id, 'label', e.target.value)} 
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-accent outline-none text-gray-900 dark:text-white font-bold px-1 py-1 transition-colors" 
                            placeholder="Escribe la pregunta o etiqueta..." 
                          />
                          {field.system_key && (
                            <span className="text-[9px] font-mono text-gray-500 dark:text-gray-400 ml-1 opacity-50 uppercase tracking-widest">
                              DATA_KEY: {field.system_key}
                            </span>
                          )}
                          
                          <AnimatePresence>
                            {field._ui_showDescription && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }}
                              >
                                <input 
                                  type="text" 
                                  value={field.description || ''} 
                                  onChange={(e) => updateField(field.id, 'description', e.target.value)} 
                                  placeholder="Escribe una descripción o ayuda..." 
                                  className="w-full mt-2 bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg py-2 px-3 text-xs text-gray-700 dark:text-gray-300 focus:border-primary outline-none transition-colors"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="md:col-span-3">
                          <select 
                            value={field.type} 
                            onChange={(e) => updateField(field.id, 'type', e.target.value)} 
                            className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 rounded-lg p-2 focus:outline-none focus:border-accent cursor-pointer mt-1"
                          >
                            <option value="text">Texto Corto</option>
                            <option value="textarea">Párrafo Largo</option>
                            <option value="email">Correo</option>
                            <option value="number">Número</option>
                            <option value="date">Fecha</option>
                            <option value="select">Lista Desplegable</option>
                            <option value="radio">Única Respuesta</option>
                            <option value="checkbox-group">Selección Múltiple</option>
                            <option value="checkbox">Casilla Verificación</option>
                            <option value="file">Archivo (Max 1MB)</option>
                          </select>
                        </div>

                        <div className="md:col-span-2 flex items-center justify-end gap-3 mt-2">
                          <span className="text-xs text-gray-500 font-bold">Req.</span>
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

                        <div className="md:col-span-3 flex justify-end gap-1 mt-1">
                          <button 
                            type="button" 
                            onClick={() => updateField(field.id, '_ui_showDescription', !field._ui_showDescription)} 
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${field._ui_showDescription || field.description ? 'bg-primary text-white' : 'text-gray-500 hover:text-accent hover:bg-accent/10'}`}
                            title="Añadir Descripción"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          
                          <button 
                            type="button" 
                            onClick={() => updateField(field.id, '_ui_showLogic', !field._ui_showLogic)} 
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${field.logic ? 'bg-primary text-white' : 'text-gray-500 hover:text-accent hover:bg-accent/10'}`}
                            title="Lógica Condicional"
                          >
                            <GitBranch className="h-4 w-4" />
                          </button>
                          
                          <button 
                            type="button" 
                            onClick={() => handleRemoveField(field.id)} 
                            className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 cursor-pointer"
                            title="Eliminar Pregunta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                      </div>

                      {/* TOGGLE PERMITIR OPCIÓN OTRA */}
                      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox-group') && (
                        <div className="flex items-center gap-3 mt-3 ml-1">
                          <span className="text-xs text-gray-500 font-bold">Permitir opción "Otra"</span>
                          <button 
                            type="button" 
                            role="switch"
                            aria-checked={field.allowOther ?? true}
                            onClick={() => updateField(field.id, 'allowOther', !(field.allowOther ?? true))} 
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${field.allowOther ?? true ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-700'}`}
                          >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition ${field.allowOther ?? true ? 'translate-x-3' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      )}

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

                      {/* MITIGACIÓN VISUAL PARA LISTAS LARGAS DE EXCEL */}
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
                            <div className="space-y-2 mt-1">
                              {/* BARRA DE CONTROL DE EXPANSIÓN */}
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                  {field.options.length} OPCIONES CONFIGURADAS
                                </span>
                                
                                {field.options.length > 5 && (
                                  <button
                                    type="button"
                                    onClick={() => updateField(field.id, '_ui_expandedOptions', !field._ui_expandedOptions)}
                                    className="text-[10px] text-primary dark:text-accent font-black tracking-wide uppercase flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 px-2 py-1.5 rounded border border-primary/20 cursor-pointer transition-all"
                                  >
                                    {field._ui_expandedOptions ? (
                                      <><EyeOff className="h-3.5 w-3.5"/> Ocultar</>
                                    ) : (
                                      <><Eye className="h-3.5 w-3.5"/> Mostrar Todas</>
                                    )}
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto custom-scrollbar p-2 bg-gray-100 dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/5">
                                {(field._ui_expandedOptions ? field.options : field.options.slice(0, 5)).map(opt => (
                                  <div key={opt} className="flex items-center gap-1.5 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 px-2.5 py-1.5 rounded-md text-xs text-gray-700 dark:text-gray-300">
                                    <span>{opt}</span>
                                    {opt !== 'Otra' && (
                                      <button type="button" onClick={() => updateField(field.id, 'options', field.options.filter(o => o !== opt))} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                
                                {!field._ui_expandedOptions && field.options.length > 5 && (
                                  <div className="text-xs text-gray-500 italic px-2 py-1.5 font-medium">
                                    ... y {field.options.length - 5} opciones más ocultas.
                                  </div>
                                )}
                              </div>
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
                <Plus className="h-5 w-5" /> Añadir Pregunta Nueva
              </button>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}