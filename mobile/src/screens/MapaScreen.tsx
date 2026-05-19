import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Platform, Linking, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import Mapbox from '@rnmapbox/maps';
import { useVisitas, Visita } from '../hooks/useVisitas';
import { useDirections } from '../hooks/useDirections';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZGpiYjE2MDg4MyIsImEiOiJjbW4zY2o0dTUwOGdxMnFvYmJwZ2xzbnUwIn0.Yv7408j9tAieaX-YB-vAwg';
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

export default function MapaScreen({ navigation }: any) {
  const { visitas } = useVisitas();
  const { route, fetchRoute, clearRoute, loading: routeLoading } = useDirections();
  const [userLocation, setUserLocation] = useState<number[] | null>(null);
  const [selectedVisita, setSelectedVisita] = useState<Visita | null>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation([location.coords.longitude, location.coords.latitude]);
    })();
  }, []);

  const handleSelectVisita = (visita: Visita) => {
    setSelectedVisita(visita);
    if (userLocation && visita.latitud && visita.longitud) {
       fetchRoute(userLocation, [visita.longitud, visita.latitud]);
       cameraRef.current?.setCamera({
          centerCoordinate: [visita.longitud, visita.latitud],
          zoomLevel: 14,
          animationDuration: 1000
       });
    }
  };

  const handleCloseDetail = () => {
    setSelectedVisita(null);
    clearRoute();
  };

  const startTurnByTurn = async (visita: Visita) => {
    const { latitud, longitud, domicilio, colonia } = visita;
    
    const wazeUrl = latitud && longitud 
      ? `https://waze.com/ul?ll=${latitud},${longitud}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(`${domicilio}, ${colonia || ''}`)}&navigate=yes`;

    const googleMapsUrl = latitud && longitud
      ? `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${domicilio}, ${colonia || ''}`)}`;

    try {
      const canOpenWaze = await Linking.canOpenURL('waze://');
      if (canOpenWaze) {
        await Linking.openURL(wazeUrl);
      } else {
        await Linking.openURL(googleMapsUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir la aplicación de navegación.');
    }
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false} styleURL={Mapbox.StyleURL.Light}>
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={userLocation ? 12 : 5}
          centerCoordinate={userLocation || [-102.5528, 23.6345]}
          followUserLocation={!selectedVisita && !!userLocation}
        />
        
        <Mapbox.UserLocation />

        {/* Marcadores Reales */}
        {visitas.map((v) => (
           v.latitud && v.longitud ? (
             <Mapbox.MarkerView
               key={v.id}
               id={v.id}
               coordinate={[v.longitud, v.latitud]}
             >
               <TouchableOpacity 
                 style={styles.marker}
                 onPress={() => handleSelectVisita(v)}
               >
                  <MaterialCommunityIcons 
                    name="map-marker" 
                    size={36} 
                    color={v.tipo === 'Socio' ? Colors.primary : Colors.accent} 
                  />
               </TouchableOpacity>
             </Mapbox.MarkerView>
           ) : null
        ))}

        {/* Capa de Ruta */}
        {route && (
          <Mapbox.ShapeSource id="routeSource" shape={route}>
            <Mapbox.LineLayer
              id="routeFill"
              style={{
                lineColor: Colors.primary,
                lineCap: 'round',
                lineWidth: 5,
                lineOpacity: 0.8,
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {selectedVisita && (
        <View style={styles.visitaInfo}>
           <View style={styles.visitaHeader}>
              <Text style={styles.visitaTipo}>{selectedVisita.tipo}</Text>
              <TouchableOpacity onPress={handleCloseDetail}>
                 <MaterialCommunityIcons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
           </View>
           <Text style={styles.visitaNombre}>{selectedVisita.nombre}</Text>
           <Text style={styles.visitaColonia}>Colonia: {selectedVisita.colonia}</Text>
           <Text style={styles.visitaMora}>Mora: ${selectedVisita.saldoAlDia.toFixed(2)}</Text>
           
           <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.navButton} 
                onPress={() => startTurnByTurn(selectedVisita)}
              >
                {routeLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                      <MaterialCommunityIcons name="navigation-variant" color="#fff" size={20} />
                      <Text style={styles.navButtonText}>GPS</Text>
                    </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.navButton, { backgroundColor: Colors.success, flex: 2 }]} 
                onPress={() => navigation.navigate('VisitasTab', { screen: 'DetalleVisita', params: { visita: selectedVisita } })}
              >
                <MaterialCommunityIcons name="clipboard-text-outline" color="#fff" size={20} />
                <Text style={styles.navButtonText}>Realizar Gestión</Text>
              </TouchableOpacity>
           </View>
        </View>
      )}

      {!selectedVisita && (
         <View style={styles.legend}>
            <Text style={styles.legendText}>{visitas.length} visitas disponibles</Text>
         </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitaInfo: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  visitaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  visitaTipo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  visitaNombre: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  visitaColonia: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  visitaMora: {
    fontSize: 18,
    color: Colors.error,
    fontWeight: 'bold',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  navButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    height: 54,
    borderRadius: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  legend: {
    position: 'absolute',
    top: Spacing.xl + 20,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  legendText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  }
});
