import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { routeApi } from '../../services/api';
import { MapPin, Navigation, Send, Car, Play, Info, User, LogOut, ShieldCheck } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import AuthModal from '../Auth/AuthModal';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const MapboxView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  const [origin, setOrigin] = useState<mapboxgl.LngLat | null>(null);
  const [destination, setDestination] = useState<mapboxgl.LngLat | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number, duration: number, geometry?: any, id?: string } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [availableRides, setAvailableRides] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const originMarker = useRef<mapboxgl.Marker | null>(null);
  const destMarker = useRef<mapboxgl.Marker | null>(null);
  const vehicleMarker = useRef<mapboxgl.Marker | null>(null);
  const rideMarkers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    socketRef.current = io(SOCKET_URL);
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [-99.1332, 19.4326],
      zoom: 12,
      pitch: 45,
    });

    mapRef.current.on('load', () => {
      setupLayers();
      loadAvailableRides();
    });

    mapRef.current.on('click', (e) => {
      if (isPublishing) handleMapClick(e.lngLat);
    });

    // Revisar si hay sesión previa
    const savedUser = localStorage.getItem('user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));

    return () => {
      mapRef.current?.remove();
      socketRef.current?.disconnect();
    };
  }, [isPublishing]);

  const setupLayers = () => {
    if (!mapRef.current) return;
    mapRef.current.addSource('route', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
    });

    mapRef.current.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#8b5cf6', 'line-width': 6, 'line-opacity': 0.8 }
    });
  };

  const loadAvailableRides = async () => {
    try {
      const rides = await routeApi.getRides();
      setAvailableRides(rides);
      rideMarkers.current.forEach(m => m.remove());
      rideMarkers.current = [];
      rides.forEach((ride: any) => {
        const marker = new mapboxgl.Marker({ color: '#6366f1' })
          .setLngLat([ride.originLng, ride.originLat])
          .addTo(mapRef.current!);
        rideMarkers.current.push(marker);
      });
    } catch (error) { console.error(error); }
  };

  const handleMapClick = (lngLat: mapboxgl.LngLat) => {
    if (!origin) {
      setOrigin(lngLat);
      if (originMarker.current) originMarker.current.remove();
      originMarker.current = new mapboxgl.Marker({ color: '#10b981' }).setLngLat(lngLat).addTo(mapRef.current!);
    } else if (!destination) {
      setDestination(lngLat);
      if (destMarker.current) destMarker.current.remove();
      destMarker.current = new mapboxgl.Marker({ color: '#f43f5e' }).setLngLat(lngLat).addTo(mapRef.current!);
      calculateAndShowRoute(origin, lngLat);
    } else {
      setOrigin(lngLat); setDestination(null);
      if (destMarker.current) destMarker.current.remove();
      originMarker.current?.setLngLat(lngLat);
      clearRoute();
    }
  };

  const calculateAndShowRoute = async (start: mapboxgl.LngLat, end: mapboxgl.LngLat) => {
    try {
      const data = await routeApi.calculateRoute({ lng: start.lng, lat: start.lat }, { lng: end.lng, lat: end.lat });
      const source = mapRef.current?.getSource('route') as mapboxgl.GeoJSONSource;
      source.setData({ type: 'Feature', properties: {}, geometry: data.geometry });
      setRouteInfo({ distance: data.distance, duration: data.duration, geometry: data.geometry, id: data.rideId });
      
      const bounds = data.geometry.coordinates.reduce((acc: mapboxgl.LngLatBounds, coord: [number, number]) => acc.extend(coord), new mapboxgl.LngLatBounds(data.geometry.coordinates[0], data.geometry.coordinates[0]));
      mapRef.current?.fitBounds(bounds, { padding: 100, duration: 2000 });
    } catch (error) { console.error(error); }
  };

  const clearRoute = () => {
    const source = mapRef.current?.getSource('route') as mapboxgl.GeoJSONSource;
    source?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
    setRouteInfo(null);
  };

  const handleConfirmRide = async () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setIsPublishing(false);
    loadAvailableRides();
    alert('✅ Viaje guardado correctamente bajo tu perfil.');
  };

  const startTrackingSimulation = () => {
    if (!routeInfo || !routeInfo.geometry) return;
    setIsSimulating(true);
    const coordinates = routeInfo.geometry.coordinates;
    let step = 0;

    const el = document.createElement('div');
    el.innerHTML = '<div style="background: #6366f1; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 0 15px rgba(99, 102, 241, 0.6);"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.5C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>';

    vehicleMarker.current = new mapboxgl.Marker(el).setLngLat(coordinates[0]).addTo(mapRef.current!);
    socketRef.current?.emit('startRide', routeInfo.id);

    const animate = () => {
      if (step >= coordinates.length) { setIsSimulating(false); return; }
      const currentCoords = coordinates[step];
      vehicleMarker.current?.setLngLat(currentCoords);
      socketRef.current?.emit('updateLocation', { rideId: routeInfo.id, location: currentCoords, bearing: 0 });
      mapRef.current?.easeTo({ center: currentCoords, zoom: 16, duration: 200, pitch: 60 });
      step++;
      setTimeout(() => requestAnimationFrame(animate), 200);
    };
    animate();
  };

  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainerRef} className="absolute inset-0" />
      
      <div className="absolute top-6 left-6 z-10 glass-morphism p-6 rounded-3xl w-80 text-white shadow-2xl transition-all duration-500 max-h-[90vh] overflow-y-auto">
        {/* Header con Perfil de Usuario */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Navigation className="text-brand-primary" size={24} />
            AllRide
          </h1>
          {currentUser ? (
            <button onClick={logout} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-rose-400 transition-colors">
              <LogOut size={18} />
            </button>
          ) : (
            <button onClick={() => setIsAuthOpen(true)} className="p-2 bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 rounded-full transition-colors">
              <User size={18} />
            </button>
          )}
        </div>

        {currentUser && (
          <div className="mb-6 p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                {currentUser.fullName[0]}
              </div>
              <div>
                <p className="text-sm font-bold flex items-center gap-1">
                  {currentUser.fullName}
                  {currentUser.isVerified && <ShieldCheck size={14} className="text-brand-primary" />}
                </p>
                <p className="text-[10px] text-slate-400">{currentUser.email}</p>
              </div>
            </div>
          </div>
        )}
        
        {!isPublishing && !isSimulating ? (
          <div className="space-y-6">
            <div className="flex gap-2">
              <button onClick={() => setIsPublishing(true)} className="flex-1 py-3 bg-brand-primary hover:bg-brand-secondary transition-all rounded-xl font-semibold flex items-center justify-center gap-2">
                <Car size={18} /> Publicar
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Viajes Disponibles</h2>
              {availableRides.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No hay viajes activos.</p>
              ) : (
                availableRides.map((ride, idx) => (
                  <div key={idx} onClick={() => calculateAndShowRoute({lng: ride.originLng, lat: ride.originLat} as any, {lng: ride.destLng, lat: ride.destLat} as any)} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-brand-primary/50 transition-all cursor-pointer">
                    <p className="text-sm font-bold flex items-center gap-1">
                      {ride.driver.fullName}
                      {ride.driver.isVerified && <ShieldCheck size={12} className="text-brand-primary" />}
                    </p>
                    <div className="flex justify-between mt-1">
                      <p className="text-[10px] text-slate-400">{(ride.distance / 1000).toFixed(1)} km</p>
                      <p className="text-sm font-bold text-emerald-400">${ride.pricePerSeat}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : isSimulating ? (
          <div className="p-4 bg-brand-primary/20 rounded-xl border border-brand-primary/30 animate-pulse text-center">
             <Car className="mx-auto mb-2 text-brand-primary" size={32} />
             <p className="text-sm font-bold">Viaje en curso...</p>
             <p className="text-xs text-slate-400">Siguiendo trayectoria GPS</p>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <MapPin size={18} className={origin ? 'text-emerald-400' : 'text-slate-500'} />
                  <span className="text-sm truncate">{origin ? 'Origen fijado' : 'Fijar Origen'}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <MapPin size={18} className={destination ? 'text-rose-400' : 'text-slate-500'} />
                  <span className="text-sm truncate">{destination ? 'Destino fijado' : 'Fijar Destino'}</span>
                </div>
             </div>

            {routeInfo && (
              <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Distancia</span>
                  <span className="font-semibold">{(routeInfo.distance / 1000).toFixed(1)} km</span>
                </div>
                <button onClick={startTrackingSimulation} className="w-full mt-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                  <Play size={14} /> Iniciar Simulación GPS
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={() => { setIsPublishing(false); setOrigin(null); setDestination(null); clearRoute(); originMarker.current?.remove(); destMarker.current?.remove(); }} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold transition-colors text-sm">
                Volver
              </button>
              <button onClick={handleConfirmRide} disabled={!destination} className="flex-1 py-3 bg-brand-primary hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm">
                <Send size={16} /> Guardar
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-6 flex items-center gap-2 text-[10px] text-slate-500 border-t border-slate-800 pt-4">
          <Info size={12} />
          <span>AllRide v1.0.0 - Fase 1 Finalizada</span>
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={handleAuthSuccess} 
      />
    </div>
  );
};

export default MapboxView;
