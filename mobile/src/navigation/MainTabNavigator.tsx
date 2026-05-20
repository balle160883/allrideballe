import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Navigators
import VisitasNavigator from './VisitasNavigator';

// Screens
import MapaScreen from '../screens/MapaScreen';
import PerfilScreen from '../screens/PerfilScreen';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.secondary, // Cambiado de textMuted a secondary para más contraste
        tabBarStyle: {
           backgroundColor: Colors.background,
           height: 70 + insets.bottom,
           paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
           paddingTop: 10,
           borderTopWidth: 1,
           borderTopColor: Colors.border,
           elevation: 8, // Sombra en Android para profundidad
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
          marginBottom: 5,
        },
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: Colors.primary,
        },
      }}
    >
      <Tab.Screen 
        name="VisitasTab" 
        component={VisitasNavigator} 
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="bus" color={color} size={28} />
          ),
          title: 'Viajes',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="Mapa" 
        component={MapaScreen} 
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="map-marker-radius" color={color} size={28} />
          ),
          title: 'Mapa',
        }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={PerfilScreen} 
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-circle" color={color} size={28} />
          ),
          title: 'Perfil',
        }}
      />
    </Tab.Navigator>
  );
}
