'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchLatestLocations, fetchViajes, fetchReservas, fetchAlertas } from '@/lib/api';
import {
  MapPin, User, Clock, Navigation, Bus, Route, Maximize2, Minimize2,
  Layers, ChevronLeft, AlertTriangle, Wifi, Users, Gauge, Timer,
  RefreshCw, ArrowLeft
} from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const REFRESH_INTERVAL_MS = 5000;

const MAP_STYLES: Record<string, string> = {
  dark:      'mapbox://styles/mapbox/dark-v11',
  streets:   'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

interface VehicleLocation {
  viaje_id: number;
  latitud: number;
  longitud: number;
  velocidad: number;
  timestamp: string;
  ruta_nombre: string;
  patente: string;
  conductor_nombre: string;
}

/** Distancia en km entre dos coordenadas (Haversine) */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Color del marcador según velocidad */
function speedColor(kmh: number): string {
  if (kmh === 0) return '#64748b';       // slate - detenido
  if (kmh <= 30)  return '#10b981';      // emerald - lento
  if (kmh <= 60)  return '#f59e0b';      // amber - moderado
  return '#ef4444';                       // red - rápido
}

/** Crea el HTML del marcador SVG animado */
function createMarkerEl(kmh: number, isSelected: boolean): HTMLDivElement {
  const color = speedColor(kmh);
  const el = document.createElement('div');
  el.className = 'fleet-marker';
  el.style.cssText = `
    position: relative;
    width: 48px;
    height: 48px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  el.innerHTML = `
    <div class="pulse-ring" style="
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      border: 3px solid ${color};
      opacity: 0.4;
      animation: pulse-ring 2s ease-out infinite;
    "></div>
    <div style="
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: ${color};
      border: 3px solid white;
      box-shadow: 0 0 18px ${color}80, 0 4px 12px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      ${isSelected ? 'transform: scale(1.2); box-shadow: 0 0 28px ' + color + ', 0 4px 16px rgba(0,0,0,0.4);' : ''}
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="12" rx="2"/><path d="M14 16H10"/><path d="M4 16v4"/><path d="M20 16v4"/>
      </svg>
    </div>
    ${kmh > 0 ? `<div style="
      position: absolute;
      bottom: -18px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      color: white;
      font-size: 9px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 4px;
      white-space: nowrap;
    ">${kmh} km/h</div>` : ''}
  `;
  return el;
}

export default function FleetMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map          = useRef<mapboxgl.Map | null>(null);
  const markers      = useRef<Map<number, { marker: mapboxgl.Marker; el: HTMLDivElement }>>(new Map());
  const stopMarkers  = useRef<mapboxgl.Marker[]>([]);
  const popups       = useRef<Map<number, mapboxgl.Popup>>(new Map());

  const [locations,       setLocations]       = useState<VehicleLocation[]>([]);
  const [viajes,          setViajes]          = useState<any[]>([]);
  const [alertas,         setAlertas]         = useState<any[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [selectedViajeId, setSelectedViajeId] = useState<number | null>(null);
  const [detailPasajeros, setDetailPasajeros] = useState<any[]>([]);
  const [loadingDetail,   setLoadingDetail]   = useState(false);
  const [mapStyle,        setMapStyle]        = useState<'dark' | 'streets' | 'satellite'>('dark');
  const [isFullscreen,    setIsFullscreen]    = useState(false);
  const [countdown,       setCountdown]       = useState(REFRESH_INTERVAL_MS / 1000);
  const [lastUpdate,      setLastUpdate]      = useState<Date | null>(null);

  const viajesRef    = useRef<any[]>([]);
  const locationsRef = useRef<VehicleLocation[]>([]);
  const selectedRef  = useRef<number | null>(null);

  useEffect(() => { viajesRef.current = viajes; },    [viajes]);
  useEffect(() => { locationsRef.current = locations; }, [locations]);
  useEffect(() => { selectedRef.current = selectedViajeId; }, [selectedViajeId]);

  // ── Carga inicial de viajes y alertas ───────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchViajes(), fetchAlertas()])
      .then(([v, a]) => { setViajes(v); setAlertas(a); })
      .catch(console.error);
  }, []);

  // ── Carga de pasajeros cuando se selecciona un vehículo ─────────────────────
  useEffect(() => {
    if (selectedViajeId === null) { setDetailPasajeros([]); return; }
    setLoadingDetail(true);
    fetchReservas(selectedViajeId)
      .then(data => setDetailPasajeros(Array.isArray(data) ? data : []))
      .catch(() => setDetailPasajeros([]))
      .finally(() => setLoadingDetail(false));
  }, [selectedViajeId]);

  // ── Countdown timer visual ──────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => (c <= 1 ? REFRESH_INTERVAL_MS / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Dibujar ruta en el mapa ─────────────────────────────────────────────────
  const drawRoute = useCallback((viajeId: number | null) => {
    const m = map.current;
    if (!m) return;

    stopMarkers.current.forEach(mk => mk.remove());
    stopMarkers.current = [];

    if (viajeId === null) {
      if (m.getLayer('route-line'))   m.removeLayer('route-line');
      if (m.getSource('route-source')) m.removeSource('route-source');
      return;
    }

    const viaje = viajesRef.current.find((v: any) => v.id === viajeId);
    if (!viaje?.paradas?.length) {
      if (m.getLayer('route-line'))   m.removeLayer('route-line');
      if (m.getSource('route-source')) m.removeSource('route-source');
      return;
    }

    const coords = [...viaje.paradas]
      .sort((a: any, b: any) => a.orden - b.orden)
      .map((p: any) => [Number(p.longitud), Number(p.latitud)]);

    const geoData: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature', properties: {},
      geometry: { type: 'LineString', coordinates: coords }
    };

    if (m.getSource('route-source')) {
      (m.getSource('route-source') as mapboxgl.GeoJSONSource).setData(geoData);
    } else {
      m.addSource('route-source', { type: 'geojson', data: geoData });
      m.addLayer({
        id: 'route-line', type: 'line', source: 'route-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.85,
                 'line-dasharray': [2, 0] }
      });
    }

    viaje.paradas.forEach((p: any, idx: number) => {
      const isFirst = idx === 0;
      const isLast  = idx === viaje.paradas.length - 1;
      const el = document.createElement('div');
      el.style.cssText = `
        width: 26px; height: 26px; border-radius: 50%;
        background: ${isFirst ? '#3b82f6' : isLast ? '#10b981' : '#fff'};
        border: 3px solid ${isFirst ? '#1d4ed8' : isLast ? '#059669' : '#64748b'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        font-size: 10px; font-weight: 800;
        color: ${isFirst || isLast ? 'white' : '#334155'};
        cursor: pointer; z-index: 5;
      `;
      el.textContent = String(p.orden);

      const popup = new mapboxgl.Popup({ offset: 14, closeButton: false })
        .setHTML(`
          <div style="font-family:sans-serif;padding:4px;min-width:120px;">
            <div style="font-weight:800;font-size:11px;color:${isFirst ? '#2563eb' : isLast ? '#059669' : '#334155'}">
              ${isFirst ? '🚏 Origen' : isLast ? '🏁 Destino' : `Parada ${p.orden}`}
            </div>
            <div style="font-weight:600;font-size:12px;margin-top:2px;">${p.nombre}</div>
          </div>
        `);

      stopMarkers.current.push(
        new mapboxgl.Marker(el)
          .setLngLat([Number(p.longitud), Number(p.latitud)])
          .setPopup(popup)
          .addTo(m)
      );
    });

    // Ajustar vista para ver ruta completa
    const loc = locationsRef.current.find(l => l.viaje_id === viajeId);
    const bounds = new mapboxgl.LngLatBounds();
    if (loc) bounds.extend([loc.longitud, loc.latitud]);
    coords.forEach(c => bounds.extend(c as [number, number]));
    if (!bounds.isEmpty()) m.fitBounds(bounds, { padding: 80, maxZoom: 15 });
  }, []);

  useEffect(() => {
    if (map.current) drawRoute(selectedViajeId);
  }, [selectedViajeId, viajes, drawRoute]);

  // ── Inicializar mapa ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style:  MAP_STYLES.dark,
      center: [-103.3496, 20.6736],
      zoom:   11,
      attributionControl: false,
    });
    m.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    m.addControl(new mapboxgl.ScaleControl(), 'bottom-right');
    map.current = m;

    const poll = async () => {
      try {
        const data: VehicleLocation[] = await fetchLatestLocations();
        setLocations(data);
        setLastUpdate(new Date());
        setCountdown(REFRESH_INTERVAL_MS / 1000);

        if (!m) return;

        const activeIds = new Set(data.map(d => d.viaje_id));

        // Eliminar marcadores inactivos
        markers.current.forEach((v, id) => {
          if (!activeIds.has(id)) {
            v.marker.remove();
            popups.current.get(id)?.remove();
            markers.current.delete(id);
            popups.current.delete(id);
          }
        });

        // Actualizar / crear marcadores
        data.forEach((loc: VehicleLocation) => {
          const existing = markers.current.get(loc.viaje_id);
          const isSelected = selectedRef.current === loc.viaje_id;

          if (existing) {
            existing.marker.setLngLat([loc.longitud, loc.latitud]);
            // Actualizar color si cambió velocidad
            existing.el.innerHTML = createMarkerEl(Math.round(loc.velocidad || 0), isSelected).innerHTML;
          } else {
            const el = createMarkerEl(Math.round(loc.velocidad || 0), isSelected);

            // Calcular ETA al destino (última parada de la ruta)
            const viaje = viajesRef.current.find((v: any) => v.id === loc.viaje_id);
            let etaMin: number | null = null;
            if (viaje?.paradas?.length > 0 && loc.velocidad > 5) {
              const lastP = [...viaje.paradas].sort((a: any, b: any) => b.orden - a.orden)[0];
              const distKm = haversineKm(loc.latitud, loc.longitud, Number(lastP.latitud), Number(lastP.longitud));
              etaMin = Math.round((distKm / loc.velocidad) * 60);
            }

            const popup = new mapboxgl.Popup({ offset: 30, maxWidth: '260px' })
              .setHTML(`
                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;padding:4px;">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                    <div style="width:8px;height:8px;border-radius:50%;background:${speedColor(loc.velocidad || 0)};flex-shrink:0;"></div>
                    <span style="font-weight:900;font-size:14px;line-height:1.2">${loc.ruta_nombre || 'Ruta'}</span>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
                    <div style="background:#f8fafc;border-radius:8px;padding:6px;">
                      <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Unidad</div>
                      <div style="font-weight:700;font-size:12px;margin-top:2px;">${loc.patente || 'S/D'}</div>
                    </div>
                    <div style="background:#f8fafc;border-radius:8px;padding:6px;">
                      <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Velocidad</div>
                      <div style="font-weight:700;font-size:12px;margin-top:2px;color:${speedColor(loc.velocidad || 0)}">${Math.round(loc.velocidad || 0)} km/h</div>
                    </div>
                  </div>
                  <div style="background:#f8fafc;border-radius:8px;padding:6px;margin-bottom:6px;">
                    <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Conductor</div>
                    <div style="font-weight:700;font-size:12px;margin-top:2px;">${loc.conductor_nombre || 'No asignado'}</div>
                  </div>
                  ${etaMin !== null ? `
                    <div style="background:#eff6ff;border-radius:8px;padding:6px;margin-bottom:6px;border:1px solid #dbeafe;">
                      <div style="font-size:9px;font-weight:800;color:#3b82f6;text-transform:uppercase;letter-spacing:0.05em;">ETA estimado al destino</div>
                      <div style="font-weight:900;font-size:13px;margin-top:2px;color:#2563eb;">~${etaMin} min</div>
                    </div>
                  ` : ''}
                  <div style="font-size:10px;color:#94a3b8;font-weight:600;text-align:right;">
                    ${new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              `);

            el.addEventListener('click', () => {
              setSelectedViajeId(prev => (prev === loc.viaje_id ? null : loc.viaje_id));
            });

            const mk = new mapboxgl.Marker(el)
              .setLngLat([loc.longitud, loc.latitud])
              .setPopup(popup)
              .addTo(m);

            markers.current.set(loc.viaje_id, { marker: mk, el });
            popups.current.set(loc.viaje_id, popup);
          }
        });

        // Primer load: centrar en todos los vehículos
        if (loading && data.length > 0) {
          const b = new mapboxgl.LngLatBounds();
          data.forEach(d => b.extend([d.longitud, d.latitud]));
          m.fitBounds(b, { padding: 100, maxZoom: 14 });
        }
        setLoading(false);
      } catch (err) {
        console.error('Fleet GPS poll error:', err);
      }
    };

    m.on('load', () => {
      poll();
      const interval = setInterval(poll, REFRESH_INTERVAL_MS);
      (m as any)._pollInterval = interval;
    });

    return () => {
      clearInterval((m as any)._pollInterval);
      stopMarkers.current.forEach(mk => mk.remove());
      m.remove();
    };
  }, []);

  // ── Cambiar estilo del mapa ──────────────────────────────────────────────────
  const handleStyleChange = (style: 'dark' | 'streets' | 'satellite') => {
    if (!map.current) return;
    setMapStyle(style);
    map.current.setStyle(MAP_STYLES[style]);
    // Restaurar ruta tras el cambio de estilo
    map.current.once('styledata', () => drawRoute(selectedViajeId));
  };

  // ── Centrar todos los vehículos ──────────────────────────────────────────────
  const fitAll = () => {
    if (!map.current || locations.length === 0) return;
    const b = new mapboxgl.LngLatBounds();
    locations.forEach(l => b.extend([l.longitud, l.latitud]));
    map.current.fitBounds(b, { padding: 100, maxZoom: 14 });
    setSelectedViajeId(null);
  };

  // ── Derivados de datos ───────────────────────────────────────────────────────
  const selectedLoc   = locations.find(l => l.viaje_id === selectedViajeId) ?? null;
  const selectedViaje = viajes.find(v => v.id === selectedViajeId) ?? null;
  const totalVehicles = locations.length;
  const avgSpeed      = locations.length > 0
    ? Math.round(locations.reduce((s, l) => s + (l.velocidad || 0), 0) / locations.length)
    : 0;
  const alertasActivas = alertas.filter((a: any) => !a.resuelta);
  const pasajerosAbordados = detailPasajeros.filter(p => p.reserva_estado === 'confirmado').length;

  return (
    <div className={`flex flex-col gap-0 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-0' : 'space-y-4'}`}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      {!isFullscreen && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <MapPin className="text-blue-600" size={30} />
              Mapa de Flota en Vivo
            </h1>
            <p className="text-slate-500 font-medium text-sm lg:text-base">
              Rastreo GPS de todos los vehículos en tránsito · Actualización cada {REFRESH_INTERVAL_MS / 1000}s
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <RefreshCw size={11} className={countdown <= 1 ? 'animate-spin text-blue-500' : ''} />
                Actualiza en {countdown}s
              </span>
            )}
            <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-emerald-100">
              <Wifi size={13} className="animate-pulse" />
              {totalVehicles} unidades GPS
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Bar ─────────────────────────────────────────────────────────── */}
      {!isFullscreen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={<Bus size={20} className="text-blue-500" />}     label="Vehículos en Ruta"    value={`${totalVehicles}`}          sub="Transmitiendo GPS"       color="blue"    loading={loading} />
          <KpiCard icon={<Gauge size={20} className="text-amber-500" />}  label="Velocidad Promedio"   value={`${avgSpeed} km/h`}          sub="Todos los vehículos"     color="amber"   loading={loading} />
          <KpiCard icon={<AlertTriangle size={20} className="text-red-500" />} label="Alertas Activas" value={`${alertasActivas.length}`}  sub="Incidentes en ruta"      color="red"     loading={loading} />
          <KpiCard icon={<Timer size={20} className="text-emerald-500" />} label="Última actualización" value={lastUpdate ? lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'} sub="Datos en tiempo real" color="emerald" loading={loading} />
        </div>
      )}

      {/* ── Mapa + Sidebar ──────────────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 lg:grid-cols-4 gap-4 ${isFullscreen ? 'flex-1 h-full p-2' : 'h-[640px]'}`}
           style={isFullscreen ? { display: 'flex', gap: '8px', padding: '8px', flex: 1 } : undefined}>

        {/* Panel lateral */}
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col ${isFullscreen ? 'w-72 flex-shrink-0' : 'lg:col-span-1'}`}>
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            {selectedViajeId ? (
              <button
                onClick={() => setSelectedViajeId(null)}
                className="flex items-center gap-2 text-blue-600 text-xs font-black hover:text-blue-700 transition-colors"
              >
                <ArrowLeft size={14} />
                Ver toda la flota
              </button>
            ) : (
              <h2 className="font-extrabold text-xs uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <Bus size={12} />
                Flota en Ruta ({totalVehicles})
              </h2>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ── Vista de detalle del vehículo seleccionado ── */}
            {selectedViajeId && selectedLoc ? (
              <div className="p-4 space-y-4">
                {/* Info de ruta */}
                <div className="rounded-xl overflow-hidden border border-slate-100">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3">
                    <p className="text-[10px] text-blue-200 font-black uppercase tracking-widest">Ruta Activa</p>
                    <p className="text-white font-extrabold text-base leading-tight">{selectedLoc.ruta_nombre}</p>
                  </div>
                  <div className="p-3 space-y-2.5 bg-white">
                    <DetailRow label="Unidad" value={selectedLoc.patente || 'S/D'} />
                    <DetailRow label="Conductor" value={selectedLoc.conductor_nombre || 'No asignado'} />
                    <DetailRow label="Último reporte" value={new Date(selectedLoc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
                  </div>
                </div>

                {/* Velocidad gauge */}
                <div className="rounded-xl border border-slate-100 p-3 bg-white">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Velocidad</p>
                  <div className="flex items-end gap-2 mb-1.5">
                    <span className="text-3xl font-extrabold" style={{ color: speedColor(selectedLoc.velocidad || 0) }}>
                      {Math.round(selectedLoc.velocidad || 0)}
                    </span>
                    <span className="text-slate-400 font-bold text-sm mb-1">km/h</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, ((selectedLoc.velocidad || 0) / 100) * 100)}%`,
                        background: speedColor(selectedLoc.velocidad || 0),
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1">
                    <span>0</span><span>50</span><span>100 km/h</span>
                  </div>
                </div>

                {/* ETA */}
                {selectedViaje?.paradas?.length > 0 && (selectedLoc.velocidad || 0) > 5 && (() => {
                  const lastP = [...selectedViaje.paradas].sort((a: any, b: any) => b.orden - a.orden)[0];
                  const distKm = haversineKm(selectedLoc.latitud, selectedLoc.longitud, Number(lastP.latitud), Number(lastP.longitud));
                  const etaMin = Math.round((distKm / selectedLoc.velocidad) * 60);
                  return (
                    <div className="rounded-xl border border-blue-100 p-3 bg-blue-50">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Timer size={11} /> ETA al Destino
                      </p>
                      <p className="text-2xl font-extrabold text-blue-700">~{etaMin} min</p>
                      <p className="text-[11px] text-blue-500 font-semibold">{distKm.toFixed(1)} km restantes</p>
                    </div>
                  );
                })()}

                {/* Pasajeros a bordo */}
                <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Users size={11} /> Pasajeros a Bordo
                    </p>
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {pasajerosAbordados} confirmados
                    </span>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-50">
                    {loadingDetail ? (
                      <div className="p-4 text-center text-xs text-slate-400">Cargando pasajeros...</div>
                    ) : detailPasajeros.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">Sin reservas registradas</div>
                    ) : (
                      detailPasajeros.map((p: any, i) => (
                        <div key={p.reserva_id ?? i} className="px-3 py-2 flex items-center gap-2.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0
                            ${p.reserva_estado === 'confirmado' ? 'bg-emerald-100 text-emerald-700'
                            : p.reserva_estado === 'rechazado' ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-600'}`}>
                            {(p.nombre || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{p.nombre || p.email || 'Pasajero'}</p>
                            <p className={`text-[10px] font-bold ${p.reserva_estado === 'confirmado' ? 'text-emerald-600' : p.reserva_estado === 'rechazado' ? 'text-red-500' : 'text-amber-600'}`}>
                              {p.reserva_estado === 'confirmado' ? '✓ Abordado' : p.reserva_estado === 'rechazado' ? '✗ Rechazado' : '⏳ Pendiente'}
                            </p>
                          </div>
                          {p.asiento_numero && (
                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{p.asiento_numero}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ── Lista de flota ── */
              <div className="p-2 space-y-1.5">
                {loading ? (
                  <div className="p-4 text-center text-slate-400 text-xs font-medium">Localizando flota...</div>
                ) : locations.length === 0 ? (
                  <div className="p-8 text-center">
                    <Navigation className="text-slate-300 mx-auto mb-2" size={28} />
                    <p className="text-sm font-bold text-slate-500">Sin vehículos en ruta</p>
                    <p className="text-xs text-slate-400 mt-1">Los conductores deben activar el GPS en la app móvil.</p>
                  </div>
                ) : (
                  locations.map((loc) => {
                    const viaje = viajes.find(v => v.id === loc.viaje_id);
                    const alertaViaje = alertasActivas.find((a: any) => a.viaje_id === loc.viaje_id);
                    return (
                      <button
                        key={loc.viaje_id}
                        onClick={() => {
                          setSelectedViajeId(loc.viaje_id);
                          map.current?.flyTo({ center: [loc.longitud, loc.latitud], zoom: 15 });
                        }}
                        className={`w-full p-3 rounded-xl border transition-all text-left
                          ${selectedViajeId === loc.viaje_id
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="relative flex-shrink-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                 style={{ background: speedColor(loc.velocidad || 0) + '20' }}>
                              <Bus size={18} style={{ color: speedColor(loc.velocidad || 0) }} />
                            </div>
                            {alertaViaje && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                <AlertTriangle size={8} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-slate-900 text-xs truncate leading-tight">{loc.ruta_nombre}</p>
                            <p className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">{loc.conductor_nombre || 'Sin conductor'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                                    style={{ background: speedColor(loc.velocidad || 0) + '20', color: speedColor(loc.velocidad || 0) }}>
                                {Math.round(loc.velocidad || 0)} km/h
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold">{loc.patente}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Mapa ─────────────────────────────────────────────────────────── */}
        <div className={`relative rounded-2xl overflow-hidden shadow-xl border border-slate-200 ${isFullscreen ? 'flex-1 h-full' : 'lg:col-span-3'}`}>
          <div ref={mapContainer} className="w-full h-full" />

          {/* Overlay de loading */}
          {loading && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="bg-white/95 backdrop-blur p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-white/20">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-slate-700 font-bold text-sm">Iniciando Rastreo GPS...</p>
              </div>
            </div>
          )}

          {/* Controles del mapa */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
            {/* Selector de estilo */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-white/30 overflow-hidden">
              {(['dark', 'streets', 'satellite'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => handleStyleChange(s)}
                  className={`flex items-center gap-1.5 w-full px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors
                    ${mapStyle === s ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Layers size={10} />
                  {s === 'dark' ? 'Oscuro' : s === 'streets' ? 'Calles' : 'Satélite'}
                </button>
              ))}
            </div>

            {/* Fit all */}
            {locations.length > 1 && (
              <button
                onClick={fitAll}
                className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-white/30 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                <Route size={11} />Ver todo
              </button>
            )}
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="absolute top-3 right-14 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-white/30 p-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Leyenda de velocidades */}
          <div className="absolute bottom-8 left-3 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 px-3 py-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Velocidad</p>
            <div className="flex flex-col gap-1">
              {[
                { color: '#64748b', label: 'Detenido', range: '0 km/h' },
                { color: '#10b981', label: 'Lento',    range: '1–30 km/h' },
                { color: '#f59e0b', label: 'Moderado', range: '31–60 km/h' },
                { color: '#ef4444', label: 'Rápido',   range: '60+ km/h' },
              ].map(({ color, label, range }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-[9px] font-bold text-slate-500">{label}</span>
                  <span className="text-[9px] text-slate-400 font-medium ml-auto pl-2">{range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Badge de marca */}
          <div className="absolute bottom-8 right-3 z-10 bg-slate-900/70 backdrop-blur text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest pointer-events-none">
            AllRide GPS Engine
          </div>
        </div>
      </div>

      {/* ── CSS de animación del marcador ──────────────────────────────────── */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.5; }
          70%  { transform: scale(1.6); opacity: 0;   }
          100% { transform: scale(1.6); opacity: 0;   }
        }
        .fleet-marker { transition: transform 0.3s ease; }
        .fleet-marker:hover > div:last-child { transform: scale(1.15) !important; }
        .mapboxgl-popup-content {
          border-radius: 16px !important;
          padding: 14px !important;
          box-shadow: 0 20px 40px -8px rgba(0,0,0,0.18) !important;
          border: 1px solid rgba(0,0,0,0.06) !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        }
        .mapboxgl-popup-close-button {
          padding: 6px 8px !important;
          font-size: 16px !important;
          right: 4px !important;
          top: 4px !important;
          color: #94a3b8 !important;
          border-radius: 8px !important;
        }
        .mapboxgl-popup-close-button:hover { background: #f1f5f9 !important; color: #334155 !important; }
      `}</style>
    </div>
  );
}

// ── Componentes auxiliares ─────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color, loading }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string; loading: boolean;
}) {
  const bg  = { blue: 'bg-blue-50',    amber: 'bg-amber-50',    red: 'bg-red-50',    emerald: 'bg-emerald-50'    }[color];
  const txt = { blue: 'text-blue-700', amber: 'text-amber-700', red: 'text-red-700', emerald: 'text-emerald-700' }[color];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3 shadow-sm">
      <div className={`p-2.5 rounded-xl ${bg} flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
        <p className={`text-xl font-extrabold mt-0.5 ${loading ? 'opacity-40' : ''} ${txt}`}>{loading ? '—' : value}</p>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-xs font-bold text-slate-800 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
