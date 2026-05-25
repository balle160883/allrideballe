"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  X, 
  Save, 
  Loader2, 
  Users, 
  Clock, 
  CheckCircle, 
  Ticket,
  Bus,
  Route,
  UserCheck
} from "lucide-react";
import { 
  fetchViajes, 
  createViaje, 
  deleteViaje, 
  fetchRutas, 
  fetchVehiculos, 
  fetchConductores,
  fetchPasajeros,
  fetchReservas,
  createReserva,
  updateReservaEstado,
  updateViajeEstado
} from "@/lib/api";

export default function ViajesPage() {
  const [viajes, setViajes] = useState<any[]>([]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [conductores, setConductores] = useState<any[]>([]);
  const [pasajeros, setPasajeros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedViaje, setSelectedViaje] = useState<any>(null);
  const [isReservasModalOpen, setIsReservasModalOpen] = useState(false);
  const [reservas, setReservas] = useState<any[]>([]);
  const [loadingReservas, setLoadingReservas] = useState(false);

  // Form states - Viaje
  const [rutaId, setRutaId] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [conductorId, setConductorId] = useState("");
  const [fechaHoraSalida, setFechaHoraSalida] = useState("");

  // Form states - Reserva
  const [pasajeroId, setPasajeroId] = useState("");
  const [asientoNumero, setAsientoNumero] = useState(1);

  const [errorMsg, setErrorMsg] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        const admin = 
          user.rol === 'admin' || 
          user.rol === 'admin_cliente' || 
          user.rol === 'admin_proveedor' ||
          user.rol === 'superadmin';
        setIsAdmin(admin);
      } catch (e) {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [viajesData, rutasData, vehiculosData, conductoresData, pasajerosData] = await Promise.all([
        fetchViajes(),
        fetchRutas(),
        fetchVehiculos(),
        fetchConductores(),
        fetchPasajeros()
      ]);
      setViajes(viajesData);
      setRutas(rutasData);
      setVehiculos(vehiculosData);
      setConductores(conductoresData);
      setPasajeros(pasajerosData);
    } catch (error) {
      console.error("Error loading scheduling data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setRutaId(rutas[0]?.id || "");
    setVehiculoId(vehiculos[0]?.id || "");
    setConductorId(conductores[0]?.id || "");
    setFechaHoraSalida("");
    setErrorMsg("");
    setIsCreateModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rutaId || !vehiculoId || !conductorId || !fechaHoraSalida) {
      setErrorMsg("Completa todos los datos para programar el viaje.");
      return;
    }

    try {
      await createViaje({
        ruta_id: Number(rutaId),
        vehiculo_id: Number(vehiculoId),
        conductor_id: conductorId,
        fecha_hora_salida: new Date(fechaHoraSalida).toISOString()
      });
      setIsCreateModalOpen(false);
      loadAllData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al programar viaje.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Deseas cancelar y eliminar este viaje programado?")) return;
    try {
      await deleteViaje(id);
      loadAllData();
    } catch (err) {
      console.error("Error deleting trip:", err);
    }
  };

  const handleOpenReservas = async (viaje: any) => {
    setSelectedViaje(viaje);
    setIsReservasModalOpen(true);
    setLoadingReservas(true);
    setPasajeroId(pasajeros[0]?.id || "");
    setAsientoNumero(1);
    try {
      const resData = await fetchReservas(viaje.id);
      setReservas(resData);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoadingReservas(false);
    }
  };

  const handleCreateReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasajeroId || !selectedViaje) return;

    try {
      await createReserva({
        viaje_id: selectedViaje.id,
        pasajero_id: pasajeroId,
        asiento_numero: Number(asientoNumero)
      });
      // Refrescar reservas
      const resData = await fetchReservas(selectedViaje.id);
      setReservas(resData);
      setErrorMsg("");
    } catch (err: any) {
      setErrorMsg(err.message || "Asiento ya reservado o error en base de datos.");
    }
  };

  const handleUpdateReserva = async (reservaId: number, estado: string) => {
    try {
      await updateReservaEstado(reservaId, estado);
      if (selectedViaje) {
        const resData = await fetchReservas(selectedViaje.id);
        setReservas(resData);
      }
    } catch (err) {
      console.error("Error updating booking status:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-blue-600" size={32} />
            Programación de Viajes & Reservas
          </h1>
          <p className="text-slate-500 font-medium text-sm lg:text-base">Programa itinerarios de salida y administra las reservaciones de asientos del personal.</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="bg-blue-600 text-white font-bold rounded-xl p-3 px-5 text-sm hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all self-start sm:self-center"
          >
            <Plus size={18} /> Programar Viaje
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Ruta</th>
                  <th className="p-4">Vehículo asignado</th>
                  <th className="p-4">Conductor</th>
                  <th className="p-4">Fecha & Hora Salida</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 pr-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {viajes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm font-medium text-slate-400">
                      No hay itinerarios ni viajes programados en el sistema.
                    </td>
                  </tr>
                ) : (
                  viajes.map((viaje) => (
                    <tr key={viaje.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                      <td className="p-4 pl-6">
                        <span className="font-bold text-slate-950 block">{viaje.ruta_nombre}</span>
                        <span className="text-[11px] text-slate-400">{viaje.origen} → {viaje.destino}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-900 block">{viaje.patente}</span>
                        <span className="text-[11px] text-slate-400">{viaje.modelo} ({viaje.capacidad} Asientos)</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{viaje.conductor_nombre || 'Sin conductor'}</td>
                      <td className="p-4 font-bold text-slate-600">
                        {new Date(viaje.fecha_hora_salida).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          viaje.estado === 'en_ruta' ? 'bg-blue-50 text-blue-700' :
                          viaje.estado === 'programado' ? 'bg-amber-50 text-amber-700' :
                          viaje.estado === 'cancelado' ? 'bg-red-50 text-red-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {viaje.estado === 'en_ruta' ? 'En Ruta' :
                           viaje.estado === 'programado' ? 'Programado' :
                           viaje.estado === 'cancelado' ? 'Cancelado' : 'Finalizado'}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenReservas(viaje)}
                            className="p-1.5 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Ticket size={14} /> Reservas
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(viaje.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-xl transition-all"
                              title="Cancelar Viaje"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Programar Viaje */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-extrabold text-slate-950 flex items-center gap-2 mb-4">
              <Calendar className="text-blue-600" size={22} />
              Programar Despacho / Viaje
            </h3>
            {errorMsg && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold">
                {errorMsg}
              </div>
            )}
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Seleccionar Ruta</label>
                <select
                  value={rutaId}
                  onChange={(e) => setRutaId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                >
                  {rutas.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre} ({r.origen} → {r.destino})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Vehículo</label>
                  <select
                    value={vehiculoId}
                    onChange={(e) => setVehiculoId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  >
                    {vehiculos.map(v => (
                      <option key={v.id} value={v.id}>{v.patente} ({v.modelo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Conductor</label>
                  <select
                    value={conductorId}
                    onChange={(e) => setConductorId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  >
                    {conductores.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Fecha y Hora de Salida</label>
                <input
                  type="datetime-local"
                  value={fechaHoraSalida}
                  onChange={(e) => setFechaHoraSalida(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-900/10 transition-all flex items-center justify-center gap-1"
                >
                  <Save size={16} /> Programar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reservas de Pasajeros */}
      {isReservasModalOpen && selectedViaje && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl p-6 relative border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsReservasModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-extrabold text-slate-950 flex items-center gap-2 mb-2">
              <Ticket className="text-blue-600" size={22} />
              Reservaciones y Manifiesto de Pasajeros
            </h3>
            <p className="text-xs font-semibold text-slate-500 mb-6 border-b border-slate-100 pb-3">
              Ruta: <strong className="text-slate-800">{selectedViaje.ruta_nombre}</strong> | Unidad: <strong className="text-slate-800">{selectedViaje.patente}</strong> ({selectedViaje.capacidad} Asientos)
            </p>

            {/* Formulario para registrar reserva */}
            {isAdmin && (
              <form onSubmit={handleCreateReserva} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Seleccionar Pasajero</span>
                  <select
                    value={pasajeroId}
                    onChange={(e) => setPasajeroId(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    {pasajeros.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Número de Asiento</span>
                  <input
                    type="number"
                    value={asientoNumero}
                    onChange={(e) => setAsientoNumero(Number(e.target.value))}
                    min={1}
                    max={selectedViaje.capacidad}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                  >
                    Reservar Asiento
                  </button>
                </div>
              </form>
            )}

            {/* Listado de Reservas actual */}
            <div className="flex-1 overflow-y-auto pr-2">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Lista de Pasajeros Reservados</h4>
              {loadingReservas ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin text-blue-600" size={24} />
                </div>
              ) : reservas.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">No hay asientos reservados para este viaje.</p>
              ) : (
                <div className="space-y-2">
                  {reservas.map((res: any) => (
                    <div key={res.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center font-extrabold text-blue-700 text-xs">
                          #{res.asiento_numero}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 block">{res.pasajero_nombre}</span>
                          <span className="text-[11px] text-slate-400">ID Tarjeta: {res.identificador_tarjeta || 'Ninguna'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          res.estado === 'reservado' ? 'bg-slate-100 text-slate-600' :
                          res.estado === 'confirmado' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {res.estado === 'reservado' ? 'Reservado' :
                           res.estado === 'confirmado' ? 'Abordado' : 'Cancelado'}
                        </span>
                        
                        <div className="flex gap-1.5">
                          {res.estado === 'reservado' && (
                            <button
                              onClick={() => handleUpdateReserva(res.id, 'confirmado')}
                              className="p-1 px-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-100 transition-all flex items-center gap-0.5"
                            >
                              <UserCheck size={10} /> Abordar
                            </button>
                          )}
                          {res.estado !== 'cancelado' && (
                            <button
                              onClick={() => handleUpdateReserva(res.id, 'cancelado')}
                              className="p-1 px-2.5 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold rounded-lg hover:bg-red-100 transition-all"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
