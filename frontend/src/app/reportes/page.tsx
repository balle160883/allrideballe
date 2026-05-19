"use client";

import { useEffect, useState } from "react";
import { BarChart3, Download, TrendingUp, PieChart, FileText, Loader2, Bus, ShieldAlert, Timer } from "lucide-react";
import { fetchAsignaciones, fetchRecuperacion, fetchInteracciones, fetchAllGestores } from "@/lib/api";

export default function ReportesPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [gestores, setGestores] = useState<any[]>([]);
  const [selectedGestor, setSelectedGestor] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Datos reales
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [recuperacion, setRecuperacion] = useState<any[]>([]);
  const [interacciones, setInteracciones] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        setUser(parsed);
        setIsAdmin(parsed.rol === 'admin');
      } catch (e) {
        console.error("Error parsing user info:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAllGestores().then(setGestores).catch(console.error);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isMounted || !user) return;

    async function loadBI() {
      setLoading(true);
      try {
        const effectiveGestor = isAdmin ? selectedGestor : user.gestor;
        const [asig, recu, inte] = await Promise.all([
          fetchAsignaciones(200, effectiveGestor),
          fetchRecuperacion(effectiveGestor),
          fetchInteracciones(effectiveGestor)
        ]);
        setAsignaciones(asig);
        setRecuperacion(recu);
        setInteracciones(inte);
      } catch (error) {
        console.error("Error loading BI data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadBI();
  }, [isMounted, user, selectedGestor, isAdmin]);

  if (!isMounted) return null;
  if (!user) return <div className="p-10 text-center font-bold text-slate-400">Cargando perfil...</div>;

  const safeAsignaciones = Array.isArray(asignaciones) ? asignaciones : [];
  const safeRecuperacion = Array.isArray(recuperacion) ? recuperacion : [];
  const safeInteracciones = Array.isArray(interacciones) ? interacciones : [];
  
  const totalViajes = safeAsignaciones.length || 1;
  const dist = {
    puntual: (safeAsignaciones.filter(a => a['SITUACIÓN DEL CRÉDITO'] === 'VISITADO').length / totalViajes) * 100,
    demoraLeve: 0,
    demoraModerada: 0,
    pendiente: (safeAsignaciones.filter(a => a['SITUACIÓN DEL CRÉDITO'] !== 'VISITADO').length / totalViajes) * 100
  };

  const gestoresStats = isAdmin && Array.isArray(gestores) ? gestores.map(g => {
    const counts = safeRecuperacion.filter(r => r.gestor === g.gestor_name).length;
    const efec = Math.min(Math.round((counts / 10) * 100), 100); 
    return { name: g.gestor_name, efec, color: 'bg-blue-500' };
  }).filter(g => g.efec > 0).slice(0, 4) : [
    { name: user.nombre || 'Conductor', efec: 100, color: 'bg-blue-600' }
  ];

  const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
  const weeklyRecup = [0, 0, 0, 0, 0, 0, 0];
  safeRecuperacion.forEach(r => {
    const date = new Date(r.fecha_real || Date.now());
    weeklyRecup[date.getDay()] += 1; // Contador de abordajes por día
  });
  const maxRecup = Math.max(...weeklyRecup) || 1;
  const barHeights = weeklyRecup.map(v => (v / maxRecup) * 90 + 10);

  try {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cumplimiento y Analíticas</h1>
            <p className="text-slate-500 text-sm">Análisis del cumplimiento de proveedores, ocupación de flota y puntualidad.</p>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm mr-2">
                <span className="text-xs font-bold text-slate-400 uppercase ml-2">Filtrar:</span>
                <select 
                  value={selectedGestor}
                  onChange={(e) => setSelectedGestor(e.target.value)}
                  className="text-sm font-bold text-slate-700 focus:outline-none bg-transparent cursor-pointer"
                >
                  <option value="">Todo el Sistema</option>
                  {gestores.map(g => (
                    <option key={g.gestor_id} value={g.gestor_name}>{g.gestor_name}</option>
                  ))}
                </select>
              </div>
            )}
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold border border-slate-200 hover:bg-slate-200 transition-colors">
              <Download size={18} />
              Exportar Métricas
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center card">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
            <p className="text-slate-500 font-bold">Procesando analíticas de transporte...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800">Abordajes Semanales</h3>
                  <BarChart3 className="text-blue-600" size={20} />
                </div>
                <div className="h-48 bg-slate-50 rounded-lg flex items-end justify-between p-4 gap-2">
                  {barHeights.map((h, i) => (
                    <div key={i} className="w-full bg-blue-200 rounded-t-sm hover:bg-blue-600 transition-colors relative group" style={{ height: `${h}%` }}>
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                         {weeklyRecup[i]} check-ins
                       </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-bold uppercase">
                   {days.map(d => <span key={d}>{d}</span>)}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800">Alertas de Incidencias</h3>
                  <PieChart className="text-emerald-600" size={20} />
                </div>
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-medium text-slate-600">Desvío de Ruta</span>
                     <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                       {safeInteracciones.filter(i => i.resultado === 'otro').length}
                     </span>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-medium text-slate-600">Atraso Proyectado</span>
                     <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                       {safeInteracciones.filter(i => i.resultado === 'reclamacion').length}
                     </span>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-medium text-slate-600">No Abordó / Faltas</span>
                     <span className="text-xs font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                       {safeInteracciones.filter(i => i.resultado === 'no_encontrado').length}
                     </span>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-medium text-slate-600">Reservas QR Físico</span>
                     <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                       {safeInteracciones.filter(i => i.resultado === 'promesa_pago').length}
                     </span>
                   </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800">Puntualidad Conductor</h3>
                  <PieChart className="text-blue-600" size={20} />
                </div>
                <div className="space-y-4">
                   {gestoresStats.map((g, i) => (
                     <div key={i} className="space-y-1">
                       <div className="flex justify-between text-xs font-medium">
                         <span>{g.name}</span>
                         <span className="text-slate-500">{g.efec}%</span>
                       </div>
                       <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                         <div className={`${g.color} h-full`} style={{ width: `${g.efec}%` }}></div>
                       </div>
                     </div>
                   ))}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800">Distribución de Cumplimiento</h3>
                  <TrendingUp className="text-blue-600" size={20} />
                </div>
                <div className="space-y-3">
                   <div className="flex items-center gap-3">
                     <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                     <div className="flex-1 text-[11px] text-slate-600 font-medium">Completados</div>
                     <div className="text-xs font-bold text-slate-900">{dist.puntual.toFixed(1)}%</div>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                     <div className="flex-1 text-[11px] text-slate-600 font-medium">Programados</div>
                     <div className="text-xs font-bold text-slate-900">{dist.pendiente.toFixed(1)}%</div>
                   </div>
                </div>
                <div className="mt-4 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
                   <div className="text-blue-600 bg-white p-1 rounded shadow-sm font-bold text-[9px]">AI</div>
                   <p className="text-[9px] text-blue-800 leading-tight">
                     Flota operando al {(dist.puntual).toFixed(0)}% de cumplimiento programado hoy.
                   </p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-slate-800 mb-4">Check-ins de Pasajeros Recientes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {safeInteracciones.length > 0 ? safeInteracciones.slice(0, 4).map((inte, i) => (
                   <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                         <FileText size={18} className="text-slate-400 group-hover:text-blue-600" />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-sm font-bold text-slate-700">{inte.descripcion || 'Abordaje registrado'}</span>
                         <span className="text-[10px] text-slate-400 uppercase font-bold">{inte.resultado} • {new Date(inte.fecha_gestion).toLocaleDateString()}</span>
                       </div>
                     </div>
                     <div className="text-[10px] font-black text-slate-300 group-hover:text-blue-600">ID: #{inte.id}</div>
                   </div>
                 )) : (
                   <div className="col-span-2 text-center py-10 text-slate-400 text-xs italic">No hay abordajes registrados recientemente.</div>
                 )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  } catch (err: any) {
    return <div className="p-10 card bg-red-50 text-red-700 font-bold">Error en Reportes: {err.message}</div>;
  }
}
