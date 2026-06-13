import React, { useEffect } from 'react';
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/AppNavigator';
import { SyncTask } from './src/utils/SyncTask';
import { usePushNotifications } from './src/utils/PushNotifications';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import { api } from './src/api/backend';

const LOCATION_TRACKING_TASK = 'LOCATION_TRACKING_TASK';

// Registrar la tarea en segundo plano en el scope global del entry point
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('[BackgroundLocationTask] Error:', error);
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
        console.error('[BackgroundLocationTask] Error updating location background:', err);
      }
    }
  }
});

export default function App() {
  const { expoPushToken, notification } = usePushNotifications();

  useEffect(() => {
    SyncTask.registerSyncTask();
    
    if (expoPushToken) {
      console.log('Push Token registrado:', expoPushToken);
      // Aquí podrías enviar el token al backend para almacenarlo
    }
  }, [expoPushToken]);

  useEffect(() => {
    if (notification) {
      console.log('Notificación recibida:', notification);
    }
  }, [notification]);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
