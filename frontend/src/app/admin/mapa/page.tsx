'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchLatestLocations } from '@/lib/api';
import { MapPin, User, Clock, Navigation, Bus, Route } from 'lucide-react';

// Token de Mapbox
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZGpiYjE2MDg4MyIsImEiOiJjbW4zY2o0dTUwOGdxMnFvYmJwZ2xzbnUwIn0.Yv7408j9tAieaX-YB-vAwg';

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

export default function FleetMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const [locations, setLocations] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Estilo premium oscuro
      center: [-103.3496, 20.6736], // Guadalajara / México Occidental por defecto
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const updateLocations = async () => {
      try {
        const data = await fetchLatestLocations();
        setLocations(data);
        
        if (data.length > 0 && map.current) {
          // Ajustar el mapa al primer vehículo activo si es la primera carga
          if (loading) {
             map.current.flyTo({
               center: [data[0].longitud, data[0].latitud],
               zoom: 12
             });
          }

          // Eliminar marcadores viejos que ya no están activos
          const activeIds = new Set(data.map(d => d.viaje_id));
          markers.current.forEach((marker, id) => {
            if (!activeIds.has(id)) {
              marker.remove();
              markers.current.delete(id);
            }
          });

          // Actualizar/Crear marcadores
          data.forEach((loc: VehicleLocation) => {
            const existingMarker = markers.current.get(loc.viaje_id);
            
            if (existingMarker) {
              existingMarker.setLngLat([loc.longitud, loc.latitud]);
            } else {
              // Crear un elemento personalizado para el marcador
              const el = document.createElement('div');
              el.className = 'marker';
              el.style.width = '42px';
              el.style.height = '42px';
              el.style.borderRadius = '50%';
              el.style.backgroundColor = '#2563eb'; // Blue-600
              el.style.border = '3px solid white';
              el.style.boxShadow = '0 0 15px rgba(37, 99, 235, 0.6)';
              el.style.display = 'flex';
              el.style.alignItems = 'center';
              el.style.justifyContent = 'center';
              el.style.cursor = 'pointer';
              el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M14 16H10"/><path d="M4 16v4"/><path d="M20 16v4"/><path d="M12 4v12"/></svg>';

              const popup = new mapboxgl.Popup({ offset: 25 })
                .setHTML(`
                  <div style="color: #0f172a; padding: 6px; font-family: sans-serif; min-width: 180px;">
                    <h3 style="font-weight: 800; font-size: 13px; margin: 0 0 4px 0; color: #1e3a8a;">${loc.ruta_nombre || 'Ruta sin nombre'}</h3>
                    <p style="font-size: 11px; font-weight: 600; margin: 0 0 2px 0; color: #475569;">Unidad: ${loc.patente}</p>
                    <p style="font-size: 11px; font-weight: 600; margin: 0 0 6px 0; color: #475569;">Chofer: ${loc.conductor_nombre || 'No asignado'}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-t: 1px solid #e2e8f0; pt: 4px; font-size: 10px; color: #94a3b8; font-weight: bold;">
                      <span>Vel: ${loc.velocidad || 0} km/h</span>
                      <span>${new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                `);

              const marker = new mapboxgl.Marker(el)
                .setLngLat([loc.longitud, loc.latitud])
                .setPopup(popup)
                .addTo(map.current!);
              
              markers.current.set(loc.viaje_id, marker);
            }
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error updating live fleet locations:', error);
      }
    };

    updateLocations();
    const interval = setInterval(updateLocations, 10000); // Actualizar cada 10 segundos

    return () => {
      clearInterval(interval);
      map.current?.remove();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="text-blue-600" size={32} />
            Mapa en Vivo
          </h1>
          <p className="text-slate-500 font-medium text-sm lg:text-base">Localización GPS y estado de tránsito de la flota de buses de personal en tiempo real.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-blue-100 shadow-sm">
          <Navigation size={16} className="animate-pulse" />
          {locations.length} unidades en tránsito
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[650px]">
        {/* Panel lateral de lista */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-extrabold text-xs uppercase text-slate-400 tracking-wider">Flota en Ruta</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <div className="p-4 text-center text-slate-400 font-medium">Cargando flota...</div>
            ) : locations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium text-sm">
                No hay viajes en tránsito transmitiendo coordenadas GPS.
              </div>
            ) : (
              locations.map((loc) => (
                <button
                  key={loc.viaje_id}
                  onClick={() => map.current?.flyTo({ center: [loc.longitud, loc.latitud], zoom: 15 })}
                  className="w-full p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-left flex items-start gap-3"
                >
                  <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                    <Bus size={18} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-extrabold text-slate-900 truncate leading-snug">{loc.ruta_nombre}</p>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">Unidad: {loc.patente} ({loc.velocidad || 0} km/h)</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 mt-1">
                      <Clock size={12} />
                      Reporte: {new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Mapa */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
          <div ref={mapContainer} className="w-full h-full" />
          
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 shadow-lg text-[10px] font-black uppercase tracking-wider text-slate-500 z-10 pointer-events-none">
            SaaS GPS Engine
          </div>
          
          {loading && (
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-slate-600 font-medium">Iniciando Sistema de Rastreo...</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style jsx global>{`
        .marker {
          transition: transform 0.2s ease-out;
        }
        .marker:hover {
          transform: scale(1.15);
        }
        .mapboxgl-popup-content {
          border-radius: 16px !important;
          padding: 12px !important;
          box-shadow: 0 12px 20px -3px rgba(0, 0, 0, 0.12) !important;
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
        }
        .mapboxgl-popup-close-button {
          padding: 6px !important;
          right: 6px !important;
          top: 6px !important;
        }
      `}</style>
    </div>
  );
}
