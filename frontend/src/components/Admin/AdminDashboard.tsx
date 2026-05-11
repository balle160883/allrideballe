import React from 'react';
import { Activity, Users, Car, DollarSign, TrendingUp, Shield, Map as MapIcon, ArrowUpRight, LogOut } from 'lucide-react';

const AdminDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const stats = [
    { label: 'Conductores Activos', value: '42', change: '+12%', icon: Car, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Usuarios Totales', value: '1,284', change: '+3%', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Ingresos Hoy', value: '$8,432', change: '+18%', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Viajes en Curso', value: '15', change: 'Estable', icon: Activity, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col text-white font-sans overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-20 lg:w-64 border-r border-white/5 bg-slate-900/50 flex flex-col p-4 shrink-0">
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield size={20} />
            </div>
            <h1 className="hidden lg:block text-lg font-black tracking-tighter">CONTROL TOWER</h1>
          </div>
          
          <nav className="flex-1 space-y-2">
            {[
              { label: 'Dashboard', icon: Activity, active: true },
              { label: 'Mapa en Vivo', icon: MapIcon, active: false },
              { label: 'Conductores', icon: Car, active: false },
              { label: 'Finanzas', icon: DollarSign, active: false },
            ].map((item, i) => (
              <button key={i} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${item.active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
                <item.icon size={20} />
                <span className="hidden lg:block font-bold text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <button onClick={onClose} className="w-full flex items-center gap-4 p-3 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all">
            <LogOut size={20} />
            <span className="hidden lg:block font-bold text-sm">Salir de Admin</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-12">
          <header className="flex justify-between items-end mb-12">
            <div>
              <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mb-2">Comandante de Operaciones</p>
              <h2 className="text-4xl lg:text-5xl font-black tracking-tighter">Panel Maestro</h2>
            </div>
            <div className="hidden sm:flex items-center gap-4 bg-slate-900/50 p-4 rounded-3xl border border-white/5">
               <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Sistemas AllRide</p>
                  <p className="text-emerald-400 text-xs font-black flex items-center justify-end gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    ONLINE
                  </p>
               </div>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, i) => (
              <div key={i} className="p-8 bg-slate-900 border border-white/5 rounded-[40px] hover:border-indigo-500/30 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 ${stat.bg} rounded-2xl ${stat.color}`}>
                    <stat.icon size={24} />
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${stat.change.includes('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    {stat.change}
                  </span>
                </div>
                <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-4xl font-black tracking-tighter">{stat.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-slate-900 border border-white/5 rounded-[48px] p-10">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                   <TrendingUp className="text-indigo-500" />
                   Crecimiento de Viajes
                </h3>
              </div>
              <div className="h-72 flex items-end gap-3">
                {[40, 55, 30, 85, 45, 100, 65, 50, 75, 40, 60, 90].map((h, i) => (
                  <div key={i} className="flex-1 bg-indigo-600/10 rounded-t-2xl group relative cursor-pointer hover:bg-indigo-600/20 transition-all">
                    <div className="absolute bottom-0 left-0 right-0 bg-indigo-600 rounded-t-2xl transition-all duration-1000 group-hover:brightness-125 shadow-[0_0_20px_rgba(79,70,229,0.4)]" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-[48px] p-10">
               <h3 className="text-2xl font-black tracking-tight mb-10">Verificaciones</h3>
               <div className="space-y-8">
                  {[
                    { name: 'Ricardo Gómez', car: 'Mazda 3', time: '2m' },
                    { name: 'Elena Torres', car: 'Honda Civic', time: '15m' },
                    { name: 'Mario Rossi', car: 'Tesla X', time: '1h' },
                    { name: 'Lucía Sanz', car: 'VW ID.4', time: '2h' },
                  ].map((req, i) => (
                    <div key={i} className="flex items-center gap-5 group">
                      <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg">
                        {req.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black">{req.name}</p>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{req.car} • {req.time}</p>
                      </div>
                      <button className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition-all">
                        <ArrowUpRight size={20} />
                      </button>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
