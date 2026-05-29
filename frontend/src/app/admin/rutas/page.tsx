"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { 
  Route, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Save, 
  Loader2, 
  Map
} from "lucide-react";
import { 
  fetchRutas, 
  createRuta, 
  updateRuta, 
  deleteRuta,
  fetchCatalogoSedes
} from "@/lib/api";

export default function RutasPage() {
  const [rutas, setRutas] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  // Form states
  const [nombre, setNombre] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [activo, setActivo] = useState(true);
  const [sedeId, setSedeId] = useState<string>("");
  
  // Paradas management
  const [paradas, setParadas] = useState<any[]>([]);
  const [tempParadaNombre, setTempParadaNombre] = useState("");
  const [tempParadaLat, setTempParadaLat] = useState("");
  const [tempParadaLng, setTempParadaLng] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        const globalAdmin = 
          user.rol === 'admin_cliente' || 
          user.rol === 'superadmin' ||
          user.email === 'ing.ballesteros16@gmail.com';
        setIsGlobalAdmin(globalAdmin);

        const isAdmin = 
          user.rol === 'admin' || 
          user.rol === 'admin_cliente' || 
          user.rol === 'admin_proveedor' ||
          user.rol === 'superadmin';
        if (!isAdmin) {
          router.push('/');
        }
      } catch (e) {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
    loadRutas();
  }, []);

  const loadRutas = async () => {
    setLoading(true);
    try {
      const data = await fetchRutas();
      setRutas(data);

      const sedesData = await fetchCatalogoSedes();
      setSedes(sedesData);
    } catch (error) {
      console.error("Error loading routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setNombre("");
    setOrigen("");
    setDestino("");
    setActivo(true);
    setSedeId("");
    setParadas([]);
    setTempParadaNombre("");
    setTempParadaLat("");
    setTempParadaLng("");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ruta: any) => {
    setIsEditing(true);
    setCurrentId(ruta.id);
    setNombre(ruta.nombre);
    setOrigen(ruta.origen);
    setDestino(ruta.destino);
    setActivo(ruta.activo);
    setSedeId(ruta.sede_id ? ruta.sede_id.toString() : "");
    setParadas(Array.isArray(ruta.paradas) ? ruta.paradas : []);
    setTempParadaNombre("");
    setTempParadaLat("");
    setTempParadaLng("");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleAddParada = () => {
    if (!tempParadaNombre.trim() || !tempParadaLat.trim() || !tempParadaLng.trim()) {
      setErrorMsg("Completa todos los datos de la parada (Nombre, Lat y Lng).");
      return;
    }
    const lat = Number(tempParadaLat);
    const lng = Number(tempParadaLng);
    if (isNaN(lat) || isNaN(lng)) {
      setErrorMsg("Coordenadas Latitud y Longitud deben ser números válidos.");
      return;
    }
    setParadas([...paradas, { nombre: tempParadaNombre, latitud: lat, longitud: lng }]);
    setTempParadaNombre("");
    setTempParadaLat("");
    setTempParadaLng("");
    setErrorMsg("");
  };

  const handleRemoveParada = (index: number) => {
    setParadas(paradas.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !origen.trim() || !destino.trim()) {
      setErrorMsg("Nombre, Origen y Destino son campos requeridos.");
      return;
    }

    const payload = {
      nombre,
      origen,
      destino,
      paradas,
      activo,
      sede_id: sedeId ? Number(sedeId) : null
    };

    try {
      if (isEditing && currentId !== null) {
        await updateRuta(currentId, payload);
      } else {
        await createRuta(payload);
      }
      setIsModalOpen(false);
      loadRutas();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar la ruta.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta ruta de transporte?")) return;
    try {
      await deleteRuta(id);
      loadRutas();
    } catch (err) {
      console.error("Error deleting route:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Route className="text-blue-600" size={32} />
            Gestión de Rutas
          </h1>
          <p className="text-slate-500 font-medium text-sm lg:text-base">Registra, configura y planifica los recorridos y paradas del servicio.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-600 text-white font-bold rounded-xl p-3 px-5 text-sm hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all self-start sm:self-center"
        >
          <Plus size={18} /> Nueva Ruta
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rutas.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Route className="text-slate-300 mx-auto mb-4" size={48} />
              <p className="text-slate-500 font-bold text-lg">No hay rutas registradas</p>
              <p className="text-slate-400 text-sm mt-1">Haz clic en "Nueva Ruta" para crear tu primer recorrido.</p>
            </div>
          ) : (
            rutas.map((ruta) => (
              <div key={ruta.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative group">
                <span className={`absolute top-6 right-6 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  ruta.activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                }`}>
                  {ruta.activo ? 'Activa' : 'Inactiva'}
                </span>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 pr-16">{ruta.nombre}</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Ruta ID: #{ruta.id}</p>
                  </div>
                  
                  <div className="space-y-2 border-l border-slate-200 pl-4 relative">
                    <div className="relative">
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full absolute -left-[21.5px] top-1"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block leading-none">Inicio</span>
                      <span className="text-sm font-semibold text-slate-700">{ruta.origen}</span>
                    </div>
                    <div className="relative mt-3">
                      <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full absolute -left-[21.5px] top-1"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block leading-none">Destino</span>
                      <span className="text-sm font-semibold text-slate-700">{ruta.destino}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Paradas Intermedias ({ruta.paradas?.length || 0})</span>
                    {Array.isArray(ruta.paradas) && ruta.paradas.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {ruta.paradas.map((p: any, i: number) => (
                          <span key={i} className="text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <MapPin size={10} className="text-slate-400" /> {p.nombre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium italic">Directo (sin paradas intermitentes)</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 border-t border-slate-50 pt-4">
                  <button 
                    onClick={() => handleOpenEdit(ruta)}
                    className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all"
                    title="Editar Ruta"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(ruta.id)}
                    className="p-2 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-xl transition-all"
                    title="Eliminar Ruta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal para Crear/Editar Ruta */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl p-6 relative border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-extrabold text-slate-950 flex items-center gap-2 mb-4">
              <Route className="text-blue-600" size={22} />
              {isEditing ? "Editar Ruta de Transporte" : "Crear Nueva Ruta de Transporte"}
            </h3>
            {errorMsg && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold">
                {errorMsg}
              </div>
            )}
            
            <form onSubmit={handleSave} className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Nombre de la Ruta</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Ruta Central Nocturna"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Sede Cliente</label>
                  <select
                    value={sedeId}
                    onChange={(e) => setSedeId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                    required
                  >
                    <option value="">Selecciona la sede cliente</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} {isGlobalAdmin && s.proveedor_nombre ? `(${s.proveedor_nombre})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="inline-flex items-center cursor-pointer mt-2">
                  <input 
                    type="checkbox" 
                    checked={activo} 
                    onChange={(e) => setActivo(e.target.checked)} 
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ms-3 text-sm font-bold text-slate-700">Ruta Habilitada / Activa</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Punto de Partida (Origen)</label>
                  <input
                    type="text"
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    placeholder="Ej: Planta de Producción A"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Destino Final</label>
                  <input
                    type="text"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    placeholder="Ej: Zona Habitacional Sur"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  />
                </div>
              </div>

              {/* Paradas intermedias Section */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-sm font-bold text-slate-800 mb-2">Paradas de Abordaje y Descenso</h4>
                
                {/* Formulario Agregar Parada */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nombre Parada</span>
                      <input
                        type="text"
                        value={tempParadaNombre}
                        onChange={(e) => setTempParadaNombre(e.target.value)}
                        placeholder="Ej: Parada Av. Juárez"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs font-semibold text-slate-700"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Latitud GPS</span>
                      <input
                        type="text"
                        value={tempParadaLat}
                        onChange={(e) => setTempParadaLat(e.target.value)}
                        placeholder="Ej: 20.6736"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs font-semibold text-slate-700"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Longitud GPS</span>
                      <input
                        type="text"
                        value={tempParadaLng}
                        onChange={(e) => setTempParadaLng(e.target.value)}
                        placeholder="Ej: -103.344"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs font-semibold text-slate-700"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddParada}
                    className="w-full py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> Agregar Parada a la Ruta
                  </button>
                </div>

                {/* Listado de Paradas actuales */}
                <div className="mt-4 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Paradas Registradas ({paradas.length})</span>
                  {paradas.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No hay paradas configuradas en este recorrido todavía.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {paradas.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500">
                              {i + 1}
                            </span>
                            {p.nombre} 
                            <span className="text-[10px] text-slate-400 font-semibold italic">({p.latitud}, {p.longitud})</span>
                          </span>
                          <button 
                            type="button"
                            onClick={() => handleRemoveParada(i)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-900/10 transition-all flex items-center justify-center gap-1"
                >
                  <Save size={16} /> Guardar Ruta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
