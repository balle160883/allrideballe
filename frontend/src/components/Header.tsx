'use client';

import { Bell, Search, UserCircle, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

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
  }, [pathname]);

  if (!isMounted || pathname === '/login') return null;

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
            placeholder="Buscar..." 
            className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2 lg:gap-4 ml-4">
        {/* Conmutador de Modo Oscuro / Claro */}
        <ThemeToggle />

        <button className="relative text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 font-bold">
            3
          </span>
        </button>

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
