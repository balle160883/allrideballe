import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { routeApi } from '../../services/api';
import { Navigation, Car, Play, User, LogOut, ShieldCheck, Search, Star, Wallet, Plus } from 'lucide-react';
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
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'carpool' | 'shuttle' | 'taxi'>('carpool');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [balance, setBalance] = useState(1250.50);

  const handleTopUp = () => {
    setBalance(prev => prev + 500);
  };

  const originMarker = useRef<mapboxgl.Marker | null>(null);
  const destMarker = useRef<mapboxgl.Marker | null>(null);
  const vehicleMarker = useRef<mapboxgl.Marker | null>(null);
  const ghostMarkers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const rideMarkers = useRef<mapboxgl.Marker[]>([]);

  const simulateNearbyDrivers = () => {
    const center = mapRef.current?.getCenter() || new mapboxgl.LngLat(-99.1332, 19.4326);
    const drivers = [
      { id: 'ghost-1', name: 'Carlos', car: 'Model 3', color: '#6366f1' },
      { id: 'ghost-2', name: 'Ana', car: 'Bolt EV', color: '#10b981' },
      { id: 'ghost-3', name: 'Luis', car: 'Mustang Mach-E', color: '#f43f5e' },
      { id: 'ghost-4', name: 'Sofía', car: 'Leaf', color: '#f59e0b' },
    ];

    drivers.forEach(driver => {
      const startLng = center.lng + (Math.random() - 0.5) * 0.02;
      const startLat = center.lat + (Math.random() - 0.5) * 0.02;
      
      const el = document.createElement('div');
      el.innerHTML = `<div style="background: ${driver.color}; width: 24px; height: 24px; border-radius: 6px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; transform: rotate(45deg); box-shadow: 0 0 10px ${driver.color}80; cursor: pointer;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" style="transform: rotate(-45deg)"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.5C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>`;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([startLng, startLat])
        .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`<div style="padding: 4px; color: #1e293b;"><p style="font-weight: 800; font-size: 10px; margin: 0;">${driver.name.toUpperCase()}</p><p style="font-size: 9px; margin: 0; opacity: 0.7;">${driver.car}</p></div>`))
        .addTo(mapRef.current!);
      
      ghostMarkers.current[driver.id] = marker;

      let currLng = startLng;
      let currLat = startLat;
      setInterval(() => {
        currLng += (Math.random() - 0.5) * 0.00015;
        currLat += (Math.random() - 0.5) * 0.00015;
        marker.setLngLat([currLng, currLat]);
      }, 1500);
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    socketRef.current = io(SOCKET_URL);
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-99.1332, 19.4326],
      zoom: 12,
      pitch: 45,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    mapRef.current.on('load', () => {
      setupLayers();
      loadAvailableRides();
      simulateNearbyDrivers();
    });

    mapRef.current.on('click', (e) => {
      if (isPublishing) handleMapClick(e.lngLat);
    });

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
      paint: { 'line-color': '#6366f1', 'line-width': 5, 'line-opacity': 0.8 }
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const resp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&language=es`
      );
      const data = await resp.json();
      setSuggestions(data.features || []);
    } catch (err) { console.error(err); }
  };

  const selectSuggestion = (feature: any) => {
    const coords = feature.center;
    const lngLat = new mapboxgl.LngLat(coords[0], coords[1]);
    setSearchQuery(feature.place_name);
    setSuggestions([]);
    mapRef.current?.flyTo({ center: coords, zoom: 15, duration: 2000 });

    if (!origin) {
      setOrigin(lngLat);
      if (originMarker.current) originMarker.current.remove();
      originMarker.current = new mapboxgl.Marker({ color: '#10b981' }).setLngLat(lngLat).addTo(mapRef.current!);
    } else {
      setDestination(lngLat);
      if (destMarker.current) destMarker.current.remove();
      destMarker.current = new mapboxgl.Marker({ color: '#f43f5e' }).setLngLat(lngLat).addTo(mapRef.current!);
      calculateAndShowRoute(origin, lngLat);
    }
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
      setShowBottomSheet(true);
    } catch (error) { console.error(error); }
  };

  const clearRoute = () => {
    const source = mapRef.current?.getSource('route') as mapboxgl.GeoJSONSource;
    source?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
    setRouteInfo(null);
    setShowBottomSheet(false);
  };

  const handleConfirmRide = async () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setShowBottomSheet(false);
    setIsPublishing(false);
    loadAvailableRides();
    startTrackingSimulation();
  };

  const startTrackingSimulation = () => {
    if (!routeInfo || !routeInfo.geometry) return;
    setIsSimulating(true);
    const coordinates = routeInfo.geometry.coordinates;
    let step = 0;

    const el = document.createElement('div');
    el.innerHTML = '<div style="background: #6366f1; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 0 20px rgba(99, 102, 241, 0.8);"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.5C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>';

    vehicleMarker.current = new mapboxgl.Marker(el).setLngLat(coordinates[0]).addTo(mapRef.current!);
    socketRef.current?.emit('startRide', routeInfo.id);

    const animate = () => {
      if (step >= coordinates.length) { setIsSimulating(false); return; }
      const currentCoords = coordinates[step];
      vehicleMarker.current?.setLngLat(currentCoords);
      socketRef.current?.emit('updateLocation', { rideId: routeInfo.id, location: currentCoords, bearing: 0 });
      mapRef.current?.easeTo({ center: currentCoords, zoom: 17, duration: 200, pitch: 65 });
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
    <div className="relative w-full h-screen bg-[#020617] overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0" />
      
      {/* Header flotante estilo AllRide */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-slate-900/90 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/10 shadow-2xl scale-90 sm:scale-100">
        {[
          { id: 'carpool', label: 'Carpool', icon: Car },
          { id: 'shuttle', label: 'Van', icon: Navigation },
          { id: 'taxi', label: 'Taxi', icon: Play },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              selectedCategory === cat.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <cat.icon size={16} />
            {cat.label}
          </button>
        ))}
      </div>

      <div className={`absolute top-6 left-6 z-10 glass-morphism p-6 rounded-3xl w-80 text-white shadow-2xl transition-all duration-500 max-h-[90vh] overflow-y-auto ${showBottomSheet ? 'opacity-40 pointer-events-none scale-95 -translate-x-4' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black flex items-center gap-2 tracking-tighter">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Navigation size={18} fill="white" />
            </div>
            ALLRIDE
          </h1>
          {currentUser ? (
            <button onClick={logout} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-rose-400 transition-colors">
              <LogOut size={18} />
            </button>
          ) : (
            <button onClick={() => setIsAuthOpen(true)} className="p-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-full transition-colors">
              <User size={18} />
            </button>
          )}
        </div>

        <div className="mb-6 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="¿A dónde vas?" 
            className="w-full bg-slate-800/40 border border-white/5 rounded-2xl py-4 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500"
          />

          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left p-4 hover:bg-white/5 border-b border-white/5 last:border-none transition-colors"
                >
                  <p className="text-sm font-bold truncate">{s.text}</p>
                  <p className="text-[10px] text-slate-500 truncate">{s.place_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {currentUser && (
          <div className="space-y-4">
            {/* Perfil */}
            <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold shadow-lg">
                  {currentUser.fullName[0]}
                </div>
                <div>
                  <p className="text-sm font-bold flex items-center gap-1">
                    {currentUser.fullName}
                    {currentUser.isVerified && <ShieldCheck size={14} className="text-emerald-400" />}
                  </p>
                  <p className="text-[10px] text-indigo-300 font-medium uppercase tracking-wider">Miembro Premium</p>
                </div>
              </div>
            </div>

            {/* Wallet Card Premium */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 p-8 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="flex justify-between items-start mb-8">
                   <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                      <Wallet size={20} className="text-indigo-400" />
                   </div>
                   <button onClick={handleTopUp} className="w-8 h-8 bg-indigo-500 hover:bg-indigo-400 rounded-full flex items-center justify-center shadow-lg transition-colors">
                      <Plus size={16} className="text-white" />
                   </button>
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Saldo Disponible</p>
                <p className="text-3xl font-black text-white tracking-tighter">${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                
                <div className="mt-6 flex justify-between items-end">
                   <p className="text-[10px] text-slate-500 font-mono">**** **** **** 8834</p>
                   <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-rose-500/80 blur-[1px]" />
                      <div className="w-6 h-6 rounded-full bg-amber-500/80 blur-[1px]" />
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {!isPublishing && !isSimulating ? (
          <div className="space-y-6">
            <button onClick={() => setIsPublishing(true)} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 transition-all rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20">
              <Play size={18} fill="currentColor" /> Publicar Ruta
            </button>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Rutas Activas</h2>
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
              </div>
              {availableRides.length === 0 ? (
                <div className="p-8 text-center bg-slate-800/10 rounded-2xl border border-dashed border-white/5">
                   <Car size={32} className="mx-auto mb-2 text-slate-700" />
                   <p className="text-xs text-slate-600">No hay conductores en {selectedCategory}</p>
                </div>
              ) : (
                availableRides.map((ride, idx) => (
                  <div key={idx} onClick={() => calculateAndShowRoute({lng: ride.originLng, lat: ride.originLat} as any, {lng: ride.destLng, lat: ride.destLat} as any)} className="p-4 bg-slate-800/30 rounded-2xl border border-white/5 hover:border-indigo-500/50 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold flex items-center gap-1 group-hover:text-indigo-400 transition-colors">
                          {ride.driver.fullName}
                          {ride.driver.isVerified && <ShieldCheck size={12} className="text-emerald-400" />}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{(ride.distance / 1000).toFixed(1)} km • Hoy</p>
                      </div>
                      <p className="text-lg font-black text-white">${ride.pricePerSeat}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : isSimulating ? (
          <div className="p-8 bg-indigo-600/10 rounded-3xl border border-indigo-500/20 text-center space-y-6">
             <div className="relative w-20 h-20 mx-auto">
               <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
               <div className="relative bg-indigo-600 rounded-full w-20 h-20 flex items-center justify-center shadow-2xl shadow-indigo-500/40 border-4 border-white/10">
                  <Car className="text-white" size={36} />
               </div>
             </div>
             <div>
               <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-400">En Tránsito</p>
               <p className="text-[10px] text-slate-400 mt-1 uppercase">Sincronizando GPS...</p>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="space-y-2">
                <div className="flex items-center gap-3 p-4 bg-slate-800/40 rounded-2xl border border-white/5 group hover:border-emerald-500/50 transition-all">
                  <div className={`w-2.5 h-2.5 rounded-full ${origin ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-slate-600'}`} />
                  <span className={`text-xs font-bold ${origin ? 'text-white' : 'text-slate-500'}`}>{origin ? 'Punto A fijado' : 'Fijar Origen'}</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-800/40 rounded-2xl border border-white/5 group hover:border-rose-500/50 transition-all">
                  <div className={`w-2.5 h-2.5 rounded-full ${destination ? 'bg-rose-500 shadow-[0_0_12px_#f43f5e]' : 'bg-slate-600'}`} />
                  <span className={`text-xs font-bold ${destination ? 'text-white' : 'text-slate-500'}`}>{destination ? 'Punto B fijado' : 'Fijar Destino'}</span>
                </div>
             </div>
             <div className="flex gap-2 pt-4">
                <button onClick={() => { setIsPublishing(false); setOrigin(null); setDestination(null); clearRoute(); }} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-xs">Volver</button>
                <button onClick={handleConfirmRide} disabled={!destination} className="flex-[2] py-3 bg-indigo-600 rounded-xl font-bold text-xs disabled:opacity-50">Publicar</button>
             </div>
          </div>
        )}
      </div>

      {/* RIDE CONFIRMATION BOTTOM SHEET */}
      <div className={`absolute bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-white/10 rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] transition-all duration-700 transform ${showBottomSheet ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-4 mb-6" />
        
        <div className="max-w-md mx-auto px-8 pb-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter">Confirmar Viaje</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Categoría: {selectedCategory}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-indigo-400 tracking-tighter">${routeInfo ? ((routeInfo.distance / 1000) * 8.5).toFixed(2) : '0.00'}</p>
              <p className="text-[10px] text-slate-500 font-bold">PRECIO ESTIMADO</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-slate-800/50 rounded-3xl border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
                <User size={24} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-white">Juan Pérez</p>
                <div className="flex items-center gap-1 text-amber-400">
                  <Star size={10} fill="currentColor" />
                  <span className="text-[10px] font-bold">4.9 (120)</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-3xl border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-700 flex items-center justify-center shadow-lg overflow-hidden">
                <Car size={24} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-black text-white">Tesla Model 3</p>
                <p className="text-[10px] text-slate-500 font-bold tracking-widest">ABC-1234</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => setShowBottomSheet(false)} className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-3xl font-black text-sm transition-all">
              CANCELAR
            </button>
            <button onClick={handleConfirmRide} className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black text-sm shadow-2xl shadow-indigo-500/40 transition-all scale-105">
              CONFIRMAR Y PAGAR
            </button>
          </div>
        </div>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={handleAuthSuccess} />
    </div>
  );
};

export default MapboxView;
