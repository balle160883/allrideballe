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
  Building,
  Calendar
} from "lucide-react";
import { 
  fetchCatalogoProveedores, 
  createCatalogoProveedor, 
  updateCatalogoProveedor, 
  deleteCatalogoProveedor 
} from "@/lib/api";

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  // Form states
  const [nombre, setNombre] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        const isGlobalAdmin = 
          user.rol === 'admin_cliente' || 
          user.rol === 'superadmin' ||
          user.email === 'ing.ballesteros16@gmail.com';
        if (!isGlobalAdmin) {
          router.push('/');
        }
      } catch (e) {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    setLoading(true);
    try {
      const data = await fetchCatalogoProveedores();
      setEmpresas(data);
    } catch (error) {
      console.error("Error loading empresas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setNombre("");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (empresa: any) => {
    setIsEditing(true);
    setCurrentId(empresa.id);
    setNombre(empresa.nombre);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg("El nombre de la empresa es obligatorio.");
      return;
    }

    const payload = {
      nombre: nombre.trim()
    };

    try {
      if (isEditing && currentId !== null) {
        await updateCatalogoProveedor(currentId, payload);
      } else {
        await createCatalogoProveedor(payload);
      }
      setIsModalOpen(false);
      loadEmpresas();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar la empresa.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Deseas eliminar esta empresa del catálogo? Esto podría afectar a los conductores y vehículos asociados.")) return;
    try {
      await deleteCatalogoProveedor(id);
      loadEmpresas();
    } catch (err) {
      console.error("Error deleting empresa:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building className="text-blue-600" size={32} />
            Empresas Transportistas
          </h1>
          <p className="text-slate-500 font-medium text-sm lg:text-base">
            Administra las compañías proveedoras de transporte en el sistema SaaS.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-600 text-white font-bold rounded-xl p-3 px-5 text-sm hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all self-start sm:self-center"
        >
          <Plus size={18} /> Registrar Empresa
        </button>
      </div>

      {/* BODY LIST */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {empresas.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Building2 className="text-slate-300 mx-auto mb-4" size={48} />
              <p className="text-slate-500 font-bold text-lg">No hay empresas registradas</p>
              <p className="text-slate-400 text-sm mt-1">Haz clic en "Registrar Empresa" para dar de alta tu primera empresa.</p>
            </div>
          ) : (
            empresas.map((e) => (
              <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-md tracking-wider">
                      Empresa ID: {e.id}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-extrabold text-slate-900">{e.nombre}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                      <Calendar size={14} />
                      <span>Registrada: {new Date(e.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 border-t border-slate-50 pt-4">
                  <button 
                    onClick={() => handleOpenEdit(e)}
                    className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all"
                    title="Editar Empresa"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(e.id)}
                    className="p-2 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-xl transition-all"
                    title="Eliminar Empresa"
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
              <Building className="text-blue-600" size={22} />
              {isEditing ? "Editar Datos de Empresa" : "Registrar Nueva Empresa"}
            </h3>
            {errorMsg && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold animate-pulse">
                {errorMsg}
              </div>
            )}
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Nombre de Empresa</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Transportes ASVI S.A."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  required
                />
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
                  <Save size={16} /> Guardar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
