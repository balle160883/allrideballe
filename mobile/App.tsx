import React, { useEffect } from 'react';
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/AppNavigator';
import { SyncTask } from './src/utils/SyncTask';

export default function App() {
  useEffect(() => {
    SyncTask.registerSyncTask();
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
