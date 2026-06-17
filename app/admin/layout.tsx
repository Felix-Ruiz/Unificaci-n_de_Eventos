"use client";

import { ReactNode, useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarPlus, 
  Settings, 
  LogOut, 
  Archive, 
  ClipboardCheck, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';

const systemTranslations: Record<string, Record<string, string>> = {
  es: {
    menuOverview: "Vista General",
    menuAttendance: "Control Asistencia",
    menuCreate: "Crear Evento",
    menuHistory: "Historial Eventos",
    menuBase: "Base Histórica",
    menuUsers: "Gestor Usuarios",
    menuConfig: "Configuración",
    btnLogout: "Cerrar Sesión"
  },
  en: {
    menuOverview: "Dashboard",
    menuAttendance: "Attendance Control",
    menuCreate: "Create Event",
    menuHistory: "Events History",
    menuBase: "Historical DB",
    menuUsers: "User Manager",
    menuConfig: "Settings",
    btnLogout: "Log Out"
  }
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const t = systemTranslations[language];

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const session = localStorage.getItem('acofi-session');
    if (session) {
      try {
        setCurrentUser(JSON.parse(session));
      } catch (e) {
        window.location.replace('/');
      }
    } else {
      window.location.replace('/');
    }
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem('acofi-session'); 
    window.location.replace('/');
  };

  if (!mounted || !currentUser) return null;

  const isAutoCheckIn = pathname.includes('/auto-checkin') || pathname.includes('/kiosco');

  if (isAutoCheckIn) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
        <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
          {children}
        </main>
      </div>
    );
  }

  const isMaster = currentUser.role === 'MASTER';
  const perms = currentUser.permissions || [];
  
  const canViewDashboard = isMaster || perms.includes('eventos') || perms.includes('historico');
  const canManageEvents = isMaster || perms.includes('eventos');
  const canDoCheckIn = isMaster || perms.includes('asistencia');
  const canViewHistory = isMaster || perms.includes('historico');
  const canManageUsers = isMaster || perms.includes('usuarios');

  const isActive = (path: string) => {
    if (path === '/admin/dashboard' && pathname === '/admin/dashboard') return true;
    if (path !== '/admin/dashboard' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="flex flex-col md:flex-row h-screen admin-wrapper text-gray-900 dark:text-white overflow-hidden bg-gray-50 dark:bg-background transition-colors duration-300">
      
      {/* BARRA SUPERIOR MÓVIL */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-surface border-b border-gray-200 dark:border-white/5 z-30 transition-colors">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-primary dark:text-accent">ACOFI</h2>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg cursor-pointer">
          {isMobileMenuOpen ? <X className="h-6 w-6 text-gray-900 dark:text-white" /> : <Menu className="h-6 w-6 text-gray-900 dark:text-white" />}
        </button>
      </div>

      {/* OVERLAY FONDO OSCURO EN MÓVILES */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Menú Lateral (Responsivo) */}
      <aside 
        className={`fixed md:relative top-0 left-0 h-full bg-white dark:bg-surface border-r border-gray-200 dark:border-white/5 z-50 flex flex-col justify-between transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'} 
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        `}
      >
        <div className="overflow-y-auto custom-scrollbar">
          <div className="h-20 flex flex-col items-center justify-center border-b border-gray-200 dark:border-white/5 relative">
            
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute right-4 top-1/2 -translate-y-1/2 md:hidden p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {isCollapsed ? (
              <h2 className="text-xl font-bold text-primary dark:text-accent hidden md:block">A<span className="text-gray-900 dark:text-white">C</span></h2>
            ) : (
              <>
                <h2 className="text-xl font-bold text-primary dark:text-accent">ACOFI<span className="text-gray-900 dark:text-white"> Admin</span></h2>
                <span className="text-[10px] bg-primary/10 dark:bg-primary/20 text-primary px-2 py-0.5 rounded-full mt-1 uppercase tracking-widest font-bold border border-primary/20">
                  {currentUser.role}
                </span>
              </>
            )}
          </div>
          
          <nav className="p-3 space-y-2 mt-4">
            
            {canViewDashboard && (
              <Link 
                href="/admin/dashboard" 
                title={isCollapsed ? t.menuOverview : ""}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  isActive('/admin/dashboard') 
                  ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30 shadow-[0_0_15px_rgba(79,70,229,0.1)] dark:shadow-[0_0_15px_rgba(79,70,229,0.15)] font-bold' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                } ${isCollapsed ? 'md:justify-center' : ''}`}
              >
                <LayoutDashboard className={`shrink-0 ${isActive('/admin/dashboard') ? 'h-5 w-5' : 'h-5 w-5'}`} /> 
                <span className={isCollapsed ? 'md:hidden' : ''}>{t.menuOverview}</span>
              </Link>
            )}

            {canDoCheckIn && (
              <Link 
                href="/admin/asistencia" 
                title={isCollapsed ? t.menuAttendance : ""}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  isActive('/admin/asistencia') 
                  ? 'bg-accent/10 dark:bg-accent/20 text-accent border border-accent/20 dark:border-accent/30 shadow-[0_0_15px_rgba(14,165,233,0.1)] dark:shadow-[0_0_15px_rgba(14,165,233,0.15)] font-bold' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                } ${isCollapsed ? 'md:justify-center' : ''}`}
              >
                <ClipboardCheck className={`shrink-0 ${isActive('/admin/asistencia') ? 'h-5 w-5' : 'h-5 w-5'}`} /> 
                <span className={isCollapsed ? 'md:hidden' : ''}>{t.menuAttendance}</span>
              </Link>
            )}

            {canManageEvents && (
              <>
                <div className="my-2 pt-2 border-t border-gray-200 dark:border-white/5"></div>
                <Link 
                  href="/admin/eventos/nuevo" 
                  title={isCollapsed ? t.menuCreate : ""}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isActive('/admin/eventos/nuevo') 
                    ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30 shadow-[0_0_15px_rgba(79,70,229,0.1)] dark:shadow-[0_0_15px_rgba(79,70,229,0.15)] font-bold' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                  } ${isCollapsed ? 'md:justify-center' : ''}`}
                >
                  <CalendarPlus className="shrink-0 h-5 w-5" /> 
                  <span className={isCollapsed ? 'md:hidden' : ''}>{t.menuCreate}</span>
                </Link>
                <Link 
                  href="/admin/eventos/historial" 
                  title={isCollapsed ? t.menuHistory : ""}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isActive('/admin/eventos/historial') 
                    ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30 shadow-[0_0_15px_rgba(79,70,229,0.1)] dark:shadow-[0_0_15px_rgba(79,70,229,0.15)] font-bold' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                  } ${isCollapsed ? 'md:justify-center' : ''}`}
                >
                  <Archive className="shrink-0 h-5 w-5" /> 
                  <span className={isCollapsed ? 'md:hidden' : ''}>{t.menuHistory}</span>
                </Link>
              </>
            )}

            {canViewHistory && (
              <>
                <div className="my-2 pt-2 border-t border-gray-200 dark:border-white/5"></div>
                <Link 
                  href="/admin/historico" 
                  title={isCollapsed ? t.menuBase : ""}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isActive('/admin/historico') 
                    ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30 shadow-[0_0_15px_rgba(79,70,229,0.1)] dark:shadow-[0_0_15px_rgba(79,70,229,0.15)] font-bold' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                  } ${isCollapsed ? 'md:justify-center' : ''}`}
                >
                  <Users className="shrink-0 h-5 w-5" /> 
                  <span className={isCollapsed ? 'md:hidden' : ''}>{t.menuBase}</span>
                </Link>
              </>
            )}

            {canManageUsers && (
              <Link 
                href="/admin/usuarios" 
                title={isCollapsed ? t.menuUsers : ""}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  isActive('/admin/usuarios') 
                  ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30 shadow-[0_0_15px_rgba(79,70,229,0.1)] dark:shadow-[0_0_15px_rgba(79,70,229,0.15)] font-bold' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                } ${isCollapsed ? 'md:justify-center' : ''}`}
              >
                <ShieldCheck className="shrink-0 h-5 w-5" /> 
                <span className={isCollapsed ? 'md:hidden' : ''}>{t.menuUsers}</span>
              </Link>
            )}

            <div className="my-2 pt-2 border-t border-gray-200 dark:border-white/5"></div>
            <Link 
              href="/admin/configuracion" 
              title={isCollapsed ? t.menuConfig : ""}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                isActive('/admin/configuracion') 
                ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30 shadow-[0_0_15px_rgba(79,70,229,0.1)] dark:shadow-[0_0_15px_rgba(79,70,229,0.15)] font-bold' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
              } ${isCollapsed ? 'md:justify-center' : ''}`}
            >
              <Settings className="shrink-0 h-5 w-5" /> 
              <span className={isCollapsed ? 'md:hidden' : ''}>{t.menuConfig}</span>
            </Link>

          </nav>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-white/5 flex flex-col gap-2 relative mt-auto">
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden md:flex absolute -right-4 -top-5 bg-primary text-white p-1.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)] dark:shadow-[0_0_10px_rgba(0,0,0,0.5)] hover:scale-110 transition-transform z-50 items-center justify-center cursor-pointer`}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {!isCollapsed && (
            <div className="mb-2 px-3 text-xs font-bold text-gray-600 dark:text-gray-400 truncate bg-gray-100 dark:bg-black/30 py-2 rounded-lg text-center md:block">
              {currentUser.name}
            </div>
          )}
          
          <button 
            onClick={handleLogout}
            title={isCollapsed ? t.btnLogout : ""}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-400/10 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-400/20 cursor-pointer ${isCollapsed ? 'md:justify-center' : 'w-full'}`}
          >
            <LogOut className="shrink-0 h-5 w-5" />
            <span className={`font-bold ${isCollapsed ? 'md:hidden' : ''}`}>{t.btnLogout}</span>
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="absolute top-0 right-0 w-125 h-125 bg-primary/5 dark:bg-primary/10 rounded-full blur-[120px] dark:blur-[150px] pointer-events-none hidden md:block"></div>
        <div className="p-4 md:p-10 relative z-10 w-full min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}