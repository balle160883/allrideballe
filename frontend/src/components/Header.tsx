'use client';

import { Bell, Search, UserCircle, Menu, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { fetchAlertas } from '@/lib/api';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [isOpenAlerts, setIsOpenAlerts] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadAlertas = async () => {
    try {
      const data = await fetchAlertas();
      setAlertas(Array.isArray(data) ? data : []);
    } catch {
      setAlertas([]);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        setUser(JSON.parse(userInfo));
      } catch (e) {
        console.error("Error parsing user info in Header", e);
      }
    }
    loadAlertas();
    const interval = setInterval(loadAlertas, 15000);
    return () => clearInterval(interval);
  }, [pathname]);

  // Cerrar desplegable si se da clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpenAlerts(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isMounted || pathname === '/login') return null;

  const alertasActivas = alertas.filter(a => !a.resuelta);

  return (
    <header className="h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 transition-colors duration-200">
      <div className="flex items-center gap-4 flex-1">
        {/* Botón de Menú Móvil */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <Menu size={24} />
        </button>

        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/80 px-4 py-2 rounded-xl w-full max-w-[400px] border border-transparent dark:border-slate-700/50">
          <Search size={18} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <input 
            type="text" 
            placeholder="Buscar rutas, choferes, unidades..." 
            className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2 lg:gap-4 ml-4">
        {/* Conmutador de Modo Oscuro / Claro */}
        <ThemeToggle />

        {/* Campana de Notificaciones & Alertas SOS */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpenAlerts(!isOpenAlerts)}
            className="relative text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Centro de Notificaciones"
          >
            <Bell size={20} />
            {alertasActivas.length > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 font-bold animate-pulse">
                {alertasActivas.length}
              </span>
            )}
          </button>

          {/* Menú Desplegable de Notificaciones */}
          {isOpenAlerts && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Bell className="text-blue-600 dark:text-blue-400" size={18} />
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Notificaciones y Alertas</span>
                </div>
                <span className="text-xs font-bold text-slate-400">{alertasActivas.length} Activas</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {alertasActivas.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <CheckCircle className="mx-auto text-emerald-500" size={32} />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Sin Alertas Pendientes</p>
                    <p className="text-xs text-slate-400">Toda la flota opera con normalidad.</p>
                  </div>
                ) : (
                  alertasActivas.map((alerta) => (
                    <div key={alerta.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl mt-0.5">
                        <AlertTriangle size={16} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded">
                            {alerta.tipo || 'Incidente'}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {new Date(alerta.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{alerta.descripcion}</p>
                        {alerta.ruta_nombre && (
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Ruta: {alerta.ruta_nombre}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-center">
                <button 
                  onClick={() => { setIsOpenAlerts(false); router.push('/admin/mapa'); }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1.5 w-full"
                >
                  Ver Mapa de Monitoreo en Vivo <ExternalLink size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-l pl-3 lg:pl-5 border-slate-200 dark:border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
              {user?.email ? (user.email.split('@')[0]) : 'Gestor'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">ID: {user?.gestor || '---'}</p>
          </div>
          <UserCircle size={30} className="text-slate-400 dark:text-slate-500 shrink-0" />
        </div>
      </div>
    </header>
  );
}
