"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Save, 
  Loader2, 
  Briefcase,
  Calendar,
  Building
} from "lucide-react";
import { 
  fetchCatalogoSedes, 
  createCatalogoSede, 
  updateCatalogoSede, 
  deleteCatalogoSede,
  fetchCatalogoProveedores
} from "@/lib/api";

export default function SedesPage() {
  const [sedes, setSedes] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  // Form states
  const [nombre, setNombre] = useState("");
  const [proveedorId, setProveedorId] = useState<string>("");
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
      } catch (e) {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const sedesData = await fetchCatalogoSedes();
      setSedes(sedesData);
      
      const provsData = await fetchCatalogoProveedores();
      setProveedores(provsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setNombre("");
    setProveedorId("");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sede: any) => {
    setIsEditing(true);
    setCurrentId(sede.id);
    setNombre(sede.nombre);
    setProveedorId(sede.proveedor_id ? sede.proveedor_id.toString() : "");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg("El nombre de la sede es obligatorio.");
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      proveedor_id: proveedorId ? Number(proveedorId) : null
    };

    try {
      if (isEditing && currentId !== null) {
        await updateCatalogoSede(currentId, payload);
      } else {
        await createCatalogoSede(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar la sede.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Deseas eliminar esta sede? Esto afectará a los pasajeros y rutas asignadas a esta sede.")) return;
    try {
      await deleteCatalogoSede(id);
      loadData();
    } catch (err) {
      console.error("Error deleting sede:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-blue-600" size={32} />
            Clientes & Sedes Corporativas
          </h1>
          <p className="text-slate-500 font-medium text-sm lg:text-base">
            Administra las plantas corporativas y sedes de clientes que reciben el servicio de transporte.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-600 text-white font-bold rounded-xl p-3 px-5 text-sm hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all self-start sm:self-center"
        >
          <Plus size={18} /> Registrar Sede
        </button>
      </div>

      {/* BODY LIST */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sedes.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Building2 className="text-slate-300 mx-auto mb-4" size={48} />
              <p className="text-slate-500 font-bold text-lg">No hay sedes registradas</p>
              <p className="text-slate-400 text-sm mt-1">Haz clic en "Registrar Sede" para dar de alta tu primera sede de cliente.</p>
            </div>
          ) : (
            sedes.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-md tracking-wider">
                      Sede ID: {s.id}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-extrabold text-slate-900">{s.nombre}</h3>
                    {s.proveedor_nombre && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                        <Building size={14} className="text-slate-400" />
                        <span>Proveedor: <span className="text-blue-600">{s.proveedor_nombre}</span></span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                      <Calendar size={14} />
                      <span>Registrada: {new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 border-t border-slate-50 pt-4">
                  <button 
                    onClick={() => handleOpenEdit(s)}
                    className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all"
                    title="Editar Sede"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(s.id)}
                    className="p-2 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-xl transition-all"
                    title="Eliminar Sede"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL REGISTRAR/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-extrabold text-slate-950 flex items-center gap-2 mb-4">
              <Building2 className="text-blue-600" size={22} />
              {isEditing ? "Editar Datos de Sede" : "Registrar Nueva Sede"}
            </h3>
            {errorMsg && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold animate-pulse">
                {errorMsg}
              </div>
            )}
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Nombre de Sede / Planta</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Planta Industrial Norte"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  required
                />
              </div>

              {isGlobalAdmin && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Empresa Transportista (Proveedor)</label>
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  >
                    <option value="">Selecciona un proveedor (Opcional)</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

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
                  <Save size={16} /> Guardar Sede
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
