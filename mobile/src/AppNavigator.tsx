import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from './context/AuthContext';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

import LoginScreen from './screens/LoginScreen';
import MainTabNavigator from './navigation/MainTabNavigator';
import { useLocationTracking } from './hooks/useLocationTracking';
import { usePushNotifications } from './utils/PushNotifications';
import { api } from './api/backend';

const Stack = createNativeStackNavigator();

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'promobile://'],
  config: {
    screens: {
      Main: {
        screens: {
          Mapa: 'viaje/:viajeId',
        },
      },
    },
  },
  async getInitialURL() {
    const response = await Notifications.getLastNotificationResponseAsync();
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string') return url;
    
    return Linking.getInitialURL();
  },
  subscribe(listener: (url: string) => void) {
    const onReceiveURL = ({ url }: { url: string }) => listener(url);
    const subscription = Linking.addEventListener('url', onReceiveURL);

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') {
        listener(url);
      }
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  },
};

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
    <NavigationContainer linking={linking as any}>
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
