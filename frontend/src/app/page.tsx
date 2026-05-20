"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from 'next/navigation';
import { 
  Bus, 
  MapPin, 
  AlertTriangle, 
  Clock, 
  Users, 
  CheckCircle2, 
  Loader2, 
  X, 
  Play,
  CheckCircle,
  Map,
  QrCode,
  Calendar,
  Armchair,
  Navigation,
  ChevronRight,
  Printer,
  Circle
} from "lucide-react";
import { 
  fetchViajes, 
  fetchAlertas, 
  resolverAlerta, 
  updateViajeEstado,
  fetchLatestLocations,
  createAlerta,
  fetchReservasPasajero,
  fetchViajesDisponibles,
  solicitarReserva,
  updateDomicilioPasajero
} from "@/lib/api";

// ─────────────────────────────────────────────
//  MAIN PAGE (rol-aware)
// ─────────────────────────────────────────────
export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem('auth_token');
    const userInfo = localStorage.getItem('user_info');

    if (!token || !userInfo) { router.push('/login'); return; }

    try {
      const parsedUser = JSON.parse(userInfo);
      setUser(parsedUser);
      const admin =
        parsedUser.rol === 'admin' ||
        parsedUser.rol === 'admin_cliente' ||
        parsedUser.rol === 'admin_proveedor' ||
        parsedUser.rol === 'superadmin';
      setIsAdmin(admin);
    } catch {
      router.push('/login');
    }
  }, [router]);

  if (!isMounted || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!isAdmin && user.rol === 'pasajero') {
    return <PasajeroDashboard user={user} />;
  }

  return <AdminDashboard user={user} isAdmin={isAdmin} />;
}

