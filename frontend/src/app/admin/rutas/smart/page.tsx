"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Route as RouteIcon, 
  Play, 
  MapPin, 
  Users, 
  Bus, 
  Loader2, 
  CheckCircle, 
  Sliders, 
  Navigation,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { 
  simularSmartRutas, 
  aplicarSmartRutas,
  fetchConductores,
  fetchPasajeros
} from "@/lib/api";

export default function SmartRoutingPage() {
  const [pasajeros, setPasajeros] = useState<any[]>([]);
  const [conductores, setConductores] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  
  // Algoritmo params
  const [maxDistancia, setMaxDistancia] = useState(2.5);
  const [maxCapacidad, setMaxCapacidad] = useState(15);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [simulatedRoutes, setSimulatedRoutes] = useState<any[]>([]);
  const [applying, setApplying] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Leaflet states
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const mapContainerId = "smart-routing-map";
  const router = useRouter();

  // Load baseline passengers and drivers on start, and check admin role
  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
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

    async function loadData() {
      try {
        const [pData, cData] = await Promise.all([
          fetchPasajeros(),
          fetchConductores()
        ]);
        setPasajeros(pData.filter(p => p.latitud !== null));
        setConductores(cData);
        
        // Cargar vehículos desde el catálogo de la API
        const token = localStorage.getItem('auth_token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const vRes = await fetch(`${apiUrl}/transporte/vehiculos`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (vRes.ok) {
          const vData = await vRes.json();
          setVehiculos(vData);
        }
      } catch (err) {
        console.error("Error loading baseline data:", err);
      }
    }
    loadData();
  }, []);

  // Dynamically load Leaflet assets
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerId).setView([20.753, -103.415], 12); // Centro en planta
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Planta central marker
      L.marker([20.753, -103.415], {
        icon: L.divIcon({
          html: `<div class="bg-red-600 text-white p-2 rounded-full font-black border-2 border-white shadow text-[10px] flex items-center justify-center w-8 h-8">HQ</div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })
      }).addTo(map).bindPopup("<b>HQ: Planta Industrial Norte</b>");

      mapRef.current = map;
      markersGroupRef.current = L.featureGroup().addTo(map);
    }
  }, [leafletLoaded]);

  // Update map layer when simulation results change
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || !markersGroupRef.current) return;
    const L = (window as any).L;
    
    // Clear previous simulation markers/polylines
    markersGroupRef.current.clearLayers();

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];

    simulatedRoutes.forEach((route, rIdx) => {
      const color = colors[rIdx % colors.length];

      // Draw paradas
      route.paradas.forEach((p: any) => {
        const marker = L.circleMarker([p.latitud, p.longitud], {
          radius: 8,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          fillOpacity: 0.9
        }).addTo(markersGroupRef.current);

        marker.bindPopup(`
          <div class="p-1 font-sans">
            <h4 class="font-extrabold text-slate-800 text-xs">${p.nombre}</h4>
            <p class="text-[10px] text-slate-500 font-semibold mb-1">Orden de escala: #${p.orden}</p>
            <p class="text-[10px] font-bold text-slate-600">Pasajeros asignados (${p.pasajeros.length}):</p>
            <ul class="text-[9px] list-disc pl-4 text-slate-700">
              ${p.pasajeros.map((px: any) => `<li>${px.nombre}</li>`).join('')}
            </ul>
          </div>
        `);
      });

      // Draw passenger home locations (small dots)
      route.pasajeros.forEach((px: any) => {
        L.circleMarker([px.latitud, px.longitud], {
          radius: 4,
          fillColor: '#64748b',
          color: '#ffffff',
          weight: 1,
          fillOpacity: 0.8
        }).addTo(markersGroupRef.current)
          .bindPopup(`<b class="text-xs font-sans text-slate-800">${px.nombre} (Casa)</b>`);
      });

      // Draw route path (polyline) starting from paradas sorted in order to HQ (Planta)
      if (route.paradas.length > 0) {
        const pathPoints = route.paradas.map((p: any) => [p.latitud, p.longitud]);
        pathPoints.push([20.753, -103.415]); // Add Planta destination

        L.polyline(pathPoints, {
          color: color,
          weight: 4,
          opacity: 0.85,
          dashArray: '5, 10'
        }).addTo(markersGroupRef.current);
      }
    });

    // Zoom map to fit all coordinates if items exist
    if (simulatedRoutes.length > 0 && markersGroupRef.current.getBounds().isValid()) {
      mapRef.current.fitBounds(markersGroupRef.current.getBounds(), { padding: [40, 40] });
    }
  }, [simulatedRoutes, leafletLoaded]);

  const handleSimulate = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const data = await simularSmartRutas(maxDistancia, maxCapacidad);
      setSimulatedRoutes(data);
      if (data.length === 0) {
        setErrorMsg("No hay pasajeros con domicilio y geocoordenadas configuradas para agrupar.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al generar simulación de Smart Routing.");
    } finally {
      setLoading(false);
    }
  };

  const handleRouteVehicleChange = (routeId: number, vehicleId: number) => {
    const v = vehiculos.find(x => x.id === vehicleId);
    setSimulatedRoutes(prev => prev.map(r => {
      if (r.id === routeId) {
        return { 
          ...r, 
          vehiculo_id: vehicleId,
          vehiculo_patente: v?.patente || 'S/D'
        };
      }
      return r;
    }));
  };

  const handleRouteConductorChange = (routeId: number, conductorId: string) => {
    const c = conductores.find(x => x.id === conductorId);
    setSimulatedRoutes(prev => prev.map(r => {
      if (r.id === routeId) {
        return { 
          ...r, 
          conductor_id: conductorId,
          conductor_nombre: c?.nombre || 'S/D'
        };
      }
      return r;
    }));
  };

  const handleApplyRouting = async () => {
    setApplying(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await aplicarSmartRutas(simulatedRoutes);
      if (res.success) {
        setSuccessMsg(`¡Plan de Smart Routing aplicado! Se han creado ${res.viajes.length} rutas dinámicas y viajes automáticos programados para mañana.`);
        setSimulatedRoutes([]);
        // Redirigir al panel de viajes tras 3 segundos
        setTimeout(() => {
          router.push('/admin/viajes');
        }, 4000);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al aplicar y guardar el plan de rutas.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <RouteIcon className="text-blue-600" size={32} />
            Smart Routing & Planificación
            <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md flex items-center gap-0.5">
              <Sparkles size={10} className="fill-blue-800" /> AI-Clustering
            </span>
          </h1>
          <p className="text-slate-500 font-medium text-sm lg:text-base">
            Diseña y optimiza recorridos de autobús agrupando geográficamente el domicilio de los empleados.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* PARÁMETROS DEL ALGORITMO Y LISTADO */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-3">
              <Sliders className="text-blue-600" size={18} />
              Configurar Parámetros AI
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>Radio Máx. del Cluster (Parada)</span>
                  <span className="text-blue-600">{maxDistancia} km</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="5.0" 
                  step="0.1"
                  value={maxDistancia}
                  onChange={(e) => setMaxDistancia(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                  Radio máximo radial que caminará un empleado hasta su parada sugerida.
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>Capacidad Máx. por Unidad</span>
                  <span className="text-blue-600">{maxCapacidad} pasajeros</span>
                </div>
                <input 
                  type="range" 
                  min="4" 
                  max="45" 
                  step="1"
                  value={maxCapacidad}
                  onChange={(e) => setMaxCapacidad(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                  Límite de empleados agrupados por ruta sugerida (limita por capacidad física del autobús).
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="text-blue-500 mt-0.5 shrink-0" size={16} />
                <div className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  Pasajeros activos listos en la base: <strong className="text-slate-800 font-bold">{pasajeros.length} empleados</strong> con coordenadas de casa válidas.
                </div>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Procesando Clústers...
                </>
              ) : (
                <>
                  <Play size={16} className="fill-white" /> Generar Rutas Sugeridas
                </>
              )}
            </button>
          </div>

          {/* MENSAJES DE ERROR / ÉXITO */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
              <AlertCircle className="shrink-0" size={16} />
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-pulse">
              <CheckCircle className="shrink-0 animate-bounce" size={16} />
              {successMsg}
            </div>
          )}

          {/* LISTA DE RUTAS SUGERIDAS */}
          {simulatedRoutes.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Rutas Propuestas ({simulatedRoutes.length})</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">HQ: Planta Industrial Norte</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {simulatedRoutes.map((route, idx) => (
                  <div key={route.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-blue-400 transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-900">{route.nombre}</h3>
                      <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                        {route.pasajeros.length} Pasajeros
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-slate-50 pt-3">
                      {/* Driver Assign */}
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Conductor Asignado</label>
                        <select
                          value={route.conductor_id || ''}
                          onChange={(e) => handleRouteConductorChange(route.id, e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-semibold text-slate-700"
                        >
                          <option value="">-- Sin asignar --</option>
                          {conductores.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                      </div>

                      {/* Vehicle Assign */}
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Vehículo Asignado</label>
                        <select
                          value={route.vehiculo_id || ''}
                          onChange={(e) => handleRouteVehicleChange(route.id, Number(e.target.value))}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-semibold text-slate-700"
                        >
                          <option value="">-- Sin asignar --</option>
                          {vehiculos.map(v => (
                            <option key={v.id} value={v.id}>{v.patente} - {v.modelo} (Cap: {v.capacidad})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Paradas resumidas */}
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Ruta de Abordaje</span>
                      <div className="space-y-1.5 pl-1.5 border-l-2 border-blue-200">
                        {route.paradas.map((p: any) => (
                          <div key={p.orden} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-650">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                            <span className="font-extrabold text-slate-800">{p.nombre}</span>
                            <span className="text-[9px] text-slate-400 font-bold">({p.pasajeros.length} pax)</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-650 shrink-0" />
                          <span>Destino: {route.destino}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleApplyRouting}
                disabled={applying}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                {applying ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Guardando Rutas y Viajes...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} /> Crear Rutas y Programar Viajes
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* MAPA DE PREVISUALIZACIÓN */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-[650px] flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Navigation className="text-blue-600" size={14} />
                Mapa de Agrupamiento y Trazados Inteligentes
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                Puntos: Empleados | Paradas: Centroides
              </span>
            </div>
            
            <div 
              id={mapContainerId}
              className="flex-1 w-full rounded-xl overflow-hidden mt-3 bg-slate-50 relative border border-slate-100"
              style={{ zIndex: 1 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
