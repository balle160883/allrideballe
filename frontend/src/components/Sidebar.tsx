'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { API_URL, getAuthHeader } from '@/lib/api';
import { 
  LayoutDashboard, 
  CreditCard, 
  Map,
  LogOut,
  Route,
  Bus,
  Calendar,
  Users,
  CheckSquare,
  BarChart3,
  Briefcase,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { useEffect, useState } from 'react';

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isGerente, setIsGerente] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        const userEmail = user.email?.trim().toLowerCase();
        const role = user.rol?.toLowerCase();
        
        const superRole = 
         role === 'superadmin' || 
         user.gestor?.toUpperCase() === 'SUPERADMIN' ||
         userEmail === 'ing.ballesteros16@gmail.com';

        const isGerenteUser = role === 'gerente';

        const isGlobalAdminUser =
          role === 'admin_cliente' ||
          superRole ||
          userEmail === 'ing.ballesteros16@gmail.com';

        const isAdminUser = 
          role === 'admin' || 
          role === 'admin_cliente' || 
          role === 'admin_proveedor' || 
          superRole ||
          userEmail === 'ing.ballesteros16@gmail.com';
        
        setIsAdmin(isAdminUser);
        setIsGlobalAdmin(isGlobalAdminUser);
        setIsSuperAdmin(superRole);
        setIsGerente(isGerenteUser);
      } catch (e) {
        console.error("Error parsing user info", e);
      }
    }
  }, [pathname]);

  // Obtener conteo de aprobaciones pendientes
  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (!userInfo) return;
    try {
      const user = JSON.parse(userInfo);
      const role = user.rol?.toLowerCase();
      const userEmail = user.email?.trim().toLowerCase();
      const isAllowed = 
        role === 'admin' || 
        role === 'admin_cliente' || 
        role === 'admin_proveedor' || 
        role === 'gerente' ||
        userEmail === 'ing.ballesteros16@gmail.com';
        
      if (isAllowed) {
        const fetchPending = async () => {
          try {
            const res = await fetch(`${API_URL}/transporte/reservas/pendientes`, {
              headers: getAuthHeader()
            });
            if (res.ok) {
              const data = await res.json();
              setPendingCount(data.length);
            }
          } catch (e) {
            console.error("Error fetching pending approvals", e);
          }
        };
        fetchPending();
        const interval = setInterval(fetchPending, 15000); // refresh every 15s
        return () => clearInterval(interval);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: FileSpreadsheet, label: 'Importar Excel', href: '/admin/importar', adminOnly: true },
    { icon: Map, label: 'Mapa en Vivo', href: '/admin/mapa' },
    { icon: Route, label: 'Rutas', href: '/admin/rutas', adminOnly: true },
    { icon: Route, label: 'Smart Routing 🚀', href: '/admin/rutas/smart', adminOnly: true },
    { icon: Bus, label: 'Vehículos & Flota', href: '/admin/vehiculos', adminOnly: true },
    { icon: Briefcase, label: 'Conductores', href: '/admin/conductores', adminOnly: true },
    { icon: Building2, label: 'Empresas Transportistas', href: '/admin/empresas', globalAdminOnly: true },
    { icon: Building2, label: 'Clientes & Sedes', href: '/admin/sedes', adminOnly: true },
    { icon: Users, label: 'Cuentas Proveedores', href: '/admin/proveedores', globalAdminOnly: true },
    { icon: Users, label: 'Pasajeros & Empleados', href: '/admin/pasajeros', adminOnly: true },
    { icon: Calendar, label: 'Viajes & Reservas', href: '/admin/viajes', allowedRoles: ['admin', 'gerente'] },
    { icon: CheckSquare, label: 'Aprobaciones', href: '/admin/aprobaciones', allowedRoles: ['admin', 'gerente'], badge: pendingCount },
    { icon: BarChart3, label: 'Reportes & KPIs', href: '/admin/reportes', allowedRoles: ['admin', 'gerente'] },
    { icon: CreditCard, label: 'Renta Mensual', href: '/admin/renta', superOnly: true },
  ];

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    window.location.href = '/login';
  };

  if (!isMounted || pathname === '/login') return null;

  try {
    return (
      <>
        {/* Overlay para móviles */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
            onClick={onClose}
          />
        )}

        <div className={`
          w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col shadow-2xl z-40
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}>
          <div className="p-8 flex items-center justify-between">
            <h1 className="text-xl font-black tracking-tighter text-white">
              Pro Mobile
              <span className="block text-[10px] text-blue-400 font-bold tracking-widest uppercase mt-1">
                Transporte & Rutas
              </span>
            </h1>
            {/* Botón de cerrar para móvil */}
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
               <LogOut size={20} className="rotate-180" />
            </button>
          </div>
          
          <nav className="flex-1 mt-6 overflow-y-auto">
            {menuItems.map((item, index) => {
              if (item.adminOnly && !isAdmin) return null;
              if (item.superOnly && !isSuperAdmin) return null;
              if (item.globalAdminOnly && !isGlobalAdmin) return null;
              if (item.allowedRoles && !isAdmin && (!isGerente || !item.allowedRoles.includes('gerente'))) return null;
              
              const hasBadge = item.badge !== undefined && item.badge > 0;
              
              return (
                <div key={item.href}>
                  <Link 
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-6 py-3 transition-colors gap-3 ${
                      pathname === item.href 
                        ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-600' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {hasBadge && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>
          
          <div className="p-6 border-t border-slate-800">
            <button 
              onClick={logout}
              className="flex items-center text-slate-400 hover:text-white transition-colors gap-3 w-full"
            >
              <LogOut size={20} />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </>
    );
  } catch (err) {
    console.error("Sidebar render error:", err);
    return null;
  }
}
