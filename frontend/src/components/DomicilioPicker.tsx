"use client";

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { Loader2 } from 'lucide-react';
import { updateDomicilioPasajero } from '@/lib/api';

interface DomicilioPickerProps {
  user: any;
}

export default function DomicilioPicker({ user }: DomicilioPickerProps) {
  const [direccion, setDireccion] = useState(user.direccion || "");
  const [lat, setLat] = useState(user.latitud !== null && user.latitud !== undefined ? Number(user.latitud) : 20.6736);
  const [lng, setLng] = useState(user.longitud !== null && user.longitud !== undefined ? Number(user.longitud) : -103.344);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerId = "domicilio-picker-map";

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Asegurar que el CSS de Leaflet esté cargado de forma única
    const existingLink = document.getElementById('leaflet-css');
    if (!existingLink) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Si Leaflet ya está cargado globalmente en window
    if ((window as any).L) {
      setLeafletLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!leafletLoaded) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerId).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
      });

      map.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        setLat(clickLat);
        setLng(clickLng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    } else {
      mapRef.current.setView([lat, lng]);
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [leafletLoaded]);

  const handleSave = async () => {
    if (!direccion.trim()) {
      setStatus("error");
      setStatusMsg("Por favor escribe tu dirección.");
      return;
    }
    setStatus("saving");
    setStatusMsg("");
    try {
      await updateDomicilioPasajero({
        direccion: direccion.trim(),
        latitud: lat,
        longitud: lng
      });
      setStatus("success");
      setStatusMsg("¡Domicilio guardado!");
      
      const userInfo = localStorage.getItem('user_info');
      if (userInfo) {
        const parsed = JSON.parse(userInfo);
        parsed.direccion = direccion.trim();
        parsed.latitud = lat;
        parsed.longitud = lng;
        localStorage.setItem('user_info', JSON.stringify(parsed));
      }
      setTimeout(() => setStatus("idle"), 4000);
    } catch (e: any) {
      setStatus("error");
      setStatusMsg(e.message || "Error al guardar.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <Script 
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" 
        strategy="afterInteractive"
        onLoad={() => setLeafletLoaded(true)}
      />

      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-450">Mi Domicilio Residencial</h3>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Define tu ubicación para optimizar el plan de rutas.</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Dirección Física</label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Ej: Calle Morelos 456, Centro"
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-slate-700"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Latitud</label>
            <input
              type="text"
              value={lat.toFixed(6)}
              readOnly
              className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 text-center"
            />
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Longitud</label>
            <input
              type="text"
              value={lng.toFixed(6)}
              readOnly
              className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 text-center"
            />
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Mapa (Haz clic o arrastra para marcar)</label>
          <div 
            id={mapContainerId} 
            className="h-36 w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-100 relative"
            style={{ zIndex: 1 }}
          />
        </div>

        {statusMsg && (
          <div className={`p-2 rounded-lg text-[11px] font-bold text-center ${
            status === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {statusMsg}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {status === 'saving' ? (
            <>
              <Loader2 className="animate-spin animate-duration-1000" size={14} /> Guardando...
            </>
          ) : (
            'Guardar Domicilio'
          )}
        </button>
      </div>
    </div>
  );
}
