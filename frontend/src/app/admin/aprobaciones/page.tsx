"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { 
  CheckSquare, 
  Check, 
  X, 
  Clock, 
  User, 
  Route, 
  Bus, 
  Loader2, 
  Search, 
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { 
  fetchReservasPendientes, 
  aprobarReserva, 
  rechazarReserva 
} from "@/lib/api";

export default function AprobacionesPage() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [historialSesion, setHistorialSesion] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [notas, setNotas] = useState<{ [key: number]: string }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"pendientes" | "historial">("pendientes");
  const [errorMsg, setErrorMsg] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        const role = user.rol?.toLowerCase();
        const userEmail = user.email?.trim().toLowerCase();
        const allowed = 
          role === 'admin' || 
          role === 'admin_cliente' || 
          role === 'admin_proveedor' ||
          role === 'superadmin' ||
          role === 'gerente' ||
          userEmail === 'ing.ballesteros16@gmail.com';
        
        if (!allowed) {
          router.push('/');
        } else {
          setIsAllowed(true);
          loadPendientes();
        }
      } catch (e) {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, []);

  const loadPendientes = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await fetchReservasPendientes();
      setPendientes(data);
    } catch (error: any) {
      console.error("Error loading pending approvals:", error);
      setErrorMsg("No se pudieron cargar las solicitudes pendientes.");
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (id: number) => {
    setActionLoading(id);
    setErrorMsg("");
    try {
      const nota = notas[id] || "";
      const approved = await aprobarReserva(id, nota);
      
      // Encontrar la reserva para moverla al historial de la sesión
      const item = pendientes.find(p => p.id === id);
      if (item) {
        setHistorialSesion(prev => [
          { ...item, estado: 'reservado', notas_gerente: nota, fecha_aprobacion: new Date() },
          ...prev
        ]);
      }

      setPendientes(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      setErrorMsg("No se pudo aprobar la reservación.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRechazar = async (id: number) => {
    setActionLoading(id);
    setErrorMsg("");
    try {
      const nota = notas[id] || "";
      await rechazarReserva(id, nota);
      
      // Encontrar la reserva para moverla al historial de la sesión
      const item = pendientes.find(p => p.id === id);
      if (item) {
        setHistorialSesion(prev => [
          { ...item, estado: 'rechazado', notas_gerente: nota, fecha_aprobacion: new Date() },
          ...prev
        ]);
      }

      setPendientes(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      setErrorMsg("No se pudo rechazar la reservación.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleNotaChange = (id: number, text: string) => {
    setNotas(prev => ({ ...prev, [id]: text }));
  };

  const filteredPendientes = pendientes.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.pasajero_nombre?.toLowerCase().includes(term) ||
      item.pasajero_email?.toLowerCase().includes(term) ||
      item.ruta_nombre?.toLowerCase().includes(term) ||
      item.destino?.toLowerCase().includes(term)
    );
  });

  if (!isAllowed) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <CheckSquare className="text-blue-500" size={28} />
            Aprobación de Viajes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Revisa y autoriza las solicitudes de transporte hechas por los empleados de la empresa.
          </p>
        </div>
        
        {/* Búsqueda */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 w-5 text-slate-500" />
          </span>
          <input
            type="text"
            className="w-full bg-slate-800 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-500"
            placeholder="Buscar por pasajero, ruta o destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3 text-sm">
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          className={`px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === "pendientes"
              ? "border-blue-500 text-blue-400 bg-blue-500/5"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("pendientes")}
        >
          Pendientes ({pendientes.length})
        </button>
        <button
          className={`px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === "historial"
              ? "border-blue-500 text-blue-400 bg-blue-500/5"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("historial")}
        >
          Historial de Sesión ({historialSesion.length})
        </button>
      </div>

      {/* Listado */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="animate-spin text-blue-500" size={36} />
          <p className="text-sm">Cargando solicitudes...</p>
        </div>
      ) : activeTab === "pendientes" ? (
        filteredPendientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            <CheckSquare size={48} className="text-slate-700 mb-3" />
            <p className="font-medium text-lg text-slate-400">Todo al día</p>
            <p className="text-sm text-slate-600 mt-1">No hay solicitudes de reservación pendientes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPendientes.map((item) => {
              const salida = new Date(item.fecha_hora_salida);
              const salidaStr = salida.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const salidaDay = salida.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

              return (
                <div 
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col hover:border-slate-700 transition-all duration-200"
                >
                  {/* Status strip */}
                  <div className="bg-gradient-to-r from-amber-500/35 to-amber-500/10 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between">
                    <span className="text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={12} className="animate-pulse" />
                      Pendiente Aprobación
                    </span>
                    <span className="text-slate-500 text-xs font-bold">Solicitud #{item.id}</span>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 space-y-4">
                    {/* Pasajero */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <User size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {item.pasajero_nombre}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{item.pasajero_email}</p>
                      </div>
                    </div>

                    {/* Detalles viaje */}
                    <div className="space-y-2 border-t border-slate-800/80 pt-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Route size={14} className="text-blue-500" />
                        <span className="font-semibold text-slate-300">Ruta:</span>
                        <span className="truncate">{item.ruta_nombre}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500 ml-1"></div>
                        <span className="font-medium text-slate-400">Origen:</span>
                        <span className="truncate">{item.origen}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1"></div>
                        <span className="font-medium text-slate-300">Destino:</span>
                        <span className="truncate text-white font-bold">{item.destino}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-800/40 pt-2 mt-1">
                        <Clock size={14} className="text-emerald-500" />
                        <span className="font-semibold text-slate-300">Salida:</span>
                        <span>{salidaDay} - {salidaStr}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Bus size={14} className="text-indigo-400" />
                        <span className="font-semibold text-slate-300">Vehículo:</span>
                        <span>{item.modelo} ({item.patente})</span>
                      </div>
                    </div>

                    {/* Asiento Asignado (Opción A) */}
                    <div className="p-2.5 bg-slate-950 rounded-lg flex items-center justify-between border border-slate-800/60">
                      <span className="text-xs text-slate-400 font-medium">Asiento asignado:</span>
                      <span className="bg-blue-600 text-white font-black text-sm px-3 py-1 rounded-md">
                        Asiento #{item.asiento_numero}
                      </span>
                    </div>

                    {/* Campo Notas */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare size={10} />
                        Nota al Empleado (Opcional)
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 text-white text-xs rounded-md px-3 py-2 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-700"
                        placeholder="Ej: Aprobado para capacitación..."
                        value={notas[item.id] || ""}
                        onChange={(e) => handleNotaChange(item.id, e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 grid grid-cols-2 gap-3">
                    <button
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-red-600/10 text-red-500 border border-red-500/10 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                      onClick={() => handleRechazar(item.id)}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === item.id ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <X size={14} />
                      )}
                      Rechazar
                    </button>
                    
                    <button
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-md disabled:opacity-50"
                      onClick={() => handleAprobar(item.id)}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === item.id ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Check size={14} />
                      )}
                      Autorizar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Historial de la Sesión */
        historialSesion.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            <Clock size={48} className="text-slate-700 mb-3" />
            <p className="font-medium text-lg text-slate-400">Sin movimientos</p>
            <p className="text-sm text-slate-600 mt-1">Las solicitudes procesadas en esta sesión se mostrarán aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900/40">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Pasajero</th>
                  <th className="p-4">Ruta / Destino</th>
                  <th className="p-4">Asiento</th>
                  <th className="p-4">Nota / Comentario</th>
                  <th className="p-4">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm text-slate-300">
                {historialSesion.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40">
                    <td className="p-4">
                      <div>
                        <div className="font-semibold text-white">{item.pasajero_nombre}</div>
                        <div className="text-xs text-slate-500">{item.pasajero_email}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="text-white font-medium">{item.ruta_nombre}</div>
                        <div className="text-xs text-slate-500">Destino: {item.destino}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono bg-slate-850 px-2 py-1 rounded text-xs text-slate-300">
                        #{item.asiento_numero}
                      </span>
                    </td>
                    <td className="p-4 text-xs italic text-slate-400">
                      {item.notas_gerente || "-"}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        item.estado === 'reservado' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {item.estado === 'reservado' ? (
                          <>
                            <Check size={12} />
                            Aprobado
                          </>
                        ) : (
                          <>
                            <X size={12} />
                            Rechazado
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
