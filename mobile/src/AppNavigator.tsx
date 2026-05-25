import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from './context/AuthContext';

import LoginScreen from './screens/LoginScreen';
import MainTabNavigator from './navigation/MainTabNavigator';
import { useLocationTracking } from './hooks/useLocationTracking';
import { usePushNotifications } from './utils/PushNotifications';
import { api } from './api/backend';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { expoPushToken } = usePushNotifications();
  useLocationTracking(); // Activa el rastreo GPS

  useEffect(() => {
    if (user && expoPushToken) {
      api.patch('/transporte/usuarios/push-token', { push_token: expoPushToken })
        .then(() => console.log('Push token saved to backend successfully:', expoPushToken))
        .catch(err => console.warn('Error saving push token to backend:', err.message));
    }
  }, [user, expoPushToken]);

  if (loading) return null; // Or a splash screen

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
