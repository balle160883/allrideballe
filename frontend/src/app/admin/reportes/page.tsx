"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Bus, 
  Route, 
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Clock,
  ShieldCheck,
  Building2,
  AlertCircle,
  Percent,
  CheckCircle,
  Timer
} from "lucide-react";
import { 
  fetchReporteKPIs, 
  fetchEficienciaRutas, 
  fetchAuditoriaAsistencia,
  fetchAuditoriaSLA,
  fetchRutas
} from "@/lib/api";
import * as XLSX from "xlsx";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const SLA_COLORS = {
  aTiempo: "#10b981",    // emerald-500
  retrasadas: "#ef4444", // red-500
  adelantadas: "#3b82f6",// blue-500
};

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<"asistencia" | "puntualidad" | "proveedores">("asistencia");
  const [kpis, setKpis] = useState<any>(null);
  const [eficiencia, setEficiencia] = useState<any[]>([]);
  const [asistencia, setAsistencia] = useState<any[]>([]);
  const [auditoriaSLA, setAuditoriaSLA] = useState<any>(null);
  const [rutas, setRutas] = useState<any[]>([]);
  
  // Filtros
  const [selectedRutaId, setSelectedRutaId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [slaFilter, setSlaFilter] = useState<"todos" | "atiempo" | "retraso" | "adelanto">("todos");
  
  // Estados de carga
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Validación de permisos
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
      const [kpisData, efData, rutData, slaData] = await Promise.all([
        fetchReporteKPIs(),
        fetchEficienciaRutas(),
        fetchRutas(),
        fetchAuditoriaSLA().catch(() => null)
      ]);
      setKpis(kpisData);
      setEficiencia(efData || []);
      setRutas(rutData || []);
      setAuditoriaSLA(slaData);

      const astData = await fetchAuditoriaAsistencia({});
      setAsistencia(astData || []);
    } catch (error) {
      console.error("Error cargando analíticas:", error);
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
      setAsistencia(astData || []);
    } catch (e) {
      console.error("Error aplicando filtros:", e);
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
      setAsistencia(astData || []);
    } catch (e) {
      console.error("Error limpiando filtros:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // Filtrado de Asistencia
  const filteredAsistencia = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return asistencia.filter(item => {
      return (
        !term ||
        item.pasajero_nombre?.toLowerCase().includes(term) ||
        item.pasajero_email?.toLowerCase().includes(term) ||
        item.ruta_nombre?.toLowerCase().includes(term) ||
        item.conductor_nombre?.toLowerCase().includes(term)
      );
    });
  }, [asistencia, searchTerm]);

  // Filtrado de Paradas SLA
  const paradasDetalles = auditoriaSLA?.detalles || [];
  const filteredParadas = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return paradasDetalles.filter((p: any) => {
      const matchSearch = !term ||
        p.paradaNombre?.toLowerCase().includes(term) ||
        p.rutaNombre?.toLowerCase().includes(term) ||
        p.conductorNombre?.toLowerCase().includes(term) ||
        p.vehiculoPatente?.toLowerCase().includes(term);

      const matchSLA = 
        slaFilter === 'todos' ? true :
        slaFilter === 'atiempo' ? p.estado === 'A tiempo' :
        slaFilter === 'retraso' ? p.estado === 'Retrasado' :
        p.estado === 'Adelantado';

      return matchSearch && matchSLA;
    });
  }, [paradasDetalles, searchTerm, slaFilter]);

  // Datos para gráfica de pastel Donut SLA
  const pieChartData = useMemo(() => {
    if (!auditoriaSLA?.kpis) return [];
    const { paradasATiempo, paradasRetrasadas, paradasAdelantadas } = auditoriaSLA.kpis;
    return [
      { name: "A tiempo", value: paradasATiempo || 0, color: SLA_COLORS.aTiempo },
      { name: "Retrasadas (>10m)", value: paradasRetrasadas || 0, color: SLA_COLORS.retrasadas },
      { name: "Adelantadas (<-10m)", value: paradasAdelantadas || 0, color: SLA_COLORS.adelantadas },
    ].filter(item => item.value > 0);
  }, [auditoriaSLA]);

  // Exportación Avanzada a Excel Multi-hoja (4 hojas)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen Ejecutivo y KPIs
    const summaryData = [
      ["PRO MOBILE - REPORTE EJECUTIVO DE OPERACIONES, ASISTENCIA Y PUNTUALIDAD"],
      [`Fecha de Generación: ${new Date().toLocaleString('es-MX')}`],
      [""],
      ["MÉTRICAS DE ASISTENCIA Y FLOTA", "VALOR"],
      ["Promedio de Ocupación de Flota", `${kpis?.promedioOcupacion || 0}%`],
      ["Tasa General de Asistencia", `${kpis?.tasaAsistencia || 100}%`],
      ["Total de No-Shows (Faltas)", kpis?.noShows || 0],
      ["Pasajeros Únicos Registrados", kpis?.pasajerosUnicos || 0],
      ["Total de Abordajes Registrados", filteredAsistencia.length],
      [""],
      ["MÉTRICAS DE PUNTUALIDAD Y SLA DE PARADAS", "VALOR"],
      ["Cumplimiento General de SLA", `${auditoriaSLA?.kpis?.porcentajeSLA || 100}%`],
      ["Total de Paradas Auditadas", auditoriaSLA?.kpis?.totalParadas || 0],
      ["Paradas A Tiempo (±10 min)", auditoriaSLA?.kpis?.paradasATiempo || 0],
      ["Paradas con Retraso (>10 min)", auditoriaSLA?.kpis?.paradasRetrasadas || 0],
      ["Paradas Adelantadas (<-10 min)", auditoriaSLA?.kpis?.paradasAdelantadas || 0],
      ["Desviación Promedio en Paradas", `±${auditoriaSLA?.kpis?.desviacionPromedioMinutos || 0} min`]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Ejecutivo");

    // Hoja 2: Cumplimiento de Paradas (SLA)
    if (paradasDetalles.length > 0) {
      const paradasRows = paradasDetalles.map((p: any) => ({
        "Viaje #": p.viajeId,
        "Ruta": p.rutaNombre,
        "Parada": p.paradaNombre,
        "Orden": p.orden,
        "Conductor": p.conductorNombre,
        "Vehículo": p.vehiculoPatente,
        "Llegada Programada": new Date(p.programado).toLocaleString('es-MX'),
        "Llegada Real": new Date(p.real).toLocaleString('es-MX'),
        "Desviación (minutos)": p.desviacion > 0 ? `+${p.desviacion}` : `${p.desviacion}`,
        "Estado Puntualidad": p.estado,
        "Cumple SLA (±10m)": p.cumpleSLA ? "SÍ" : "NO"
      }));
      const wsParadas = XLSX.utils.json_to_sheet(paradasRows);
      XLSX.utils.book_append_sheet(wb, wsParadas, "Cumplimiento Paradas SLA");
    }

    // Hoja 3: Bitácora de Asistencia
    if (filteredAsistencia.length > 0) {
      const tableData = filteredAsistencia.map(item => ({
        "ID Reserva": item.reserva_id,
        "Pasajero": item.pasajero_nombre || "Pasajero",
        "Correo Electrónico": item.pasajero_email || "N/A",
        "Ruta": item.ruta_nombre || "Sin Nombre",
        "Fecha y Hora": new Date(item.fecha_hora_salida).toLocaleString('es-MX'),
        "Conductor": item.conductor_nombre || "Sin Conductor",
        "Vehículo / Placa": item.vehiculo_patente || "S/D",
        "Asiento": item.asiento_numero ? `#${item.asiento_numero}` : "Sin Asignar",
        "Estado": item.reserva_estado === 'confirmado' ? "Abordó" : "No-Show (Faltó)"
      }));
      const wsTable = XLSX.utils.json_to_sheet(tableData);
      XLSX.utils.book_append_sheet(wb, wsTable, "Bitácora de Asistencia");
    }

    // Hoja 4: Ocupación por Ruta
    if (eficiencia.length > 0) {
      const efData = eficiencia.map(r => ({
        "Ruta": r.ruta_nombre,
        "Viajes Finalizados": r.viajes_count,
        "Promedio Ocupación (%)": `${r.promedio_ocupacion}%`
      }));
      const wsEf = XLSX.utils.json_to_sheet(efData);
      XLSX.utils.book_append_sheet(wb, wsEf, "Ocupación por Ruta");
    }

    const fileName = `ProMobile_Auditoria_Integral_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Exportación Ejecutiva a PDF Imprimible (A4)
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fechaGen = new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
    const totalSla = auditoriaSLA?.kpis?.porcentajeSLA || 100;
    const devMin = auditoriaSLA?.kpis?.desviacionPromedioMinutos || 0;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Reporte Ejecutivo Integral - Pro Mobile</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 10px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 16px; }
          .logo-text { font-size: 20px; font-weight: 900; color: #2563eb; letter-spacing: -0.5px; }
          .title { text-align: right; }
          .title h1 { margin: 0; font-size: 16px; color: #0f172a; text-transform: uppercase; }
          .title p { margin: 2px 0 0 0; color: #64748b; font-size: 9px; font-weight: bold; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center; }
          .kpi-card .val { font-size: 16px; font-weight: 800; color: #2563eb; margin-top: 2px; }
          .kpi-card .lbl { font-size: 8px; color: #64748b; text-transform: uppercase; font-weight: bold; }
          section { margin-bottom: 16px; page-break-inside: avoid; }
          section h2 { font-size: 11px; text-transform: uppercase; color: #0f172a; border-left: 3px solid #2563eb; padding-left: 6px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th { background: #f1f5f9; color: #475569; text-align: left; padding: 5px 6px; font-size: 8px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
          td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9px; }
          tr:nth-child(even) { background: #f8fafc; }
          .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 8px; font-weight: bold; text-transform: uppercase; }
          .badge-ok { background: #dcfce7; color: #15803d; }
          .badge-late { background: #fee2e2; color: #b91c1c; }
          .badge-early { background: #dbeafe; color: #1d4ed8; }
          .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; font-size: 8px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-text">PRO MOBILE <span style="font-size:11px;color:#64748b;font-weight:600;">| AllRide Engine</span></div>
          <div class="title">
            <h1>Auditoría Operativa & SLA</h1>
            <p>${fechaGen}</p>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card"><div class="lbl">Cumplimiento SLA</div><div class="val">${totalSla}%</div></div>
          <div class="kpi-card"><div class="lbl">Desviación Promedio</div><div class="val">±${devMin} min</div></div>
          <div class="kpi-card"><div class="lbl">Ocupación de Flota</div><div class="val">${kpis?.promedioOcupacion || 0}%</div></div>
          <div class="kpi-card"><div class="lbl">Tasa de Asistencia</div><div class="val">${kpis?.tasaAsistencia || 100}%</div></div>
        </div>

        <section>
          <h2>Cumplimiento de Paradas y Tiempos de Llegada (Últimos Registros)</h2>
          <table>
            <thead>
              <tr>
                <th>Ruta</th>
                <th>Parada</th>
                <th>Chofer / Unidad</th>
                <th>Programado</th>
                <th>Llegada Real</th>
                <th>Desvío</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${paradasDetalles.slice(0, 20).map((p: any) => `
                <tr>
                  <td><strong>${p.rutaNombre}</strong></td>
                  <td>${p.paradaNombre}</td>
                  <td>${p.conductorNombre} (${p.vehiculoPatente})</td>
                  <td>${new Date(p.programado).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>${new Date(p.real).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td><strong>${p.desviacion > 0 ? `+${p.desviacion}` : `${p.desviacion}`} min</strong></td>
                  <td>
                    ${p.estado === 'A tiempo' ? '<span class="badge badge-ok">A Tiempo</span>' :
                      p.estado === 'Retrasado' ? '<span class="badge badge-late">Retraso</span>' :
                      '<span class="badge badge-early">Adelanto</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Bitácora de Abordajes y Asistencia de Empleados</h2>
          <table>
            <thead>
              <tr>
                <th>Pasajero</th>
                <th>Ruta</th>
                <th>Fecha / Hora Salida</th>
                <th>Conductor</th>
                <th>Asiento</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAsistencia.slice(0, 20).map(item => `
                <tr>
                  <td><strong>${item.pasajero_nombre}</strong></td>
                  <td>${item.ruta_nombre}</td>
                  <td>${new Date(item.fecha_hora_salida).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</td>
                  <td>${item.conductor_nombre || 'S/D'}</td>
                  <td>${item.asiento_numero ? `#${item.asiento_numero}` : '-'}</td>
                  <td>
                    ${item.reserva_estado === 'confirmado' 
                      ? '<span class="badge badge-ok">Abordó</span>' 
                      : '<span class="badge badge-late">No-Show</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>

        <div class="footer">
          Documento confidencial emitido por Pro Mobile Transport · Plataforma Corporativa de Auditoría y SLAs.
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

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
      {/* ── HEADER CON BOTONES DE EXPORTACIÓN ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-blue-600" size={32} />
            Módulo de Reportes, SLA & Auditoría
          </h1>
          <p className="text-slate-500 font-medium text-sm lg:text-base">
            Gráficas interactivas de puntualidad, cumplimiento de paradas por ruta y auditoría de asistencia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <FileText size={15} /> Reporte PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <FileSpreadsheet size={15} /> Exportar Excel
          </button>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>
      </div>

      {/* ── PESTAÑAS ANALÍTICAS ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-2">
        <button
          onClick={() => setActiveTab("asistencia")}
          className={`pb-3 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "asistencia"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Users size={16} />
          Asistencia & Ocupación
        </button>
        <button
          onClick={() => setActiveTab("puntualidad")}
          className={`pb-3 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "puntualidad"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Clock size={16} />
          Puntualidad & Cumplimiento SLA
        </button>
        <button
          onClick={() => setActiveTab("proveedores")}
          className={`pb-3 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "proveedores"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Building2 size={16} />
          Auditoría por Proveedor
        </button>
      </div>

      {/* ── TAB 1: ASISTENCIA & OCUPACIÓN ── */}
      {activeTab === "asistencia" && (
        <div className="space-y-6">
          {/* KPI CARDS ASISTENCIA */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              color="border-emerald-200"
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
            {/* Ocupación por Ruta */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <Route className="text-blue-600" size={18} />
                  <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider">Ocupación por Ruta</h2>
                </div>

                {eficiencia.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-medium text-xs italic bg-slate-50 rounded-xl">
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
              
              <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl text-[10px] text-slate-500 font-semibold leading-relaxed mt-4">
                📌 <strong>Criterio de Auditoría:</strong> Las rutas con ocupación menor a 40% se alertan para aplicar <strong>Smart Routing</strong>.
              </div>
            </div>

            {/* Bitácora de Abordaje Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="text-blue-600" size={18} />
                  <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider">
                    Bitácora de Asistencia ({filteredAsistencia.length})
                  </h2>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar pasajero, chofer..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {filteredAsistencia.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl">
                  No se encontraron registros de asistencia.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[420px] overflow-y-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-600">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                      <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="p-3 pl-4">Pasajero</th>
                        <th className="p-3">Ruta</th>
                        <th className="p-3">Fecha y Hora</th>
                        <th className="p-3">Vehículo / Chofer</th>
                        <th className="p-3">Asiento</th>
                        <th className="p-3 pr-4 text-center">Asistencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {filteredAsistencia.map((item) => (
                        <tr key={item.reserva_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-extrabold text-slate-900">{item.pasajero_nombre}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.pasajero_email}</div>
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
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 text-[9px] font-black uppercase">
                                <CheckCircle2 size={10} className="stroke-[3]" /> Abordó
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-full px-2 py-0.5 text-[9px] font-black uppercase">
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
      )}

      {/* ── TAB 2: PUNTUALIDAD & CUMPLIMIENTO SLA ── */}
      {activeTab === "puntualidad" && (
        <div className="space-y-6">
          {/* KPI CARDS PUNTUALIDAD */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard 
              title="Cumplimiento Global SLA" 
              value={`${auditoriaSLA?.kpis?.porcentajeSLA || 100}%`} 
              desc="Paradas dentro del rango ±10 min" 
              icon={<ShieldCheck className="text-emerald-600" size={20} />} 
              color="border-emerald-200"
              valueColor="text-emerald-600"
            />
            <KPICard 
              title="Paradas a Tiempo" 
              value={`${auditoriaSLA?.kpis?.paradasATiempo || 0}`} 
              desc={`De ${auditoriaSLA?.kpis?.totalParadas || 0} paradas auditadas`} 
              icon={<CheckCircle className="text-blue-600" size={20} />} 
              color="border-blue-200"
              valueColor="text-blue-600"
            />
            <KPICard 
              title="Paradas con Retraso" 
              value={`${auditoriaSLA?.kpis?.paradasRetrasadas || 0}`} 
              desc="Demoras mayores a 10 min" 
              icon={<AlertCircle className="text-rose-500" size={20} />} 
              color="border-rose-200"
              valueColor="text-rose-600"
            />
            <KPICard 
              title="Desviación Promedio" 
              value={`±${auditoriaSLA?.kpis?.desviacionPromedioMinutos || 0}m`} 
              desc="Margen promedio por parada" 
              icon={<Timer className="text-amber-500" size={20} />} 
              color="border-amber-200"
              valueColor="text-amber-600"
            />
          </div>

          {/* GRÁFICAS DE PUNTUALIDAD CON RECHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfica de Barras Apiladas por Ruta */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-blue-600" size={18} />
                  <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider">
                    Cumplimiento de Paradas por Ruta (SLA)
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> A tiempo</span>
                  <span className="flex items-center gap-1 text-rose-600"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Retrasadas</span>
                  <span className="flex items-center gap-1 text-blue-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Adelantadas</span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={auditoriaSLA?.cumplimientoPorRuta || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="rutaNombre" 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      interval={0}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="aTiempo" name="A tiempo" stackId="a" fill={SLA_COLORS.aTiempo} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="retrasadas" name="Retrasadas (>10m)" stackId="a" fill={SLA_COLORS.retrasadas} />
                    <Bar dataKey="adelantadas" name="Adelantadas (<-10m)" stackId="a" fill={SLA_COLORS.adelantadas} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica Donut de SLA Global */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
                  <Percent className="text-blue-600" size={18} />
                  <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider">
                    Distribución de Puntualidad
                  </h2>
                </div>

                <div className="h-56 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px', border: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {auditoriaSLA?.kpis?.porcentajeSLA || 100}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">SLA OK</span>
                  </div>
                </div>

                <div className="space-y-2 mt-1">
                  {pieChartData.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-semibold text-slate-600">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="font-extrabold text-slate-800">{item.value} paradas</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TABLA DE AUDITORÍA DETALLADA DE PARADAS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="text-blue-600" size={18} />
                <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider">
                  Bitácora Cronológica de Paradas ({filteredParadas.length})
                </h2>
              </div>

              {/* Filtro por estado SLA */}
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
                  {(['todos', 'atiempo', 'retraso', 'adelanto'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setSlaFilter(f)}
                      className={`px-2.5 py-1 rounded-lg uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                        slaFilter === f
                          ? "bg-white text-blue-600 shadow-sm font-black"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {f === 'todos' ? 'Todas' : f === 'atiempo' ? 'A tiempo' : f === 'retraso' ? 'Retraso' : 'Adelanto'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredParadas.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic bg-slate-50 rounded-xl">
                No hay paradas que coincidan con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[440px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-600">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                    <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="p-3 pl-4">Ruta / Parada</th>
                      <th className="p-3">Conductor / Unidad</th>
                      <th className="p-3">Hora Programada</th>
                      <th className="p-3">Hora Real Llegada</th>
                      <th className="p-3 text-center">Desviación</th>
                      <th className="p-3 pr-4 text-center">Estado SLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {filteredParadas.map((p: any) => (
                      <tr key={p.tiempoParadaId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 pl-4">
                          <div className="font-extrabold text-slate-900">{p.paradaNombre}</div>
                          <div className="text-[10px] text-blue-600 font-bold mt-0.5">{p.rutaNombre} · Parada #{p.orden}</div>
                        </td>
                        <td className="p-3 text-[11px] text-slate-600">
                          <div className="font-bold text-slate-800">{p.conductorNombre}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Bus size={10} /> {p.vehiculoPatente}
                          </div>
                        </td>
                        <td className="p-3 text-[11px] font-mono text-slate-500">
                          {new Date(p.programado).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 text-[11px] font-mono text-slate-700 font-extrabold">
                          {new Date(p.real).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            p.desviacion > 10 ? 'bg-red-50 text-red-600' :
                            p.desviacion < -10 ? 'bg-blue-50 text-blue-600' :
                            'bg-emerald-50 text-emerald-600'
                          }`}>
                            {p.desviacion > 0 ? `+${p.desviacion}` : `${p.desviacion}`} min
                          </span>
                        </td>
                        <td className="p-3 pr-4 text-center">
                          {p.estado === 'A tiempo' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase">
                              <CheckCircle2 size={10} className="stroke-[3]" /> A Tiempo
                            </span>
                          ) : p.estado === 'Retrasado' ? (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase">
                              <XCircle size={10} className="stroke-[3]" /> Retraso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase">
                              <Clock size={10} className="stroke-[3]" /> Adelanto
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
      )}

      {/* ── TAB 3: AUDITORÍA POR PROVEEDOR ── */}
      {activeTab === "proveedores" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="text-blue-600" size={18} />
            <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider">
              Desempeño Operativo de Proveedores de Transporte
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(auditoriaSLA?.proveedores || []).map((prov: any, idx: number) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900 truncate">{prov.proveedorNombre}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    prov.porcentajeSLA >= 90 ? 'bg-emerald-100 text-emerald-800' :
                    prov.porcentajeSLA >= 75 ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {prov.porcentajeSLA}% SLA
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Paradas A Tiempo</span>
                    <span className="text-base font-extrabold text-emerald-600 block mt-0.5">
                      {prov.visitasATiempo} / {prov.totalVisitas}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Desvío Promedio</span>
                    <span className="text-base font-extrabold text-slate-800 block mt-0.5">
                      ±{prov.desviacionPromedioMinutos} min
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      prov.porcentajeSLA >= 90 ? 'bg-emerald-500' :
                      prov.porcentajeSLA >= 75 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${prov.porcentajeSLA}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Componente de Tarjeta KPI
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
