"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  Download, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Bus, 
  Route, 
  Loader2,
  RefreshCw
} from "lucide-react";
import { 
  fetchReporteKPIs, 
  fetchEficienciaRutas, 
  fetchAuditoriaAsistencia,
  fetchRutas
} from "@/lib/api";

export default function ReportesPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [eficiencia, setEficiencia] = useState<any[]>([]);
  const [asistencia, setAsistencia] = useState<any[]>([]);
  const [rutas, setRutas] = useState<any[]>([]);
  
  // Filters
  const [selectedRutaId, setSelectedRutaId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Loading & statuses
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Role validation: admin or gerente
  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        const role = user.rol?.toLowerCase();
        const allowed = 
          role === 'admin' || 
          role === 'admin_cliente' || 
          role === 'admin_proveedor' || 
          role === 'superadmin' || 
          role === 'gerente' ||
          user.email === 'ing.ballesteros16@gmail.com';
          
        if (!allowed) {
          router.push('/');
        }
      } catch (e) {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const loadData = async () => {
    try {
      const [kpisData, efData, rutData] = await Promise.all([
        fetchReporteKPIs(),
        fetchEficienciaRutas(),
        fetchRutas()
      ]);
      setKpis(kpisData);
      setEficiencia(efData);
      setRutas(rutData);

      // Load attendance with default empty filters
      const astData = await fetchAuditoriaAsistencia({});
      setAsistencia(astData);
    } catch (error) {
      console.error("Error loading analytics data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyFilters = async () => {
    setRefreshing(true);
    try {
      const astData = await fetchAuditoriaAsistencia({
        rutaId: selectedRutaId ? Number(selectedRutaId) : undefined,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined
      });
      setAsistencia(astData);
    } catch (e) {
      console.error("Error applying filters:", e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearFilters = async () => {
    setSelectedRutaId("");
    setFechaInicio("");
    setFechaFin("");
    setRefreshing(true);
    try {
      const astData = await fetchAuditoriaAsistencia({});
      setAsistencia(astData);
    } catch (e) {
      console.error("Error clearing filters:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // Local text search filter
  const filteredAsistencia = asistencia.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.pasajero_nombre?.toLowerCase().includes(term) ||
      item.pasajero_email?.toLowerCase().includes(term) ||
      item.ruta_nombre?.toLowerCase().includes(term) ||
      item.conductor_nombre?.toLowerCase().includes(term)
    );
  });

  const handleExportCSV = () => {
    if (filteredAsistencia.length === 0) return;
    
    // CSV headers
    const headers = [
      "ID Reserva",
      "Pasajero",
      "Correo",
      "Ruta",
      "Fecha/Hora Viaje",
      "Conductor",
      "Placas/Vehículo",
      "Asiento",
      "Estado de Asistencia"
    ];

    // CSV rows
    const rows = filteredAsistencia.map(item => [
      item.reserva_id,
      `"${item.pasajero_nombre}"`,
      item.pasajero_email,
      `"${item.ruta_nombre}"`,
      new Date(item.fecha_hora_salida).toLocaleString('es-MX'),
      item.conductor_nombre ? `"${item.conductor_nombre}"` : "S/D",
      item.vehiculo_patente || "S/D",
      item.asiento_numero || "N/A",
      item.reserva_estado === 'confirmado' ? "Abordó" : "No-Show (Faltó)"
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `auditoria_asistencia_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Color helper for route occupancy progress bars
  const getOccupancyColor = (pct: number) => {
    if (pct < 40) return { bar: "bg-red-500", text: "text-red-600", bg: "bg-red-50", desc: "Baja Ocupación" };
    if (pct < 70) return { bar: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50", desc: "Eficiencia Media" };
    return { bar: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", desc: "Eficiencia Óptima" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 min-h-screen">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-blue-600" size={32} />
            KPIs & Reportes de Eficiencia
          </h1>
          <p className="text-slate-500 font-medium text-sm lg:text-base">
            Audita el porcentaje de ocupación, controle el absentismo de pasajeros (No-Shows) y exporte bitácoras.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="self-start sm:self-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard 
          title="Ocupación de Flota" 
          value={`${kpis?.promedioOcupacion || 0}%`} 
          desc="Promedio de asientos ocupados" 
          icon={<Bus className="text-blue-600" size={20} />} 
          color="border-blue-200"
          valueColor="text-blue-600"
        />
        <KPICard 
          title="Tasa de Asistencia" 
          value={`${kpis?.tasaAsistencia || 100}%`} 
          desc="Abordajes sobre reservas realizadas" 
          icon={<TrendingUp className="text-emerald-600" size={20} />} 
          color="border-emerald-250"
          valueColor="text-emerald-600"
        />
        <KPICard 
          title="No-Shows / Faltas" 
          value={kpis?.noShows || 0} 
          desc="Reservaron pero no abordaron" 
          icon={<AlertTriangle className="text-rose-500" size={20} />} 
          color="border-rose-200"
          valueColor="text-rose-600"
        />
        <KPICard 
          title="Pasajeros Únicos" 
          value={kpis?.pasajerosUnicos || 0} 
          desc="Empleados transportados" 
          icon={<Users className="text-indigo-600" size={20} />} 
          color="border-indigo-200"
          valueColor="text-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO / LISTA DE EFICIENCIA POR RUTA */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Route className="text-blue-600 animate-pulse" size={18} />
              <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider">Ocupación por Ruta</h2>
            </div>

            {eficiencia.length === 0 ? (
              <div className="text-center py-10 text-slate-450 font-medium text-xs italic bg-slate-50 rounded-xl">
                No hay viajes finalizados registrados para evaluar eficiencia.
              </div>
            ) : (
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {eficiencia.map((r) => {
                  const colors = getOccupancyColor(r.promedio_ocupacion);
                  return (
                    <div key={r.ruta_id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                        <span className="truncate max-w-[170px]" title={r.ruta_nombre}>{r.ruta_nombre}</span>
                        <span className={colors.text}>{r.promedio_ocupacion}% Ocupación</span>
                      </div>
                      
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`${colors.bar} h-full rounded-full transition-all duration-500`} 
                          style={{ width: `${r.promedio_ocupacion}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <span>{r.viajes_count} viajes finalizados</span>
                        <span className={`px-1.5 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>{colors.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl text-[10px] text-slate-550 font-semibold leading-relaxed mt-4">
            📌 <strong>Criterio de Auditoría:</strong> Las rutas con ocupación inferior al 40% se marcan en rojo para alertar a los planificadores de transporte de la necesidad de aplicar <strong>Smart Routing</strong>.
          </div>
        </div>

        {/* TABLA DE AUDITORÍA Y CONTROL DE ASISTENCIA */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-blue-600" size={18} />
              <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider">Bitácora de Abordaje & Asistencia</h2>
            </div>
            
            {filteredAsistencia.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow shadow-emerald-500/10 transition-all self-start sm:self-center"
              >
                <Download size={14} /> Exportar CSV
              </button>
            )}
          </div>

          {/* FILTROS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Ruta</label>
              <select
                value={selectedRutaId}
                onChange={(e) => setSelectedRutaId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="">Todas las rutas</option>
                {rutas.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end border-b border-slate-50 pb-2">
            <button
              onClick={handleClearFilters}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-lg text-[10px] uppercase transition-all"
            >
              Limpiar
            </button>
            <button
              onClick={handleApplyFilters}
              disabled={refreshing}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] uppercase flex items-center gap-1 transition-all"
            >
              {refreshing && <Loader2 className="animate-spin" size={10} />}
              Aplicar Filtros
            </button>
          </div>

          {/* BUSCADOR LOCAL */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por pasajero, correo o conductor..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-semibold text-slate-700"
            />
          </div>

          {/* DETALLES DE ASISTENCIA TABLE */}
          {filteredAsistencia.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-slate-150">
              No se encontraron registros de asistencia que coincidan.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-xs text-slate-600">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="p-3 pl-4">Pasajero</th>
                    <th className="p-3">Ruta</th>
                    <th className="p-3">Fecha y Hora</th>
                    <th className="p-3">Vehículo / Chofer</th>
                    <th className="p-3">Asiento</th>
                    <th className="p-3 pr-4 text-center">Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-semibold text-slate-700">
                  {filteredAsistencia.map((item) => (
                    <tr key={item.reserva_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="font-extrabold text-slate-900">{item.pasajero_nombre}</div>
                        <div className="text-[10px] text-slate-450 font-mono mt-0.5">{item.pasajero_email}</div>
                      </td>
                      <td className="p-3 text-[11px] font-bold text-slate-800">{item.ruta_nombre}</td>
                      <td className="p-3 text-[11px] text-slate-500 font-mono">
                        {new Date(item.fecha_hora_salida).toLocaleString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3 text-[10px] text-slate-500">
                        <div className="font-extrabold text-slate-800">{item.conductor_nombre || "S/D"}</div>
                        {item.vehiculo_patente && (
                          <div className="flex items-center gap-0.5 text-slate-400 mt-0.5"><Bus size={10} /> {item.vehiculo_patente}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-center text-slate-800">
                        {item.asiento_numero ? `#${item.asiento_numero}` : '-'}
                      </td>
                      <td className="p-3 pr-4 text-center">
                        {item.reserva_estado === 'confirmado' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                            <CheckCircle2 size={10} className="stroke-[3]" /> Abordó
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-150 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                            <XCircle size={10} className="stroke-[3]" /> No-Show
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Mini KPI card component
// ─────────────────────────────────────────────
interface KPICardProps {
  title: string;
  value: string | number;
  desc: string;
  icon: React.ReactNode;
  color: string;
  valueColor: string;
}

function KPICard({ title, value, desc, icon, color, valueColor }: KPICardProps) {
  return (
    <div className={`bg-white rounded-2xl border-2 ${color} p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
        <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl group-hover:bg-slate-100 transition-colors">{icon}</div>
      </div>
      <div>
        <span className={`text-3xl font-extrabold ${valueColor} tracking-tight block mb-0.5`}>{value}</span>
        <span className="text-[10px] font-semibold text-slate-400">{desc}</span>
      </div>
    </div>
  );
}
