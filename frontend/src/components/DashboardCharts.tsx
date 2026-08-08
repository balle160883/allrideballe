'use client';

import React, { useState } from 'react';
import { TrendingUp, Users, Bus, Clock, ShieldCheck, Zap } from 'lucide-react';

const demandData = [
  { hora: '06:00', pasajeros: 140, capacidad: 180 },
  { hora: '08:00', pasajeros: 310, capacidad: 350 },
  { hora: '10:00', pasajeros: 190, capacidad: 240 },
  { hora: '12:00', pasajeros: 220, capacidad: 260 },
  { hora: '14:00', pasajeros: 280, capacidad: 320 },
  { hora: '16:00', pasajeros: 200, capacidad: 250 },
  { hora: '18:00', pasajeros: 340, capacidad: 380 },
  { hora: '20:00', pasajeros: 160, capacidad: 200 },
];

const fleetStatusData = [
  { name: 'En Ruta', value: 12, percentage: 46, color: '#10b981', bgClass: 'bg-emerald-500' },
  { name: 'Programado', value: 8, percentage: 30, color: '#3b82f6', bgClass: 'bg-blue-500' },
  { name: 'En Mantenimiento', value: 2, percentage: 8, color: '#f59e0b', bgClass: 'bg-amber-500' },
  { name: 'Completados Hoy', value: 24, percentage: 92, color: '#64748b', bgClass: 'bg-slate-500' },
];

const routePerformanceData = [
  { ruta: 'Ruta 101 - Zona Industrial', viajes: 18, puntualidad: 98 },
  { ruta: 'Ruta 204 - Corporativo Norte', viajes: 14, puntualidad: 92 },
  { ruta: 'Ruta 305 - Sur Express', viajes: 22, puntualidad: 96 },
  { ruta: 'Ruta 402 - Campus Tech', viajes: 10, puntualidad: 100 },
];

export function DashboardCharts() {
  const [activeBar, setActiveBar] = useState<number | null>(null);

  const maxVal = Math.max(...demandData.map((d) => d.capacidad));

  return (
    <div className="space-y-6 my-6">
      {/* Upper Grid: Demand Area Chart + Fleet Distribution Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Demand & Capacity Hourly SVG Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Demanda de Pasajeros y Capacidad
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comparativa por hora del día (Asientos reservados vs Abordajes reales)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Pasajeros
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500 inline-block" /> Capacidad
              </span>
            </div>
          </div>

          {/* SVG Area Chart */}
          <div className="relative h-64 w-full">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 800 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="pasajerosGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="capacidadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Horizontal Lines */}
              {[0, 60, 120, 180].map((y, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={y}
                  x2="800"
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Capacity Area & Line */}
              {(() => {
                const points = demandData
                  .map((d, i) => {
                    const x = (i / (demandData.length - 1)) * 800;
                    const y = 220 - (d.capacidad / maxVal) * 200;
                    return `${x},${y}`;
                  })
                  .join(' ');
                return (
                  <>
                    <polygon points={`0,220 ${points} 800,220`} fill="url(#capacidadGradient)" />
                    <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="5 5" />
                  </>
                );
              })()}

              {/* Pasajeros Area & Line */}
              {(() => {
                const points = demandData
                  .map((d, i) => {
                    const x = (i / (demandData.length - 1)) * 800;
                    const y = 220 - (d.pasajeros / maxVal) * 200;
                    return `${x},${y}`;
                  })
                  .join(' ');
                return (
                  <>
                    <polygon points={`0,220 ${points} 800,220`} fill="url(#pasajerosGradient)" />
                    <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="3" />
                  </>
                );
              })()}

              {/* Interactive Data Points */}
              {demandData.map((d, i) => {
                const x = (i / (demandData.length - 1)) * 800;
                const y = 220 - (d.pasajeros / maxVal) * 200;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={activeBar === i ? 7 : 4}
                    className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-slate-900 cursor-pointer transition-all duration-200"
                    strokeWidth="2"
                    onMouseEnter={() => setActiveBar(i)}
                    onMouseLeave={() => setActiveBar(null)}
                  />
                );
              })}
            </svg>

            {/* Floating Tooltip */}
            {activeBar !== null && (
              <div
                className="absolute z-10 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full border border-slate-700"
                style={{
                  left: `${(activeBar / (demandData.length - 1)) * 100}%`,
                  top: `${100 - (demandData[activeBar].pasajeros / maxVal) * 80}%`,
                }}
              >
                <div className="font-bold text-blue-400">{demandData[activeBar].hora} hrs</div>
                <div>Pasajeros: <strong className="text-white">{demandData[activeBar].pasajeros}</strong></div>
                <div>Capacidad: <strong className="text-emerald-400">{demandData[activeBar].capacidad}</strong></div>
              </div>
            )}
          </div>

          {/* Time Labels */}
          <div className="flex justify-between text-xs font-semibold text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800">
            {demandData.map((d) => (
              <span key={d.hora}>{d.hora}</span>
            ))}
          </div>
        </div>

        {/* 2. Fleet Status Progress Bars */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bus className="text-blue-600 dark:text-blue-400" size={20} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Estado de Flota
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribución operativa actual de vehículos
            </p>
          </div>

          <div className="space-y-4 my-4">
            {fleetStatusData.map((item) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.bgClass}`} />
                    {item.name}
                  </span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">
                    {item.value} <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.bgClass}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="text-emerald-500" size={16} /> Disponibilidad Global
            </span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">92% Operativo</span>
          </div>
        </div>
      </div>

      {/* Lower Grid: Route Performance Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Zap className="text-amber-500" size={20} /> Rendimiento y Puntualidad por Ruta
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluación de cumplimiento de horarios del día de hoy
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {routePerformanceData.map((r, idx) => (
            <div
              key={idx}
              className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2 hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                  {r.ruta}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    r.puntualidad >= 95
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {r.puntualidad}% A tiempo
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span>Viajes hoy: <strong className="text-slate-800 dark:text-slate-200">{r.viajes}</strong></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Excelente</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
