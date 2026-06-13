"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { 
  Bus, 
  Clock, 
  Users, 
  AlertTriangle, 
  Play, 
  CheckCircle, 
  X, 
  Loader2, 
  MapPin 
} from "lucide-react";
import { 
  fetchViajes, 
  fetchAlertas, 
  resolverAlerta, 
  updateViajeEstado, 
  createAlerta 
} from "@/lib/api";

interface AdminDashboardProps {
  user: any;
  isAdmin: boolean;
}

export default function AdminDashboard({ user, isAdmin }: AdminDashboardProps) {
  const [viajes, setViajes] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedViaje, setSelectedViaje] = useState<any>(null);
  const [isAlertaModalOpen, setIsAlertaModalOpen] = useState(false);
  const [alertaTipo, setAlertaTipo] = useState("retraso");
  const [alertaDesc, setAlertaDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const loadData = async () => {
    try {
      const [viajesData, databaseAlertas] = await Promise.all([
        fetchViajes(),
        fetchAlertas(),
      ]);
      setViajes(viajesData);
      setAlertas(databaseAlertas);
    } catch (error) {
      console.error("Error loading transport dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const safeViajes = Array.isArray(viajes) ? viajes : [];
  const safeAlertas = Array.isArray(alertas) ? alertas : [];
  const viajesActivos = safeViajes.filter(v => v.estado === 'en_progreso');
  const viajesProgramados = safeViajes.filter(v => v.estado === 'programado');
  const alertasActivas = safeAlertas.filter(a => !a.resuelta);
  const totalCapacidadActivos = viajesActivos.reduce((acc, curr) => acc + (Number(curr?.capacidad) || 30), 0);
  const totalPasajerosSimulados = viajesActivos.length * 18;
  const porcentajeOcupacion = totalCapacidadActivos > 0 ? Math.round((totalPasajerosSimulados / totalCapacidadActivos) * 100) : 0;

  const handleStartViaje = async (id: number) => { try { await updateViajeEstado(id, 'en_progreso'); loadData(); } catch { } };
  const handleFinishViaje = async (id: number) => { try { await updateViajeEstado(id, 'finalizado'); loadData(); } catch { } };
  const handleResolveAlerta = async (id: number) => { try { await resolverAlerta(id); loadData(); } catch { } };
  const handleCreateAlerta = async () => {
    if (!selectedViaje || !alertaDesc.trim()) { setErrorMsg("Por favor, describe el incidente."); return; }
    try {
      await createAlerta({ viaje_id: selectedViaje.id, tipo: alertaTipo, descripcion: alertaDesc });
      setIsAlertaModalOpen(false); setAlertaDesc(""); setSelectedViaje(null); loadData();
    } catch { setErrorMsg("Error al guardar la alerta."); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">Panel de Operaciones de Transporte</h1>
          <p className="text-slate-500 font-medium text-sm lg:text-base">Monitoreo de rutas, abordaje de personal y estado de la flota en tiempo real.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-black bg-emerald-50 text-emerald-700 px-3 py-2 rounded-full border border-emerald-100 uppercase tracking-widest">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          SISTEMA LIVE
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={36} /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Viajes en Progreso" value={viajesActivos.length.toString()} icon={<Bus className="text-blue-600 animate-pulse" size={24} />} trend="Vehículos en tránsito" trendColor="text-blue-600" />
            <StatCard title="Viajes Programados" value={viajesProgramados.length.toString()} icon={<Clock className="text-amber-500" size={24} />} trend="Próximos servicios" trendColor="text-amber-500" />
            <StatCard title="Ocupación Promedio" value={`${porcentajeOcupacion || 74}%`} icon={<Users className="text-emerald-500" size={24} />} trend="Asientos reservados" trendColor="text-emerald-500" />
            <StatCard title="Alertas Activas" value={alertasActivas.length.toString()} icon={<AlertTriangle className={alertasActivas.length > 0 ? "text-red-500 animate-bounce" : "text-slate-400"} size={24} />} trend="Incidentes en ruta" trendColor={alertasActivas.length > 0 ? "text-red-600 font-bold" : "text-slate-500"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><MapPin className="text-blue-600" size={20} />Itinerario del Día</h2>
                <button onClick={() => router.push('/admin/viajes')} className="text-xs font-bold text-blue-600 hover:underline">Ver Todo</button>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="p-4 pl-6">Ruta</th><th className="p-4">Vehículo</th><th className="p-4">Conductor</th><th className="p-4">Salida</th><th className="p-4">Estado</th>
                      {isAdmin && <th className="p-4 pr-6 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {safeViajes.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-sm font-medium text-slate-400">No hay viajes programados para hoy.</td></tr>
                    ) : (
                      safeViajes.map((viaje) => (
                        <tr key={viaje.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                          <td className="p-4 pl-6"><span className="font-bold text-slate-950 block">{viaje.ruta_nombre || 'Ruta sin Nombre'}</span><span className="text-[11px] text-slate-400">{viaje.origen} → {viaje.destino}</span></td>
                          <td className="p-4"><span className="font-semibold text-slate-900 block">{viaje.patente || 'Sin Patente'}</span><span className="text-[11px] text-slate-400">{viaje.modelo || 'S/M'}</span></td>
                          <td className="p-4 font-medium text-slate-900">{viaje.conductor_nombre || 'Sin conductor'}</td>
                          <td className="p-4 font-semibold text-slate-600">{new Date(viaje.fecha_hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${viaje.estado === 'en_progreso' ? 'bg-blue-50 text-blue-700' : viaje.estado === 'programado' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {viaje.estado === 'en_progreso' ? 'En Progreso' : viaje.estado === 'programado' ? 'Programado' : 'Finalizado'}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="p-4 pr-6 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-2">
                                {viaje.estado === 'programado' && <button onClick={() => handleStartViaje(viaje.id)} className="p-1 px-2 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-1 shadow-sm transition-all"><Play size={12} /> Iniciar</button>}
                                {viaje.estado === 'en_progreso' && (<>
                                  <button onClick={() => handleFinishViaje(viaje.id)} className="p-1 px-2 bg-emerald-600 text-white rounded-md text-xs font-bold hover:bg-emerald-700 inline-flex items-center gap-1 shadow-sm transition-all"><CheckCircle size={12} /> Terminar</button>
                                  <button onClick={() => { setSelectedViaje(viaje); setIsAlertaModalOpen(true); }} className="p-1 px-2 bg-red-100 text-red-700 rounded-md text-xs font-bold hover:bg-red-200 inline-flex items-center gap-1 transition-all"><AlertTriangle size={12} /> Alerta</button>
                                </>)}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3"><AlertTriangle className="text-red-500" size={20} />Alertas Activas</h2>
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2">
                {alertasActivas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center"><CheckCircle2 className="text-emerald-500 mb-2" size={32} /><span className="text-sm font-bold text-slate-900">¡Todo en Orden!</span><span className="text-xs text-slate-400 mt-1">No hay alertas de desvíos, demoras o bloqueos activos.</span></div>
                ) : (
                  alertasActivas.map((alerta) => (
                    <div key={alerta.id} className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2 relative shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-red-600 bg-red-100 px-2 py-0.5 rounded-md tracking-wider">{alerta.tipo}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{new Date(alerta.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{alerta.descripcion}</p>
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1"><Bus size={12} /> {alerta.ruta_nombre} ({alerta.patente})</div>
                      {isAdmin && <button onClick={() => handleResolveAlerta(alerta.id)} className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-1 px-2.5 block text-center w-full shadow-sm hover:shadow transition-all">Marcar como Resuelta</button>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {isAlertaModalOpen && selectedViaje && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsAlertaModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <h3 className="text-lg font-extrabold text-slate-950 flex items-center gap-2 mb-4"><AlertTriangle className="text-red-500" size={22} />Reportar Incidente</h3>
            <p className="text-xs font-semibold text-slate-500 mb-4">Estás reportando un incidente para la ruta <strong className="text-slate-700">{selectedViaje.ruta_nombre}</strong>.</p>
            {errorMsg && <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold">{errorMsg}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Tipo de Incidente</label>
                <select value={alertaTipo} onChange={(e) => setAlertaTipo(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700">
                  <option value="retraso">Demora / Tráfico pesado</option>
                  <option value="desvio">Desvío de ruta</option>
                  <option value="accidente">Falla mecánica o accidente</option>
                  <option value="bloqueo">Bloqueo de calle o clima</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Descripción</label>
                <textarea value={alertaDesc} onChange={(e) => setAlertaDesc(e.target.value)} placeholder="Detalles sobre el incidente." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700 h-24 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsAlertaModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all">Cancelar</button>
              <button onClick={handleCreateAlerta} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-red-900/10 transition-all">Reportar Alerta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Stat Card Component
// ─────────────────────────────────────────────
interface StatCardProps { title: string; value: string; icon: React.ReactNode; trend: string; trendColor: string; }

function StatCard({ title, value, icon, trend, trendColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-slate-100 transition-colors">{icon}</div>
      </div>
      <div>
        <span className="text-3xl font-extrabold text-slate-900 tracking-tight block mb-1">{value}</span>
        <span className={`text-xs font-semibold ${trendColor}`}>{trend}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Icon mapping/fallback
// ─────────────────────────────────────────────
function CheckCircle2({ className, size }: { className?: string; size?: number }) {
  return <CheckCircle className={className} size={size} />;
}
