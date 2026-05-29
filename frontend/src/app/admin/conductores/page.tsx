"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { 
  User, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Save, 
  Loader2, 
  Mail,
  Tag,
  Briefcase
} from "lucide-react";
import { 
  fetchConductores, 
  createConductor, 
  updateConductor, 
  deleteConductor,
  fetchCatalogoProveedores
} from "@/lib/api";

export default function ConductoresPage() {
  const [conductores, setConductores] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  // Form states
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [gestorCode, setGestorCode] = useState("");
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
    loadConductores();
  }, []);

  const loadConductores = async () => {
    setLoading(true);
    try {
      const data = await fetchConductores();
      setConductores(data);

      const userInfo = localStorage.getItem('user_info');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        const globalAdmin = 
          user.rol === 'admin_cliente' || 
          user.rol === 'superadmin' ||
          user.email === 'ing.ballesteros16@gmail.com';
        if (globalAdmin) {
          const provsData = await fetchCatalogoProveedores();
          setEmpresas(provsData);
        }
      }
    } catch (error) {
      console.error("Error loading conductores:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setNombre("");
    setEmail("");
    setGestorCode("");
    setProveedorId("");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (conductor: any) => {
    setIsEditing(true);
    setCurrentId(conductor.id);
    setNombre(conductor.nombre);
    setEmail(conductor.email);
    setGestorCode(conductor.gestor_code || "");
    setProveedorId(conductor.proveedor_id ? conductor.proveedor_id.toString() : "");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) {
      setErrorMsg("Nombre y Correo Electrónico son obligatorios.");
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      gestor_code: gestorCode.trim() || null,
      proveedor_id: proveedorId ? Number(proveedorId) : null
    };

    try {
      if (isEditing && currentId !== null) {
        await updateConductor(currentId, payload);
      } else {
        await createConductor(payload);
      }
      setIsModalOpen(false);
      loadConductores();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar el conductor.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Deseas eliminar este conductor del sistema? Esto cancelará sus viajes asignados.")) return;
    try {
      await deleteConductor(id);
      loadConductores();
    } catch (err) {
      console.error("Error deleting conductor:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="text-blue-600" size={32} />
            Administración de Conductores
          </h1>
          <p className="text-slate-500 font-medium text-sm lg:text-base">
            Gestiona los conductores autorizados para el transporte corporativo.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-600 text-white font-bold rounded-xl p-3 px-5 text-sm hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all self-start sm:self-center"
        >
          <Plus size={18} /> Registrar Conductor
        </button>
      </div>

      {/* BODY LIST */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conductores.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Briefcase className="text-slate-300 mx-auto mb-4" size={48} />
              <p className="text-slate-500 font-bold text-lg">No hay conductores registrados</p>
              <p className="text-slate-400 text-sm mt-1">Haz clic en "Registrar Conductor" para dar de alta tu primer conductor.</p>
            </div>
          ) : (
            conductores.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-md tracking-wider">
                      ID Conductor
                    </span>
                    <span className="text-xs text-slate-400 font-bold max-w-[150px] truncate" title={c.id}>
                      {c.id.slice(0, 8)}...
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-extrabold text-slate-900">{c.nombre}</h3>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                        <Mail size={14} className="text-slate-400" />
                        <span className="truncate">{c.email}</span>
                      </div>
                      {c.gestor_code && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                          <Tag size={14} className="text-slate-400" />
                          Código: <span className="text-slate-800 font-bold">{c.gestor_code}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 border-t border-slate-50 pt-4">
                  <button 
                    onClick={() => handleOpenEdit(c)}
                    className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all"
                    title="Editar Conductor"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(c.id)}
                    className="p-2 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-xl transition-all"
                    title="Eliminar Conductor"
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
              <Briefcase className="text-blue-600" size={22} />
              {isEditing ? "Editar Datos del Conductor" : "Registrar Nuevo Conductor"}
            </h3>
            {errorMsg && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold animate-pulse">
                {errorMsg}
              </div>
            )}
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full p-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ej: juan.perez@empresa.com"
                    className="w-full p-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Código de Conductor (Opcional)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={gestorCode}
                    onChange={(e) => setGestorCode(e.target.value)}
                    placeholder="Ej: CONDU01"
                    className="w-full p-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400 block mt-1">
                  Código identificador único para el conductor (ej: CONDU01).
                </span>
              </div>

              {isGlobalAdmin && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Empresa Transportista (Proveedor)</label>
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  >
                    <option value="">Selecciona la empresa transportista (Opcional)</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.nombre}</option>
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
                  <Save size={16} /> Guardar Conductor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
