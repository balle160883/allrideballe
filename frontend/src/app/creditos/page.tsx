"use client";

import { useEffect, useState } from "react";
import { CreditCard, ArrowUpRight, ArrowDownRight, MoreHorizontal, Loader2, X, Phone, MapPin, User, Calendar, Info, Bus, Users, ShieldAlert } from "lucide-react";
import { fetchAsignaciones, fetchAllGestores } from "@/lib/api";

export default function CreditosPage() {
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGestor, setSelectedGestor] = useState<string>("");
  const [selectedAsig, setSelectedAsig] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [gestores, setGestores] = useState<any[]>([]);

  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      const user = JSON.parse(userInfo);
      setIsAdmin(user.rol === 'admin');
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAllGestores().then(setGestores).catch(console.error);
    }
  }, [isAdmin]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchAsignaciones(100, selectedGestor);
        setAsignaciones(data);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedGestor]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await fetchAsignaciones(100, selectedGestor);
        setAsignaciones((current) => {
          if (JSON.stringify(current) !== JSON.stringify(data)) {
            if (selectedAsig) {
              const updatedAsig = data.find((a: any) => a.NoCUENTA === selectedAsig.NoCUENTA);
              if (updatedAsig && JSON.stringify(updatedAsig) !== JSON.stringify(selectedAsig)) {
                setSelectedAsig(updatedAsig);
              }
            }
            return data;
          }
          return current;
        });
      } catch (err) {
        console.error("Error polling asignaciones:", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedGestor, selectedAsig]);

  const totalViajes = asignaciones.length;
  const completados = asignaciones.filter(a => a['SITUACIÓN DEL CRÉDITO'] === 'VISITADO').length;
  const programados = totalViajes - completados;

  return (
    <div className="space-y-6 relative min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Control de Viajes y Rutas</h1>
          <p className="text-slate-500 text-sm">Monitoreo en tiempo real del cumplimiento de rutas y transporte corporativo.</p>
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase ml-2">Conductor:</span>
            <select 
              value={selectedGestor}
              onChange={(e) => setSelectedGestor(e.target.value)}
              className="text-sm font-bold text-slate-700 focus:outline-none bg-transparent cursor-pointer"
            >
              <option value="">Todos los Conductores</option>
              {gestores.map(g => (
                <option key={g.gestor_id} value={g.gestor_name}>{g.gestor_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-blue-600 text-white border-none shadow-blue-200 shadow-xl">
          <div className="flex justify-between items-start">
            <Bus size={24} className="opacity-80" />
            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-1 rounded">Viajes Totales</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold">{totalViajes} Recorridos</div>
            <div className="text-blue-100 text-xs flex items-center gap-1 mt-1 font-medium">
              Sincronizado con la Flota AllRide
            </div>
          </div>
        </div>
        
        <div className="card border-slate-100 hover:border-blue-200 transition-colors">
          <div className="flex justify-between items-start text-slate-400">
            <div className="p-2 bg-slate-50 rounded-lg"><Users size={20} className="text-slate-600" /></div>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded">Programados</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">{programados} Activos</div>
            <div className="text-emerald-500 text-xs font-bold flex items-center gap-1 mt-1">
              {totalViajes > 0 ? (programados / totalViajes * 100).toFixed(1) : 0}% pendiente
            </div>
          </div>
        </div>

        <div className="card border-slate-100 hover:border-red-200 transition-colors">
          <div className="flex justify-between items-start text-slate-400">
            <div className="p-2 bg-green-50 rounded-lg"><ShieldAlert size={20} className="text-green-600" /></div>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-green-50 px-2 py-1 rounded text-green-700">Completados</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">{completados} Realizados</div>
            <div className="text-blue-600 text-xs font-bold flex items-center gap-1 mt-1">
              {totalViajes > 0 ? (completados / totalViajes * 100).toFixed(1) : 0}% de cumplimiento
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden border-slate-100 shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Monitoreo de Servicios Programados</h3>
          <div className="text-[10px] font-bold text-slate-400">CLIC PARA VER DETALLES DEL RECORRIDO</div>
        </div>
        {loading ? (
             <div className="p-12 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="animate-spin mb-2" size={32} />
                <p>Cargando recorridos de la flota...</p>
             </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-finance">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase">Ruta / Destino</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase">Viaje ID</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase">Ocupación / Reservas</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase">Estado</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase">Salida Programada</th>
                  <th className="px-6 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {asignaciones.map((asig, i) => (
                  <tr 
                    key={i} 
                    onClick={() => setSelectedAsig(asig)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900 leading-tight">{asig['NOMBRE']}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{asig['DOMICILIO']}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">#{asig['NoCUENTA']}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                      <span className="text-blue-600 font-extrabold">1 Asiento</span> / 42 Capacidad
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        asig['SITUACIÓN DEL CRÉDITO'] === 'VISITADO'
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {asig['SITUACIÓN DEL CRÉDITO'] === 'VISITADO' ? 'COMPLETADO' : 'PROGRAMADO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">
                      {new Date(asig['FECHA ASIGNACION']).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs
                    </td>
                    <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-blue-100 text-blue-600 p-1 rounded-full inline-block">
                        <ArrowUpRight size={14} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedAsig && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300">
          <div 
            className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Detalles de Ruta</h2>
                <p className="text-xs text-slate-500 font-medium">Información operativa del recorrido asignado</p>
              </div>
              <button 
                onClick={() => setSelectedAsig(null)}
                className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200 shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Bus className="text-blue-600" size={18} />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Ruta Asignada</h3>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="text-lg font-black text-slate-900 mb-1">{selectedAsig['NOMBRE']}</div>
                  <div className="flex gap-4 text-xs font-bold">
                    <span className="text-blue-600">Viaje ID: #{selectedAsig['NoCUENTA']}</span>
                    <span className="text-slate-400">Conductor: {selectedAsig['GESTOR ASIGNADO'] || 'No asignado'}</span>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><MapPin size={18} /></div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Recorrido Principal</div>
                      <div className="text-sm font-semibold text-slate-700 leading-snug">{selectedAsig['DOMICILIO']}</div>
                      <div className="text-xs text-slate-500">Destino: {selectedAsig['MUNICIPIO']}</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-2 mb-6 opacity-60">
                  <Users size={16} />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest">Capacidad y Operación</h3>
                </div>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Capacidad</div>
                    <div className="text-xl font-bold">42 Asientos</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Reservas Activas</div>
                    <div className="text-sm font-bold text-blue-300">1 Pasajero (María Gómez)</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Salida Programada</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {new Date(selectedAsig['FECHA ASIGNACION']).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Estado de Servicio</div>
                    <div className="text-lg font-bold text-blue-400">
                      {selectedAsig['SITUACIÓN DEL CRÉDITO'] === 'VISITADO' ? 'Completado' : 'Programado'}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Info className="text-orange-500" size={18} />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Control del Proveedor</h3>
                </div>
                <div className="p-4 border border-slate-100 rounded-xl bg-orange-50/20">
                  <div className="text-[10px] font-bold text-orange-600 uppercase mb-1">Proveedor Contratado</div>
                  <div className="font-bold text-slate-800 text-sm mb-1">Transportes del Valle</div>
                  <div className="text-xs text-slate-500">Métrica de Cumplimiento Contractual: 100% puntualidad y GPS activo.</div>
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => setSelectedAsig(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                Cerrar Detalles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
