import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import { HapticFeedback } from '../utils/Haptics';
import { Parada } from './useVisitas';

// Distancia de la geocerca en metros (500 metros)
const GEOFENCE_RADIUS_METERS = 500;
const RESET_RADIUS_METERS = 700; // Distancia para resetear la alerta si el autobús se aleja

function getDistanceMeters(coords1: [number, number], coords2: [number, number]): number {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeofenceAlert(
  busLocation: [number, number] | null,
  paradas: Parada[] | undefined,
  isMuted: boolean = false,
  enabled: boolean = true
) {
  const triggeredParadasRef = useRef<Set<string | number>>(new Set());
  const [nearbyParada, setNearbyParada] = useState<{ parada: Parada; distance: number } | null>(null);

  useEffect(() => {
    if (!enabled || !busLocation || !paradas || paradas.length === 0) {
      setNearbyParada(null);
      return;
    }

    let closest: { parada: Parada; distance: number } | null = null;

    paradas.forEach((parada) => {
      if (!parada.latitud || !parada.longitud) return;

      const paradaCoords: [number, number] = [parada.longitud, parada.latitud];
      const dist = getDistanceMeters(busLocation, paradaCoords);

      if (!closest || dist < closest.distance) {
        closest = { parada, distance: dist };
      }

      const paradaKey = (parada as any).id || parada.orden || parada.nombre;

      // Si el autobús ingresa a la geocerca de 500 metros y no se ha notificado
      if (dist <= GEOFENCE_RADIUS_METERS && !triggeredParadasRef.current.has(paradaKey)) {
        triggeredParadasRef.current.add(paradaKey);

        // Feedback háptico
        HapticFeedback.success();

        // 1. Notificación Push de Proximidad en Segundo Plano (Sonido + Vibración)
        Notifications.scheduleNotificationAsync({
          content: {
            title: '🚌 ¡Tu transporte se aproxima!',
            body: `El vehículo se encuentra a ${(dist).toFixed(0)}m de la parada "${parada.nombre}". Prepárate para abordar.`,
            sound: true,
            vibrate: [0, 250, 250, 250],
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        }).catch(err => console.log('Proximity notification error:', err?.message));

        // 2. Alerta de Voz (TTS)
        if (!isMuted) {
          const text = `Atención: El autobús se aproxima a la parada ${parada.nombre}, a menos de 500 metros.`;
          Speech.speak(text, { language: 'es' });
        }

        // 3. Alerta Popup en pantalla
        Alert.alert(
          '🚌 Autobús Cercano',
          `El autobús se encuentra a ${(dist).toFixed(0)} metros de la parada "${parada.nombre}".`
        );
      }

      // Si el autobús se aleja a más de 700m, permitimos que se vuelva a notificar en el futuro
      if (dist > RESET_RADIUS_METERS && triggeredParadasRef.current.has(paradaKey)) {
        triggeredParadasRef.current.delete(paradaKey);
      }
    });

    if (closest && (closest as any).distance <= GEOFENCE_RADIUS_METERS) {
      setNearbyParada(closest);
    } else {
      setNearbyParada(null);
    }
  }, [busLocation?.[0], busLocation?.[1], paradas, isMuted, enabled]);

  return { nearbyParada };
}
