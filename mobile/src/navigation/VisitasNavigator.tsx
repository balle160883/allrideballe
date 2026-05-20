import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VisitasScreen from '../screens/VisitasScreen';
import DetalleVisitaScreen from '../screens/DetalleVisitaScreen';
import RegistroVisitaScreen from '../screens/RegistroVisitaScreen';
import { Colors } from '../constants/theme';

const Stack = createNativeStackNavigator();

export default function VisitasNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="VisitasList" 
        component={VisitasScreen} 
        options={{ title: 'Mis Viajes' }} 
      />
      <Stack.Screen 
        name="DetalleVisita" 
        component={DetalleVisitaScreen} 
        options={{ title: 'Detalle del Viaje' }} 
      />
      <Stack.Screen 
        name="RegistroVisita" 
        component={RegistroVisitaScreen} 
        options={{ title: 'Escanear / Alertas' }} 
      />
    </Stack.Navigator>
  );
}