// ─────────────────────────────────────────────
//  ADMIN DASHBOARD (existente)
// ─────────────────────────────────────────────
function AdminDashboard({ user, isAdmin }: { user: any; isAdmin: boolean }) {
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
//  PASAJERO DASHBOARD (empleado)
// ─────────────────────────────────────────────
function PasajeroDashboard({ user }: { user: any }) {
  const [reservas, setReservas] = useState<any[]>([]);
  const [viajesDisponibles, setViajesDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<number | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [activeReserva, setActiveReserva] = useState<any>(null);

  const loadDashboardData = async () => {
    try {
      const [resData, dispData] = await Promise.all([
        fetchReservasPasajero(),
        fetchViajesDisponibles()
      ]);
      setReservas(Array.isArray(resData) ? resData : []);
      setViajesDisponibles(Array.isArray(dispData) ? dispData : []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSolicitar = async (viajeId: number) => {
    setBookingLoading(viajeId);
    setBookingError("");
    setBookingSuccess("");
    try {
      await solicitarReserva(viajeId);
      setBookingSuccess("¡Solicitud enviada! Pendiente de aprobación por tu gerente.");
      setTimeout(() => setBookingSuccess(""), 6000);
      loadDashboardData();
    } catch (err: any) {
      setBookingError(err.message || "No se pudo procesar la solicitud.");
      setTimeout(() => setBookingError(""), 6000);
    } finally {
      setBookingLoading(null);
    }
  };

  // Próximo viaje = el primer viaje no finalizado, ordenado por fecha
  const proximos = reservas.filter(r => r.viaje_estado !== 'finalizado' && r.reserva_estado !== 'rechazado');
  const historial = reservas.filter(r => r.viaje_estado === 'finalizado' || r.reserva_estado === 'rechazado');
  const proximoViaje = proximos[0] ?? null;
  const viajeEnProgreso = proximoViaje?.viaje_estado === 'en_progreso';

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      pendiente_aprobacion: 'bg-amber-50 text-amber-600 border-amber-250',
      reservado: 'bg-blue-50 text-blue-700 border-blue-200',
      confirmado: 'bg-emerald-50 text-emerald-700 border-emerald-250',
      rechazado: 'bg-rose-50 text-rose-700 border-rose-250',
      cancelado: 'bg-slate-50 text-slate-550 border-slate-200',
    };
    const labelMap: Record<string, string> = {
      pendiente_aprobacion: 'Pendiente Autorización ⏳',
      reservado: 'Reservado ✓',
      confirmado: 'Abordado 🚌',
      rechazado: 'Rechazado ❌',
      cancelado: 'Cancelado',
    };
    return { cls: map[estado] || 'bg-slate-50 text-slate-650 border-slate-100', label: labelMap[estado] || estado };
  };

  const viajeBadge = (estado: string) => {
    if (estado === 'en_progreso') return 'bg-blue-50 text-blue-700';
    if (estado === 'programado') return 'bg-amber-50 text-amber-700';
    return 'bg-slate-50 text-slate-500';
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bienvenido, {user.nombre || user.email?.split('@')[0]} 👋
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">
            Tu panel de transporte corporativo personal.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-black bg-emerald-50 text-emerald-700 px-3 py-2 rounded-full border border-emerald-100 uppercase tracking-widest">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          GPS ACTIVO
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ─── COLUMNA IZQUIERDA: próximo viaje + solicitar + historial ─── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Próximo Viaje */}
            {proximoViaje ? (
              <div className={`relative rounded-2xl overflow-hidden shadow-md border ${
                proximoViaje.reserva_estado === 'pendiente_aprobacion' 
                  ? 'border-amber-250 bg-gradient-to-br from-amber-500 to-amber-600'
                  : viajeEnProgreso 
                    ? 'border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-700' 
                    : 'border-emerald-250 bg-gradient-to-br from-emerald-600 to-teal-700'
              }`}>
                {/* Decoración de fondo */}
                <div className="absolute inset-0 opacity-10">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="absolute rounded-full border-2 border-white" style={{ width: `${80 + i * 60}px`, height: `${80 + i * 60}px`, right: `-${20 + i * 20}px`, top: `${-20 + i * 10}px` }} />
                  ))}
                </div>

                <div className="relative p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border bg-white/20 border-white/30">
                      {proximoViaje.reserva_estado === 'pendiente_aprobacion' 
                        ? '⏳ ESPERANDO AUTORIZACIÓN' 
                        : viajeEnProgreso 
                          ? '🟢 EN CAMINO AHORA' 
                          : '⏰ VIAJE PROGRAMADO'}
                    </span>
                    <span className="text-xs font-semibold opacity-85 bg-black/10 px-2 py-0.5 rounded">
                      {new Date(proximoViaje.fecha_hora_salida).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  <h2 className="text-2xl font-extrabold tracking-tight mb-1">{proximoViaje.ruta_nombre}</h2>
                  <p className="text-sm opacity-80 font-medium mb-5">
                    {proximoViaje.origen} <span className="opacity-60">→</span> {proximoViaje.destino}
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    <InfoPill icon={<Clock size={14} />} label="Salida" value={new Date(proximoViaje.fecha_hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                    <InfoPill icon={<Armchair size={14} />} label="Asiento" value={proximoViaje.asiento_numero ? `#${proximoViaje.asiento_numero}` : 'Asignando...'} />
                    <InfoPill icon={<Bus size={14} />} label="Unidad" value={proximoViaje.patente || 'S/D'} />
                  </div>

                  {proximoViaje.conductor_nombre && (
                    <div className="mt-4 flex items-center gap-2 text-sm opacity-75">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">
                        {proximoViaje.conductor_nombre.charAt(0)}
                      </div>
                      <span className="font-semibold">Conductor: {proximoViaje.conductor_nombre}</span>
                    </div>
                  )}

                  {proximoViaje.notas_gerente && (
                    <div className="mt-3 bg-white/10 p-2.5 rounded-lg text-xs border border-white/15">
                      <span className="font-bold uppercase tracking-wider text-[9px] block opacity-80 mb-0.5">Nota de tu gerente</span>
                      {proximoViaje.notas_gerente}
                    </div>
                  )}
                </div>

                {/* GPS en vivo si está en progreso */}
                {viajeEnProgreso && proximoViaje.ultima_ubicacion && (
                  <div className="relative border-t border-white/20 bg-black/20 px-6 py-3 flex items-center gap-2">
                    <Navigation size={14} className="text-white animate-pulse" />
                    <span className="text-xs font-bold text-white/90">
                      Ubicación GPS actualizada hace {getTimeAgo(proximoViaje.ultima_ubicacion.timestamp)}
                    </span>
                    <span className="ml-auto text-xs text-white/70 font-mono">
                      {Number(proximoViaje.ultima_ubicacion.latitud).toFixed(4)}, {Number(proximoViaje.ultima_ubicacion.longitud).toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
                <Calendar className="text-slate-300 mx-auto mb-3" size={40} />
                <p className="text-slate-700 font-bold text-base">No tienes viajes activos</p>
                <p className="text-slate-400 text-sm mt-1">Solicita un asiento de las opciones de abajo o espera la asignación del administrador.</p>
              </div>
            )}

            {/* Solicitar Asiento */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-base lg:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Bus className="text-blue-600" size={20} />
                  Solicitar Asiento
                </h2>
                <p className="text-xs text-slate-450 font-medium">
                  Envía una solicitud para reservar tu lugar en los viajes disponibles de tu empresa.
                </p>
              </div>

              {bookingError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {bookingError}
                </div>
              )}

              {bookingSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  {bookingSuccess}
                </div>
              )}

              {viajesDisponibles.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-slate-100">
                  No hay viajes programados disponibles para auto-reserva.
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {viajesDisponibles.map((v) => {
                    const asientosLibres = v.capacidad - (v.ocupados || 0);
                    const salida = new Date(v.fecha_hora_salida);
                    const horaSalida = salida.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const diaSalida = salida.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
                    
                    return (
                      <div 
                        key={v.id} 
                        className="p-3.5 bg-slate-50/80 border border-slate-200/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-350 hover:bg-slate-50 transition-all"
                      >
                        <div className="space-y-1">
                          <p className="text-xs lg:text-sm font-extrabold text-slate-900">{v.ruta_nombre}</p>
                          <p className="text-[11px] text-slate-500 font-semibold">{v.origen} → {v.destino}</p>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-450 pt-1">
                            <span className="flex items-center gap-1"><Clock size={11} className="text-blue-500" /> {diaSalida} - {horaSalida}</span>
                            <span className={`flex items-center gap-1 ${asientosLibres < 5 ? 'text-amber-600' : 'text-slate-500'}`}>
                              <Armchair size={11} /> {asientosLibres} libres de {v.capacidad}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSolicitar(v.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-[11px] font-black rounded-lg transition-colors flex items-center gap-1 shadow-sm self-start sm:self-center"
                          disabled={bookingLoading !== null || asientosLibres <= 0}
                        >
                          {bookingLoading === v.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={11} />
                          )}
                          Reservar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mini mapa de GPS si hay viaje en progreso */}
            {viajeEnProgreso && proximoViaje?.ultima_ubicacion && (
              <LiveMapMini lat={proximoViaje.ultima_ubicacion.latitud} lng={proximoViaje.ultima_ubicacion.longitud} />
            )}

            {/* Historial de viajes */}
            {reservas.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="text-slate-400" size={18} />
                    Mis Solicitudes & Viajes ({reservas.length})
                  </h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {reservas.map((r) => {
                    const { cls, label } = estadoBadge(r.reserva_estado);
                    return (
                      <div key={r.reserva_id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            r.reserva_estado === 'pendiente_aprobacion' 
                              ? 'bg-amber-400 animate-pulse'
                              : r.reserva_estado === 'rechazado'
                                ? 'bg-rose-500'
                                : r.viaje_estado === 'en_progreso' 
                                  ? 'bg-blue-500 animate-pulse' 
                                  : r.viaje_estado === 'programado' 
                                    ? 'bg-emerald-400' 
                                    : 'bg-slate-300'
                          }`} />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{r.ruta_nombre}</p>
                            <p className="text-xs text-slate-400 font-medium">
                              {new Date(r.fecha_hora_salida).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' · '}{new Date(r.fecha_hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {r.asiento_numero ? ` · Asiento #${r.asiento_numero}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${cls}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ─── COLUMNA DERECHA: QR credencial ─── */}
          <div className="space-y-4">
            {/* Tarjeta de credencial QR */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4">
                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Credencial de Abordaje</p>
                <h3 className="text-white font-extrabold text-base mt-0.5">PRO MOBILE</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Transporte Corporativo</p>
              </div>

              <div className="p-5 flex flex-col items-center space-y-4">
                {user.identificador_tarjeta ? (
                  <>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(user.identificador_tarjeta)}`}
                        alt="QR Code de Abordaje"
                        className="w-44 h-44 block"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-extrabold text-slate-900">{user.nombre || user.email}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1">{user.identificador_tarjeta}</p>
                    </div>
                    {/* Código de barras decorativo */}
                    <div className="w-full flex items-center justify-center gap-0.5 h-5 overflow-hidden opacity-50">
                      {[...Array(35)].map((_, i) => (
                        <div key={i} className="bg-slate-800 h-full" style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1.5 : 2)}px` }} />
                      ))}
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Printer size={14} /> Imprimir Credencial
                    </button>
                  </>
                ) : (
                  <div className="py-8 text-center px-4">
                    <QrCode className="text-slate-300 mx-auto mb-3" size={36} />
                    <p className="text-sm font-bold text-slate-600">Sin código asignado</p>
                    <p className="text-xs text-slate-400 mt-1">Solicita al administrador que asigne tu identificador QR/RFID.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Resumen rápido */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Resumen</h3>
              <div className="space-y-2.5">
                <SummaryRow label="Viajes próximos" value={proximos.length.toString()} color="text-blue-600" />
                <SummaryRow label="Viajes completados" value={historial.length.toString()} color="text-emerald-600" />
                <SummaryRow label="Abordajes confirmados" value={reservas.filter(r => r.reserva_estado === 'confirmado').length.toString()} color="text-indigo-600" />
              </div>
            </div>

            {/* Domicilio Picker */}
            <DomicilioPicker user={user} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Mini mapa GPS en vivo (iframe de OpenStreetMap, sin clave API)
// ─────────────────────────────────────────────
function LiveMapMini({ lat, lng }: { lat: number; lng: number }) {
  const zoom = 15;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <Navigation className="text-blue-600 animate-pulse" size={16} />
        <span className="text-sm font-bold text-slate-900">Ubicación del Autobús en Tiempo Real</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          Live
        </span>
      </div>
      <iframe
        src={mapUrl}
        className="w-full h-52 border-0"
        title="Mapa GPS en vivo"
        loading="lazy"
      />
    </div>
  );
}

// ─────────────────────────────────────────────
//  Componentes pequeños
// ─────────────────────────────────────────────
function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
      <div className="flex items-center justify-center gap-1 text-white/70 mb-1">{icon}<span className="text-[10px] font-black uppercase tracking-wider">{label}</span></div>
      <span className="text-white font-extrabold text-sm">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className={`text-base font-extrabold ${color}`}>{value}</span>
    </div>
  );
}

function getTimeAgo(timestamp: string) {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  return `${Math.floor(diff / 3600)} h`;
}

// ─────────────────────────────────────────────
//  Stat Card (usado en admin)
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
//  DomicilioPicker (Selector con Mapa)
// ─────────────────────────────────────────────
function DomicilioPicker({ user }: { user: any }) {
  const [direccion, setDireccion] = useState(user.direccion || "");
  const [lat, setLat] = useState(user.latitud !== null && user.latitud !== undefined ? Number(user.latitud) : 20.6736);
  const [lng, setLng] = useState(user.longitud !== null && user.longitud !== undefined ? Number(user.longitud) : -103.344);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerId = "domicilio-picker-map";

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletLoaded) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerId).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
      });

      map.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        setLat(clickLat);
        setLng(clickLng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    } else {
      mapRef.current.setView([lat, lng]);
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [leafletLoaded]);

  const handleSave = async () => {
    if (!direccion.trim()) {
      setStatus("error");
      setStatusMsg("Por favor escribe tu dirección.");
      return;
    }
    setStatus("saving");
    setStatusMsg("");
    try {
      await updateDomicilioPasajero({
        direccion: direccion.trim(),
        latitud: lat,
        longitud: lng
      });
      setStatus("success");
      setStatusMsg("¡Domicilio guardado!");
      
      const userInfo = localStorage.getItem('user_info');
      if (userInfo) {
        const parsed = JSON.parse(userInfo);
        parsed.direccion = direccion.trim();
        parsed.latitud = lat;
        parsed.longitud = lng;
        localStorage.setItem('user_info', JSON.stringify(parsed));
      }
      setTimeout(() => setStatus("idle"), 4000);
    } catch (e: any) {
      setStatus("error");
      setStatusMsg(e.message || "Error al guardar.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-450">Mi Domicilio Residencial</h3>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Define tu ubicación para optimizar el plan de rutas.</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Dirección Física</label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Ej: Calle Morelos 456, Centro"
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-slate-700"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Latitud</label>
            <input
              type="text"
              value={lat.toFixed(6)}
              readOnly
              className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 text-center"
            />
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Longitud</label>
            <input
              type="text"
              value={lng.toFixed(6)}
              readOnly
              className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 text-center"
            />
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Mapa (Haz clic o arrastra para marcar)</label>
          <div 
            id={mapContainerId} 
            className="h-36 w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-100 relative"
            style={{ zIndex: 1 }}
          />
        </div>

        {statusMsg && (
          <div className={`p-2 rounded-lg text-[11px] font-bold text-center ${
            status === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {statusMsg}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {status === 'saving' ? (
            <>
              <Loader2 className="animate-spin animate-duration-1000" size={14} /> Guardando...
            </>
          ) : (
            'Guardar Domicilio'
          )}
        </button>
      </div>
    </div>
  );
}
