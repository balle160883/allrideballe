"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Save, 
  Loader2, 
  QrCode,
  Mail,
  User,
  CreditCard,
  Printer,
  MapPin,
  Map
} from "lucide-react";
import { 
  fetchPasajeros, 
  createPasajero, 
  updatePasajero, 
  deletePasajero,
  fetchCatalogoProveedores,
  fetchCatalogoSedes
} from "@/lib/api";

export default function PasajerosPage() {
  const [pasajeros, setPasajeros] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  // Form states
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [identificadorTarjeta, setIdentificadorTarjeta] = useState("");
  const [direccion, setDireccion] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [proveedorId, setProveedorId] = useState<string>("");
  const [sedeId, setSedeId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  // QR Modal State
  const [activePassengerForQR, setActivePassengerForQR] = useState<any | null>(null);

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
    loadPasajeros();
  }, []);

  const loadPasajeros = async () => {
    setLoading(true);
    try {
      const data = await fetchPasajeros();
      setPasajeros(data);

      const sedesData = await fetchCatalogoSedes();
      setSedes(sedesData);

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
      console.error("Error loading passengers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setNombre("");
    setEmail("");
    setIdentificadorTarjeta("");
    setDireccion("");
    setLatitud("");
    setLongitud("");
    setProveedorId("");
    setSedeId("");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pasajero: any) => {
    setIsEditing(true);
    setCurrentId(pasajero.id);
    setNombre(pasajero.nombre);
    setEmail(pasajero.email);
    setIdentificadorTarjeta(pasajero.identificador_tarjeta || "");
    setDireccion(pasajero.direccion || "");
    setLatitud(pasajero.latitud !== null && pasajero.latitud !== undefined ? String(pasajero.latitud) : "");
    setLongitud(pasajero.longitud !== null && pasajero.longitud !== undefined ? String(pasajero.longitud) : "");
    setProveedorId(pasajero.proveedor_id ? pasajero.proveedor_id.toString() : "");
    setSedeId(pasajero.sede_id ? pasajero.sede_id.toString() : "");
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
      identificador_tarjeta: identificadorTarjeta.trim() || null,
      direccion: direccion.trim() || null,
      latitud: latitud ? Number(latitud) : null,
      longitud: longitud ? Number(longitud) : null,
      proveedor_id: proveedorId ? Number(proveedorId) : null,
      sede_id: sedeId ? Number(sedeId) : null
    };

    try {
      if (isEditing && currentId !== null) {
        await updatePasajero(currentId, payload);
      } else {
        await createPasajero(payload);
      }
      setIsModalOpen(false);
      loadPasajeros();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar el pasajero.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Deseas eliminar este pasajero del sistema? Esto cancelará sus reservaciones activas.")) return;
    try {
      await deletePasajero(id);
      loadPasajeros();
    } catch (err) {
      console.error("Error deleting passenger:", err);
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" size={32} />
            Administración de Pasajeros
          </h1>
          <p className="text-slate-500 font-medium text-sm lg:text-base">
            Gestiona los empleados y usuarios registrados para el transporte corporativo.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-600 text-white font-bold rounded-xl p-3 px-5 text-sm hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all self-start sm:self-center"
        >
          <Plus size={18} /> Registrar Pasajero
        </button>
      </div>

      {/* BODY LIST */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pasajeros.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Users className="text-slate-300 mx-auto mb-4" size={48} />
              <p className="text-slate-500 font-bold text-lg">No hay pasajeros registrados</p>
              <p className="text-slate-400 text-sm mt-1">Haz clic en "Registrar Pasajero" para dar de alta tu primer empleado.</p>
            </div>
          ) : (
            pasajeros.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-md tracking-wider">
                      ID Pasajero
                    </span>
                    <span className="text-xs text-slate-400 font-bold max-w-[150px] truncate" title={p.id}>
                      {p.id.slice(0, 8)}...
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-extrabold text-slate-900">{p.nombre}</h3>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                        <Mail size={14} className="text-slate-400" />
                        <span className="truncate">{p.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                        <CreditCard size={14} className="text-slate-400" />
                        Tarjetas/QR: <span className="text-slate-800 font-bold">{p.identificador_tarjeta || 'Sin asignar'}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-xs text-slate-500 font-semibold">
                        <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-2" title={p.direccion || 'Sin domicilio registrado'}>
                          {p.direccion || 'Sin domicilio'}
                          {p.latitud && ` (${Number(p.latitud).toFixed(4)}, ${Number(p.longitud).toFixed(4)})`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6 border-t border-slate-50 pt-4">
                  {p.identificador_tarjeta ? (
                    <button
                      onClick={() => setActivePassengerForQR(p)}
                      className="p-1.5 px-3 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <QrCode size={14} /> Credencial QR
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-md">
                      Requiere Tarjeta
                    </span>
                  )}
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenEdit(p)}
                      className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all"
                      title="Editar Pasajero"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id)}
                      className="p-2 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-xl transition-all"
                      title="Eliminar Pasajero"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
              <Users className="text-blue-600" size={22} />
              {isEditing ? "Editar Datos del Pasajero" : "Registrar Nuevo Pasajero"}
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
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Correo Electrónico (Empresarial)</label>
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
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Identificador Tarjeta / Código QR</label>
                <div className="relative">
                  <QrCode className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={identificadorTarjeta}
                    onChange={(e) => setIdentificadorTarjeta(e.target.value)}
                    placeholder="Ej: QR-9988776655"
                    className="w-full p-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400 block mt-1">
                  Ingresa el código que se codificará en el QR o el ID de la tarjeta física RFID.
                </span>
              </div>

              {isGlobalAdmin && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Empresa Transportista (Proveedor)</label>
                  <select
                    value={proveedorId}
                    onChange={(e) => {
                      setProveedorId(e.target.value);
                      setSedeId(""); // reset selected site
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  >
                    <option value="">Selecciona la empresa transportista</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Sede Cliente</label>
                <select
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  required
                >
                  <option value="">Selecciona la sede del empleado</option>
                  {sedes
                    .filter((s) => !proveedorId || s.proveedor_id === Number(proveedorId))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} {isGlobalAdmin && s.proveedor_nombre ? `(${s.proveedor_nombre})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Dirección de Domicilio</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej: Av. Juárez #123, Guadalajara"
                    className="w-full p-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Latitud</label>
                  <input
                    type="number"
                    step="any"
                    value={latitud}
                    onChange={(e) => setLatitud(e.target.value)}
                    placeholder="Ej: 20.6736"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Longitud</label>
                  <input
                    type="number"
                    step="any"
                    value={longitud}
                    onChange={(e) => setLongitud(e.target.value)}
                    placeholder="Ej: -103.344"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                  />
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
                  <Save size={16} /> Guardar Pasajero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CREDENTIAL MODAL */}
      {activePassengerForQR && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white">
          <div className="bg-slate-50 rounded-2xl max-w-sm w-full shadow-2xl p-6 relative border border-slate-200 animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-none print:w-full">
            <button 
              onClick={() => setActivePassengerForQR(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 print:hidden"
            >
              <X size={20} />
            </button>

            {/* Credential Ticket Layout */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden flex flex-col items-center p-6 space-y-4">
              <div className="w-full text-center border-b border-dashed border-slate-200 pb-4">
                <span className="text-xs font-black tracking-widest text-blue-600 uppercase">
                  Credencial de Abordaje
                </span>
                <h4 className="text-lg font-black text-slate-900 mt-1">PRO MOBILE</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Transporte Corporativo
                </p>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activePassengerForQR.identificador_tarjeta)}`}
                  alt="QR Code"
                  className="w-48 h-48 block"
                />
              </div>

              {/* Passenger Info */}
              <div className="w-full space-y-2 text-center">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pasajero</p>
                  <p className="font-extrabold text-slate-800 text-base">{activePassengerForQR.nombre}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Correo</p>
                  <p className="font-semibold text-slate-600 text-xs truncate max-w-[250px] mx-auto">{activePassengerForQR.email}</p>
                </div>
                <div className="pt-2 border-t border-dashed border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Identificador QR/RFID</p>
                  <p className="font-mono text-slate-800 font-bold text-sm tracking-wider">{activePassengerForQR.identificador_tarjeta}</p>
                </div>
              </div>

              {/* Barcode-like visual decorations */}
              <div className="w-full flex flex-col items-center pt-2">
                <div className="h-6 w-full flex items-center justify-center gap-0.5 overflow-hidden opacity-60">
                  {[...Array(30)].map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-slate-800 h-full" 
                      style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1.5 : 2)}px` }} 
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Print button */}
            <div className="mt-4 flex gap-3 print:hidden">
              <button
                onClick={() => setActivePassengerForQR(null)}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all"
              >
                Cerrar
              </button>
              <button
                onClick={handlePrintCard}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1"
              >
                <Printer size={14} /> Imprimir / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
