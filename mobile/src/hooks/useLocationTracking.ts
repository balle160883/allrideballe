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
    if (user) {
      startTracking();
    } else {
      stopTracking();
    }
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

// Register background task
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      try {
        const activeViajeId = await SecureStore.getItemAsync('active_viaje_id');
        if (activeViajeId) {
          await api.post('/transporte/viajes/location', {
            viaje_id: Number(activeViajeId),
            latitud: location.coords.latitude,
            longitud: location.coords.longitude,
            velocidad: location.coords.speed || 0,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error updating location background:', err);
      }
    }
  }
});
