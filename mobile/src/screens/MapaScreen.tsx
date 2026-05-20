import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Linking, ActivityIndicator, ScrollView } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import Mapbox from '@rnmapbox/maps';
import { useViajes, Viaje, Parada } from '../hooks/useVisitas';
import { useDirections } from '../hooks/useDirections';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZGpiYjE2MDg4MyIsImEiOiJjbW4zY2o0dTUwOGdxMnFvYmJwZ2xzbnUwIn0.Yv7408j9tAieaX-YB-vAwg';
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

export default function MapaScreen({ navigation }: any) {
  const { viajes } = useViajes();
  const { user } = useAuth();
  const { route, fetchRoute, clearRoute, loading: routeLoading } = useDirections();
  const [userLocation, setUserLocation] = useState<number[] | null>(null);
  const [selectedViaje, setSelectedViaje] = useState<Viaje | null>(null);
  const [selectedParada, setSelectedParada] = useState<Parada | null>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);

  const isConductor = user?.rol === 'conductor';
  const viajesActivos = viajes.filter(v => v.viaje_estado === 'en_ruta' || v.viaje_estado === 'programado');
  const viajeActivo = viajesActivos[0] || null;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation([location.coords.longitude, location.coords.latitude]);
    })();
  }, []);

  useEffect(() => {
    if (viajeActivo && !selectedViaje) {
      setSelectedViaje(viajeActivo);
    }
  }, [viajeActivo]);

  const handleSelectParada = (parada: Parada, viaje: Viaje) => {
    setSelectedParada(parada);
    if (userLocation && parada.latitud && parada.longitud) {
       fetchRoute(userLocation, [parada.longitud, parada.latitud]);
       cameraRef.current?.setCamera({
          centerCoordinate: [parada.longitud, parada.latitud],
          zoomLevel: 14,
          animationDuration: 1000
       });
    }
  };

  const handleCloseDetail = () => {
    setSelectedParada(null);
    clearRoute();
  };

  const startNavigation = async (parada: Parada) => {
    const lat = parada.latitud;
    const lng = parada.longitud;
    
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

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

  const irADetalleViaje = (viaje: Viaje) => {
    navigation.navigate('VisitasTab', { screen: 'DetalleVisita', params: { visita: viaje } });
  };

  const getMarkerColor = (estado: string) => {
    switch (estado) {
      case 'en_ruta': return Colors.success;
      case 'programado': return Colors.primary;
      case 'completado': return Colors.secondary;
      default: return Colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false} styleURL={Mapbox.StyleURL.Dark}>
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={userLocation ? 12 : 5}
          centerCoordinate={userLocation || [-103.3496, 20.6736]}
          followUserLocation={!selectedParada && !!userLocation}
        />
        
        <Mapbox.UserLocation />

        {/* Marcadores de Paradas */}
        {selectedViaje && selectedViaje.paradas && selectedViaje.paradas.map((parada, index) => (
          <Mapbox.MarkerView
            key={`parada-${parada.orden}-${selectedViaje.id}`}
            id={`parada-${parada.orden}-${selectedViaje.id}`}
            coordinate={[parada.longitud, parada.latitud]}
          >
            <TouchableOpacity 
              style={[styles.markerParada, selectedParada?.orden === parada.orden && styles.markerParadaActiva]}
              onPress={() => handleSelectParada(parada, selectedViaje)}
            >
              <Text style={[styles.markerParadaText, selectedParada?.orden === parada.orden && styles.markerParadaTextActiva]}>
                {parada.orden}
              </Text>
            </TouchableOpacity>
          </Mapbox.MarkerView>
        ))}

        {/* Marcadores de Viajes (solo si no hay viaje seleccionado) */}
        {!selectedViaje && viajes.map((v) => {
          const primeraParada = v.paradas?.[0];
          if (!primeraParada) return null;
          return (
            <Mapbox.MarkerView
              key={v.id}
              id={v.id}
              coordinate={[primeraParada.longitud, primeraParada.latitud]}
            >
              <TouchableOpacity 
                style={styles.markerBus}
                onPress={() => setSelectedViaje(v)}
              >
                <MaterialCommunityIcons 
                  name="bus" 
                  size={28} 
                  color={getMarkerColor(v.viaje_estado)} 
                />
              </TouchableOpacity>
            </Mapbox.MarkerView>
          );
        })}

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

      {/* Panel de selección de viaje (para conductor) */}
      {isConductor && (
        <View style={styles.viajeSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {viajesActivos.length === 0 ? (
              <View style={styles.noViajes}>
                <Text style={styles.noViajesText}>No hay viajes activos</Text>
              </View>
            ) : (
              viajesActivos.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.viajeChip, selectedViaje?.id === v.id && styles.viajeChipActivo]}
                  onPress={() => setSelectedViaje(v)}
                >
                  <MaterialCommunityIcons 
                    name="bus" 
                    size={18} 
                    color={selectedViaje?.id === v.id ? '#fff' : Colors.primary} 
                  />
                  <Text style={[styles.viajeChipText, selectedViaje?.id === v.id && styles.viajeChipTextActivo]}>
                    {v.ruta_nombre}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Lista de paradas (para conductor) */}
      {isConductor && selectedViaje && (
        <View style={styles.listaParadas}>
          <View style={styles.listaHeader}>
            <Text style={styles.listaTitulo}>Paradas de la ruta</Text>
            <TouchableOpacity 
              style={styles.verDetalleBtn}
              onPress={() => irADetalleViaje(selectedViaje)}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={18} color="#fff" />
              <Text style={styles.verDetalleBtnText}>Escanear QR</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paradasScroll}>
            {selectedViaje.paradas?.map((parada, index) => (
              <TouchableOpacity
                key={parada.orden}
                style={[styles.paradaCard, selectedParada?.orden === parada.orden && styles.paradaCardActiva]}
                onPress={() => handleSelectParada(parada, selectedViaje)}
              >
                <View style={[styles.paradaNumero, selectedParada?.orden === parada.orden && styles.paradaNumeroActiva]}>
                  <Text style={[styles.paradaNumeroText, selectedParada?.orden === parada.orden && styles.paradaNumeroTextActiva]}>
                    {parada.orden}
                  </Text>
                </View>
                <Text style={[styles.paradaNombre, selectedParada?.orden === parada.orden && styles.paradaNombreActiva]} numberOfLines={2}>
                  {parada.nombre}
                </Text>
                <TouchableOpacity
                  style={styles.paradaNavBtn}
                  onPress={() => startNavigation(parada)}
                >
                  <MaterialCommunityIcons name="navigation" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Panel de detalle de parada */}
      {selectedParada && (
        <View style={styles.paradaInfo}>
           <View style={styles.paradaInfoHeader}>
              <View style={styles.paradaInfoTituloRow}>
                <MaterialCommunityIcons name="map-marker" size={24} color={Colors.primary} />
                <Text style={styles.paradaInfoTitulo}>Parada #{selectedParada.orden}</Text>
              </View>
              <TouchableOpacity onPress={handleCloseDetail}>
                 <MaterialCommunityIcons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
           </View>
           <Text style={styles.paradaInfoNombre}>{selectedParada.nombre}</Text>
           
           <View style={styles.paradaActionButtons}>
              <TouchableOpacity 
                style={styles.navButton} 
                onPress={() => startNavigation(selectedParada)}
              >
                {routeLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                      <MaterialCommunityIcons name="navigation-variant" color="#fff" size={20} />
                      <Text style={styles.navButtonText}>Navegar</Text>
                    </>
                )}
              </TouchableOpacity>

              {isConductor && selectedViaje && (
                <TouchableOpacity 
                  style={[styles.navButton, { backgroundColor: Colors.success, flex: 2 }]} 
                  onPress={() => {
                    handleCloseDetail();
                    irADetalleViaje(selectedViaje);
                  }}
                >
                  <MaterialCommunityIcons name="qrcode-scan" color="#fff" size={20} />
                  <Text style={styles.navButtonText}>Escanear QR</Text>
                </TouchableOpacity>
              )}
           </View>
        </View>
      )}

      {/* Leyenda (si no hay detalles) */}
      {!selectedParada && !isConductor && (
         <View style={styles.legend}>
            <Text style={styles.legendText}>{viajes.length} viajes registrados</Text>
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
  markerBus: {
    width: 50,
    height: 50,
    backgroundColor: 'white',
    borderRadius: 25,
    borderWidth: 3,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  markerParada: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerParadaActiva: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  markerParadaText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.secondary,
  },
  markerParadaTextActiva: {
    color: Colors.primary,
  },
  viajeSelector: {
    position: 'absolute',
    top: Spacing.xl + 10,
    left: Spacing.md,
    right: Spacing.md,
  },
  noViajes: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  noViajesText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  viajeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: 20,
    marginRight: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  viajeChipActivo: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  viajeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  viajeChipTextActivo: {
    color: '#fff',
  },
  listaParadas: {
    position: 'absolute',
    top: Spacing.xl + 70,
    left: 0,
    right: 0,
  },
  listaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  listaTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verDetalleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 12,
  },
  verDetalleBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  paradasScroll: {
    paddingLeft: Spacing.md,
  },
  paradaCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.sm,
    marginRight: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    width: 140,
    alignItems: 'center',
  },
  paradaCardActiva: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  paradaNumero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  paradaNumeroActiva: {
    backgroundColor: Colors.primary,
  },
  paradaNumeroText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.secondary,
  },
  paradaNumeroTextActiva: {
    color: '#fff',
  },
  paradaNombre: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    flex: 1,
  },
  paradaNombreActiva: {
    color: Colors.primary,
  },
  paradaNavBtn: {
    marginTop: 6,
    padding: 6,
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
  },
  paradaInfo: {
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
  paradaInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paradaInfoTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paradaInfoTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  paradaInfoNombre: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
  },
  paradaActionButtons: {
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
    gap: 8,
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
