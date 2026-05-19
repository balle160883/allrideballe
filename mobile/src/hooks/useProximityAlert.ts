import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { Visita } from './useVisitas';
import { useAuth } from '../context/AuthContext';

const PROXIMITY_THRESHOLD = 500; // 500 meters
const COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

export function useProximityAlert(visitas: Visita[], onNavigate: (visita: Visita) => void) {
  const lastAlertedRef = useRef<{ id: string; time: number } | null>(null);
  const { proximityAlertsEnabled } = useAuth();

  useEffect(() => {
    if (!proximityAlertsEnabled) return;

    let subscription: Location.LocationSubscription | null = null;

    const checkProximity = (lat: number, lon: number) => {
      const now = Date.now();
      
      for (const visita of visitas) {
        if (visita.latitud && visita.longitud) {
          const distance = calculateDistance(lat, lon, visita.latitud, visita.longitud);
          
          if (distance < PROXIMITY_THRESHOLD) {
            const lastAlert = lastAlertedRef.current;
            
            // Si es una visita distinta O ha pasado suficiente tiempo desde la última alerta para la misma visita
            if (!lastAlert || lastAlert.id !== visita.id || (now - lastAlert.time > COOLDOWN_TIME)) {
              Alert.alert(
                '📍 Visita Cercana',
                `Te encuentras cerca de ${visita.nombre} en la colonia ${visita.colonia}. ¿Deseas realizar esta visita ahora?`,
                [{ text: 'Ignorar' }, { text: 'Ver Detalle', onPress: () => onNavigate(visita) }]
              );
              
              lastAlertedRef.current = { id: visita.id, time: now };
              break; 
            }
          }
        }
      }
    };

    const startWatching = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 50,
        },
        (location) => {
          checkProximity(location.coords.latitude, location.coords.longitude);
        }
      );
    };

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [visitas, proximityAlertsEnabled]);
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
