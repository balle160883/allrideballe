"use client";

import React from 'react';
import { Navigation } from 'lucide-react';

interface LiveMapMiniProps {
  lat: number;
  lng: number;
}

export default function LiveMapMini({ lat, lng }: LiveMapMiniProps) {
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <Navigation className="text-blue-600 animate-pulse" size={16} />
        <span className="text-sm font-bold text-slate-900">Ubicación del Autobús en Tiempo Real</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          Live
        </span>
      </div>
      <iframe
        src={mapUrl}
        className="w-full h-52 border-0"
        title="Mapa GPS en vivo"
        loading="lazy"
      />
    </div>
  );
}
