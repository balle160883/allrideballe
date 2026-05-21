import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Linking, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import Mapbox from '@rnmapbox/maps';
import { useViajes, Viaje, Parada } from '../hooks/useVisitas';
import { useDirections } from '../hooks/useDirections';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/backend';

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

  // SOS Emergency States
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [sosType, setSosType] = useState<'sos' | 'acoso' | null>(null);
  const [countdown, setCountdown] = useState(3);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const startSosCountdown = (type: 'sos' | 'acoso') => {
    setSosType(type);
    setCountdown(3);
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          triggerEmergencyReport(type);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSos = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSosType(null);
    setCountdown(3);
  };

  const triggerEmergencyReport = async (type: 'sos' | 'acoso') => {
    try {
      let lat = userLocation ? userLocation[1] : 20.6736;
      let lng = userLocation ? userLocation[0] : -103.3496;
      
      try {
        const freshLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = freshLoc.coords.latitude;
        lng = freshLoc.coords.longitude;
      } catch (err) {
        console.log('Error getting fresh location, using userLocation state:', err);
      }

      const activeTripId = selectedViaje?.id || viajeActivo?.id || null;

      await api.post('/transporte/alertas', {
        viaje_id: activeTripId,
        tipo: type,
        descripcion: type === 'sos' 
          ? `🔴 ALERTA DE EMERGENCIA (SOS) iniciada por el ${isConductor ? 'conductor' : 'pasajero'}.`
          : `⚠️ REPORTAR ACOSO/HOSTIGAMIENTO por el ${isConductor ? 'conductor' : 'pasajero'}.`,
        latitud: lat,
        longitud: lng,
        prioridad: 'alta',
      });

      Alert.alert(
        type === 'sos' ? '🚨 Alerta SOS Enviada' : '⚠️ Alerta de Acoso Enviada',
        'La central de emergencias ha recibido tu ubicación y reporte. Mantén la calma, la ayuda está en camino.'
      );
    } catch (error: any) {
      console.error('Error reporting emergency:', error);
      Alert.alert('Error', 'No se pudo enviar la alerta. Por favor, intenta de nuevo o llama al número de emergencias.');
    } finally {
      setSosModalVisible(false);
      setSosType(null);
    }
  };

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
    
    const wazeNativeUrl = `waze://ul?ll=${lat},${lng}&navigate=yes`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    try {
      // 1. Intentamos verificar si podemos abrir la app nativa de Waze
      const canOpenWaze = await Linking.canOpenURL('waze://');
      if (canOpenWaze) {
        await Linking.openURL(wazeNativeUrl);
      } else {
        // 2. Si canOpenWaze da falso negativo debido a políticas de visibilidad de paquetes en Android 11+,
        // intentamos forzar la apertura de la url nativa de Waze.
        try {
          await Linking.openURL(wazeNativeUrl);
        } catch {
          // 3. Fallback final: Abrir Google Maps si Waze no está instalado o falla
          await Linking.openURL(googleMapsUrl);
        }
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

      {/* Botón Flotante de SOS/Emergencia */}
      <TouchableOpacity 
        style={[styles.sosButton, { bottom: selectedParada ? 280 : 160 }]} 
        onPress={() => setSosModalVisible(true)}
      >
        <MaterialCommunityIcons name="alert-decagram" size={32} color="#fff" />
        <Text style={styles.sosButtonText}>SOS</Text>
      </TouchableOpacity>

      {/* Modal de Emergencia y Reporte de Acoso */}
      <Modal
        visible={sosModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelSos}
      >
        <View style={styles.modalOverlay}>
          {sosType === null ? (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons name="shield-alert" size={48} color={Colors.error} />
                <Text style={styles.modalTitle}>Centro de Seguridad</Text>
                <Text style={styles.modalSubtitle}>¿Qué tipo de situación deseas reportar?</Text>
              </View>

              <TouchableOpacity 
                style={[styles.emergencyOption, styles.sosOption]} 
                onPress={() => startSosCountdown('sos')}
              >
                <MaterialCommunityIcons name="alert-octagon" size={32} color="#fff" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>EMERGENCIA SOS</Text>
                  <Text style={styles.optionSubtitle}>Accidente, problema médico o amenaza directa</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.emergencyOption, styles.acosoOption]} 
                onPress={() => startSosCountdown('acoso')}
              >
                <MaterialCommunityIcons name="hand-back-right" size={32} color="#fff" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>REPORTAR ACOSO</Text>
                  <Text style={styles.optionSubtitle}>Hostigamiento, acoso o violencia verbal/física</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.closeModalButton} 
                onPress={() => setSosModalVisible(false)}
              >
                <Text style={styles.closeModalButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.countdownContent}>
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownNumber}>{countdown}</Text>
              </View>
              <Text style={styles.countdownTitle}>ENVIANDO REPORTE EN...</Text>
              <Text style={[
                styles.countdownType, 
                sosType === 'sos' ? { color: Colors.error } : { color: Colors.accent }
              ]}>
                {sosType === 'sos' ? 'EMERGENCIA SOS' : 'REPORTE DE ACOSO'}
              </Text>
              <Text style={styles.countdownInstruction}>
                Tu ubicación y datos de viaje serán compartidos con la central en tiempo real.
              </Text>

              <TouchableOpacity 
                style={styles.cancelSosButton} 
                onPress={cancelSos}
              >
                <MaterialCommunityIcons name="close-circle" size={24} color="#fff" />
                <Text style={styles.cancelSosButtonText}>CANCELAR ALERTA</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
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
  },
  sosButton: {
    position: 'absolute',
    right: Spacing.md,
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  sosButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 24,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  emergencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sosOption: {
    backgroundColor: '#dc2626',
  },
  acosoOption: {
    backgroundColor: Colors.accent,
  },
  optionTextContainer: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  optionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  optionSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  closeModalButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    width: '100%',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeModalButtonText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  countdownContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  countdownBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  countdownNumber: {
    color: '#ffffff',
    fontSize: 64,
    fontWeight: '900',
  },
  countdownTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  countdownType: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: Spacing.md,
  },
  countdownInstruction: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  cancelSosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  cancelSosButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  }
});
