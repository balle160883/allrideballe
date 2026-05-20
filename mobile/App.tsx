import React, { useEffect } from 'react';
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/AppNavigator';
import { SyncTask } from './src/utils/SyncTask';
import { usePushNotifications } from './src/utils/PushNotifications';

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
