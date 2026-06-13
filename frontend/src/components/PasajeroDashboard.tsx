"use client";

import React, { useEffect, useState } from "react";
import { 
  Bus, 
  Clock, 
  AlertTriangle, 
  Loader2, 
  Calendar, 
  Armchair, 
  Navigation, 
  Printer, 
  QrCode,
  CheckCircle2
} from "lucide-react";
import { 
  fetchReservasPasajero, 
  fetchViajesDisponibles, 
  solicitarReserva 
} from "@/lib/api";
import LiveMapMini from "./LiveMapMini";
import DomicilioPicker from "./DomicilioPicker";

interface PasajeroDashboardProps {
  user: any;
}

export default function PasajeroDashboard({ user }: PasajeroDashboardProps) {
  const [reservas, setReservas] = useState<any[]>([]);
  const [viajesDisponibles, setViajesDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<number | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

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
              <LiveMapMini lat={Number(proximoViaje.ultima_ubicacion.latitud)} lng={Number(proximoViaje.ultima_ubicacion.longitud)} />
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
//  Componentes pequeños y helpers
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
