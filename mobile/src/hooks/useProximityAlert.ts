import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Viaje, Parada } from './useVisitas';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/backend';
import { scheduleLocalNotification } from '../utils/PushNotifications';

const PROXIMITY_THRESHOLD = 800; // 800 meters
const COOLDOWN_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds
const LOCATION_POLL_INTERVAL = 30000; // 30 seconds

export function useProximityAlert(viajes: Viaje[], onNavigate: (viaje: Viaje) => void) {
  const lastAlertedRef = useRef<{ viajeId: number; paradaId: string; time: number } | null>(null);
  const onNavigateRef = useRef(onNavigate);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  const { proximityAlertsEnabled } = useAuth();
  const [latestLocations, setLatestLocations] = useState<any[]>([]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLatestLocations = async () => {
    try {
      const data = await api.get('/transporte/locations/latest');
      setLatestLocations(data || []);
    } catch (e) {
      console.error('Error fetching latest locations:', e);
    }
  };

  const getParadaDestino = (viaje: Viaje): Parada | null => {
    if (!viaje.paradas || viaje.paradas.length === 0) return null;
    // Por defecto, la parada destino es la última parada de la ruta
    // En un futuro, se podría almacenar la parada asignada en la reserva
    return viaje.paradas[viaje.paradas.length - 1];
  };

  const checkProximity = () => {
    if (!proximityAlertsEnabled) return;

    const now = Date.now();
    
    for (const viaje of viajes) {
      // Solo monitoreamos viajes que estén en ruta
      if (viaje.viaje_estado !== 'en_ruta') continue;
      
      const paradaDestino = getParadaDestino(viaje);
      if (!paradaDestino) continue;

      // Encontrar la última ubicación del autobús para este viaje
      const busLocation = latestLocations.find(loc => loc.viaje_id === viaje.viaje_id);
      if (!busLocation) continue;

      const distance = calculateDistance(
        Number(busLocation.latitud),
        Number(busLocation.longitud),
        paradaDestino.latitud,
        paradaDestino.longitud
      );
      
      if (distance < PROXIMITY_THRESHOLD) {
        const paradaId = `${viaje.viaje_id}-${paradaDestino.orden}`;
        const lastAlert = lastAlertedRef.current;
        
        // Si es un viaje distinto, parada distinta, o ha pasado suficiente tiempo
        if (!lastAlert || 
            lastAlert.viajeId !== viaje.viaje_id || 
            lastAlert.paradaId !== paradaId || 
            (now - lastAlert.time > COOLDOWN_TIME)) {
          
          const distanciaKm = (distance / 1000).toFixed(1);
          const title = '🚌 Autobús Cercano';
          const body = `El autobús de la ruta "${viaje.ruta_nombre}" está a ${distanciaKm} km de tu parada "${paradaDestino.nombre}". ¡Prepárate para abordar!`;
          
          // Enviar notificación push local con deep link
          scheduleLocalNotification(title, body, 1, `promobile://viaje/${viaje.viaje_id}`);
          
          // También mostrar alerta in-app por si la app está abierta
          Alert.alert(
            title,
            body,
            [
              { text: 'Cerrar' },
              { text: 'Ver Detalle', onPress: () => onNavigateRef.current(viaje) }
            ]
          );
          
          lastAlertedRef.current = { viajeId: viaje.viaje_id, paradaId, time: now };
          break; 
        }
      }
    }
  };

  useEffect(() => {
    if (!proximityAlertsEnabled) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Fetch inicial
    fetchLatestLocations();
    
    // Iniciar polling
    pollIntervalRef.current = setInterval(() => {
      fetchLatestLocations();
    }, LOCATION_POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [proximityAlertsEnabled]);

  useEffect(() => {
    // Verificar proximidad cada vez que se actualizan las ubicaciones o los viajes
    if (latestLocations.length > 0) {
      checkProximity();
    }
  }, [latestLocations, viajes]);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
