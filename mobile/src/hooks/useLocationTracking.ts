import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/backend';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

const LOCATION_TRACKING_TASK = 'LOCATION_TRACKING_TASK';

export function useLocationTracking() {
  const { user } = useAuth();

  useEffect(() => {
    const setupTracking = async () => {
      if (user) {
        if (user.rol === 'conductor') {
          try {
            // Check if there is already an active viaje
            const activeViajeId = await SecureStore.getItemAsync('active_viaje_id');
            if (!activeViajeId) {
              // Fetch latest viajes for the conductor
              const viajes = await api.get('/transporte/viajes');
              // Find the first programmed or in-progress trip
              const currentViaje = viajes.find((v: any) => v.estado === 'en_ruta' || v.estado === 'programado');
              if (currentViaje) {
                await SecureStore.setItemAsync('active_viaje_id', currentViaje.id.toString());
                console.log('[useLocationTracking] Auto-assigned active_viaje_id:', currentViaje.id);
              } else {
                console.log('[useLocationTracking] No active viajes found. Waiting for a trip to be assigned.');
              }
            }
          } catch (err: any) {
            console.error('[useLocationTracking] Error fetching trips to auto-assign:', err.message);
          }
        }
        await startTracking();
      } else {
        await stopTracking();
      }
    };

    setupTracking();
  }, [user]);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permission to access location was denied');
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
       console.log('Background location permission denied');
    }

    await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 20000, // 20 seconds
      distanceInterval: 10, // 10 meters
      deferredUpdatesInterval: 20000,
      foregroundService: {
        notificationTitle: 'Pro Mobile Seguimiento',
        notificationBody: 'Rastreo de ubicación en tiempo real activo para la ruta.',
      },
    });
  };

  const stopTracking = async () => {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
    }
  };
}
