import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Linking, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import Mapbox from '@rnmapbox/maps';
import { useViajes, Viaje, Parada } from '../hooks/useVisitas';
import { useDirections } from '../hooks/useDirections';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/backend';
import * as Speech from 'expo-speech';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZGpiYjE2MDg4MyIsImEiOiJjbW4zY2o0dTUwOGdxMnFvYmJwZ2xzbnUwIn0.Yv7408j9tAieaX-YB-vAwg';
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Helper para calcular la distancia en metros entre dos coordenadas [lng, lat]
function getDistance(coords1: number[], coords2: number[]) {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Mapeo de tipos de maniobra de Mapbox a iconos de MaterialCommunityIcons
function getManeuverIcon(type?: string, modifier?: string): string {
  if (!type) return 'navigation-variant';
  if (type === 'arrive') return 'flag-checkered';
  if (type === 'depart') return 'navigation';
  
  switch (modifier) {
    case 'left': return 'arrow-left-bold';
    case 'right': return 'arrow-right-bold';
    case 'slight left': return 'arrow-top-left-bold';
    case 'slight right': return 'arrow-top-right-bold';
    case 'sharp left': return 'arrow-left-bold-box';
    case 'sharp right': return 'arrow-right-bold-box';
    case 'straight': return 'arrow-up-bold';
    case 'uturn': return 'swap-vertical-bold';
    default: return 'navigation-variant';
  }
}

// Proyecta el punto P en el segmento AB
function projectPointOnSegment(p: number[], a: number[], b: number[]) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;

  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) return a;

  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  return [ax + t * dx, ay + t * dy];
}

// Calcula el rumbo (bearing) en grados entre dos puntos [lng, lat]
function getBearing(coords1: number[], coords2: number[]) {
  const [lon1, lat1] = coords1.map(x => x * Math.PI / 180);
  const [lon2, lat2] = coords2.map(x => x * Math.PI / 180);

  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

// Encuentra la coordenada en la ruta más cercana al usuario y calcula el rumbo de ese segmento
function getSnappedInfo(userLoc: number[], routeCoords: number[][]) {
  if (!routeCoords || routeCoords.length < 2) {
    return { snappedPoint: userLoc, bearing: 0 };
  }

  let minDistance = Infinity;
  let snappedPoint = userLoc;
  let closestIndex = 0;

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const a = routeCoords[i];
    const b = routeCoords[i + 1];
    const projected = projectPointOnSegment(userLoc, a, b);
    const dist = getDistance(userLoc, projected);

    if (dist < minDistance) {
      minDistance = dist;
      snappedPoint = projected;
      closestIndex = i;
    }
  }

  // Si el usuario está a más de 50 metros de la ruta, no ajustamos la ubicación
  if (minDistance > 50) {
    return { snappedPoint: userLoc, bearing: 0 };
  }

  const bearing = getBearing(routeCoords[closestIndex], routeCoords[closestIndex + 1]);

  return { snappedPoint, bearing };
}

// Retorna el nombre del icono para indicaciones de carril
function getLaneIcon(indications: string[]): string {
  if (!indications || indications.length === 0) return 'arrow-up';
  const primary = indications[0];
  switch (primary) {
    case 'straight': return 'arrow-up';
    case 'left': return 'arrow-left';
    case 'right': return 'arrow-right';
    case 'slight left': return 'arrow-top-left';
    case 'slight right': return 'arrow-top-right';
    case 'sharp left': return 'arrow-left-bold';
    case 'sharp right': return 'arrow-right-bold';
    case 'uturn': return 'swap-vertical';
    default: return 'arrow-up';
  }
}

export default function MapaScreen({ route: routeProp, navigation }: any) {
  const { viajes } = useViajes();
  const { user } = useAuth();
  const { route, steps, congestion, duration, distance, fetchRoute, clearRoute, loading: routeLoading } = useDirections();
  const [userLocation, setUserLocation] = useState<number[] | null>(null);
  const [selectedViaje, setSelectedViaje] = useState<Viaje | null>(null);
  const [selectedParada, setSelectedParada] = useState<Parada | null>(null);
  const [navigationMode, setNavigationMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [snappedLocation, setSnappedLocation] = useState<number[] | null>(null);
  const [snappedHeading, setSnappedHeading] = useState<number>(0);
  const cameraRef = useRef<Mapbox.Camera>(null);

  const routeGeoJSON = useMemo(() => {
    if (!route || !route.coordinates || route.coordinates.length < 2) {
      return null;
    }

    const features: any[] = [];
    const coords = route.coordinates;
    const hasCongestion = congestion && congestion.length > 0;

    for (let i = 0; i < coords.length - 1; i++) {
      const segCongestion = hasCongestion ? congestion[Math.min(i, congestion.length - 1)] : 'unknown';
      features.push({
        type: 'Feature',
        properties: {
          congestion: segCongestion,
        },
        geometry: {
          type: 'LineString',
          coordinates: [coords[i], coords[i + 1]],
        },
      });
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [route, congestion]);

  const currentStep = steps && steps[currentStepIndex];
  const lanes = currentStep?.intersections?.find((inter: any) => inter.lanes)?.lanes;

  const calculateRemainingStats = () => {
    if (!steps || steps.length === 0 || currentStepIndex >= steps.length) {
      return { distKm: '0.0', timeMin: 0 };
    }

    let remainingMeters = distanceToNextStep;
    for (let i = currentStepIndex + 1; i < steps.length; i++) {
      remainingMeters += steps[i].distance || 0;
    }

    const distKm = (remainingMeters / 1000).toFixed(1);
    
    const ratio = Math.min(Math.max(distanceToNextStep / (steps[currentStepIndex].distance || 1), 0), 1);
    let remainingSeconds = ratio * (steps[currentStepIndex].duration || 1);
    for (let i = currentStepIndex + 1; i < steps.length; i++) {
      remainingSeconds += steps[i].duration || 0;
    }
    const timeMin = Math.round(remainingSeconds / 60);

    return { distKm, timeMin };
  };

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

  // Rastreo continuo de ubicación con frecuencia y precisión dinámica
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const accuracy = navigationMode 
        ? Location.Accuracy.BestForNavigation 
        : Location.Accuracy.Balanced;

      subscription = await Location.watchPositionAsync(
        {
          accuracy,
          timeInterval: navigationMode ? 1000 : 5000,
          distanceInterval: navigationMode ? 2 : 10,
        },
        (loc) => {
          const coords = [loc.coords.longitude, loc.coords.latitude];
          setUserLocation(coords);
          if (navigationMode && route && route.coordinates && route.coordinates.length >= 2) {
            const { snappedPoint, bearing } = getSnappedInfo(coords, route.coordinates);
            setSnappedLocation(snappedPoint);
            setSnappedHeading(bearing);
          } else {
            setSnappedLocation(null);
            setSnappedHeading(0);
          }
        }
      );
    };

    startTracking();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [navigationMode, route]);

  // Animación manual y suavizada de la cámara en 3D
  useEffect(() => {
    if (navigationMode && snappedLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: snappedLocation,
        heading: snappedHeading,
        pitch: 55,
        zoomLevel: 16,
        animationDuration: 1000,
      });
    }
  }, [navigationMode, snappedLocation, snappedHeading]);

  useEffect(() => {
    if (viajeActivo && !selectedViaje) {
      setSelectedViaje(viajeActivo);
    }
  }, [viajeActivo]);

  // Acomodar el zoom y encuadre del mapa según la ruta calculada (solo en vista normal)
  useEffect(() => {
    if (navigationMode) return;
    if (route && route.coordinates && route.coordinates.length > 0) {
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;

      route.coordinates.forEach((coord: number[]) => {
        const [lng, lat] = coord;
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      });

      if (minLng !== Infinity && minLat !== Infinity && maxLng !== -Infinity && maxLat !== -Infinity) {
        cameraRef.current?.setCamera({
          bounds: {
            ne: [maxLng, maxLat],
            sw: [minLng, minLat],
            paddingLeft: 50,
            paddingRight: 50,
            paddingTop: isConductor ? 200 : 80,
            paddingBottom: selectedParada ? 260 : 120,
          },
          animationDuration: 1000,
        });
      }
    }
  }, [route, isConductor, !!selectedParada, navigationMode]);

  useEffect(() => {
    const params = routeProp?.params;
    if (params?.viaje) {
      setSelectedViaje(params.viaje);
      if (params.viaje.paradas && params.viaje.paradas.length > 0) {
        const primeraParada = params.viaje.paradas[0];
        cameraRef.current?.setCamera({
          centerCoordinate: [primeraParada.longitud, primeraParada.latitud],
          zoomLevel: 12,
          animationDuration: 1000
        });
      }
    }
  }, [routeProp?.params]);

  // Reiniciar el índice de pasos cuando la ruta cambie
  useEffect(() => {
    setCurrentStepIndex(0);
  }, [route]);

  // Anuncio inicial de voz al entrar en navegación
  useEffect(() => {
    if (navigationMode && steps && steps.length > 0) {
      setCurrentStepIndex(0);
      const firstStep = steps[0];
      if (firstStep && firstStep.maneuver && firstStep.maneuver.instruction && !isMuted) {
        Speech.speak(firstStep.maneuver.instruction, { language: 'es' });
      }
    }
  }, [navigationMode]);

  // Loop de navegación paso a paso
  useEffect(() => {
    if (!navigationMode || !userLocation || !steps || steps.length === 0) return;

    const step = steps[currentStepIndex];
    if (!step || !step.maneuver || !step.maneuver.location) return;

    const activeLoc = snappedLocation || userLocation;
    const distToManeuver = getDistance(activeLoc, step.maneuver.location);
    setDistanceToNextStep(distToManeuver);

    if (distToManeuver < 20) {
      if (currentStepIndex < steps.length - 1) {
        const nextIdx = currentStepIndex + 1;
        setCurrentStepIndex(nextIdx);
        
        const nextStep = steps[nextIdx];
        if (nextStep && nextStep.maneuver && nextStep.maneuver.instruction && !isMuted) {
          Speech.speak(nextStep.maneuver.instruction, { language: 'es' });
        }
      } else {
        if (!isMuted) {
          Speech.speak("Has llegado a tu destino", { language: 'es' });
        }
        Alert.alert("Navegación", "Has llegado a tu destino final.");
        setNavigationMode(false);
        handleCloseDetail();
      }
      return;
    }

    if (route && route.coordinates && route.coordinates.length > 0) {
      let isOffRoute = true;
      for (let i = 0; i < route.coordinates.length; i++) {
        const d = getDistance(userLocation, route.coordinates[i]);
        if (d < 40) {
          isOffRoute = false;
          break;
        }
      }

      if (isOffRoute && selectedParada && selectedParada.longitud && selectedParada.latitud) {
        console.log("Vehículo desviado, recalculando ruta...");
        if (!isMuted) {
          Speech.speak("Recalculando ruta", { language: 'es' });
        }
        fetchRoute(userLocation, [selectedParada.longitud, selectedParada.latitud]);
        setCurrentStepIndex(0);
      }
    }
  }, [userLocation, snappedLocation, navigationMode, currentStepIndex, steps, isMuted, route, selectedParada]);

  const handleSelectParada = (parada: Parada, viaje: Viaje) => {
    setSelectedParada(parada);
    if (userLocation && parada.latitud && parada.longitud) {
       fetchRoute(userLocation, [parada.longitud, parada.latitud]);
       // El useEffect de la ruta se encargará de ajustar el zoom y encuadre automáticamente
    } else if (parada.latitud && parada.longitud) {
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
    setNavigationMode(false);
    setSnappedLocation(null);
    setSnappedHeading(0);
  };

  const startNavigation = async (parada: Parada) => {
    if (userLocation && parada.latitud && parada.longitud) {
      setSelectedParada(parada);
      setNavigationMode(true);
      await fetchRoute(userLocation, [parada.longitud, parada.latitud]);
    } else {
      Alert.alert('Navegación', 'No se pudo obtener tu ubicación actual o la de la parada para trazar la ruta en Mapbox.');
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
          zoomLevel={navigationMode ? 16 : (userLocation ? 12 : 5)}
          centerCoordinate={navigationMode ? undefined : (userLocation || [-103.3496, 20.6736])}
          followUserLocation={!navigationMode && !selectedParada && !!userLocation}
          followUserMode={(!navigationMode ? 'normal' : undefined) as any}
          pitch={navigationMode ? 55 : 0}
        />
        
        {!navigationMode && <Mapbox.UserLocation />}

        {navigationMode && snappedLocation && (
          <Mapbox.MarkerView id="snappedPuck" coordinate={snappedLocation}>
            <View style={styles.puckContainer}>
              <View style={[styles.puckArrow, { transform: [{ rotate: `${snappedHeading}deg` }] }]}>
                <MaterialCommunityIcons name="navigation" size={28} color="#00b0ff" />
              </View>
            </View>
          </Mapbox.MarkerView>
        )}

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
        {routeGeoJSON && (
          <Mapbox.ShapeSource id="routeSource" shape={routeGeoJSON as any}>
            {/* Casing / Borde de contraste negro para la línea de ruta */}
            <Mapbox.LineLayer
              id="routeCasing"
              style={{
                lineColor: '#000000',
                lineCap: 'round',
                lineJoin: 'round',
                lineWidth: 10,
                lineOpacity: 0.4,
              }}
            />
            {/* Línea principal coloreada por tráfico */}
            <Mapbox.LineLayer
              id="routeFill"
              style={{
                lineColor: [
                  'match',
                  ['get', 'congestion'],
                  'low', '#4caf50',
                  'moderate', '#ff9800',
                  'heavy', '#f44336',
                  'severe', '#8b0000',
                  '#00b0ff'
                ] as any,
                lineCap: 'round',
                lineJoin: 'round',
                lineWidth: 6,
                lineOpacity: 0.95,
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {/* Panel de selección de viaje (para conductor) */}
      {!navigationMode && isConductor && (
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
      {!navigationMode && isConductor && selectedViaje && (
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
      {!navigationMode && selectedParada && (
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
      {!navigationMode && !selectedParada && !isConductor && (
         <View style={styles.legend}>
            <Text style={styles.legendText}>{viajes.length} viajes registrados</Text>
         </View>
      )}

      {/* Panel Superior de Instrucciones Turn-by-Turn */}
      {navigationMode && steps && steps[currentStepIndex] && (
        <View style={styles.navigationHeader}>
          <View style={styles.maneuverIconContainer}>
            <MaterialCommunityIcons 
              name={getManeuverIcon(steps[currentStepIndex]?.maneuver?.type, steps[currentStepIndex]?.maneuver?.modifier) as any} 
              size={36} 
              color="#00b0ff" 
            />
          </View>
          <View style={styles.instructionTextContainer}>
            <Text style={styles.instructionDistance}>
              {distanceToNextStep > 1000 
                ? `En ${(distanceToNextStep / 1000).toFixed(1)} km` 
                : `En ${Math.round(distanceToNextStep)} m`}
            </Text>
            <Text style={styles.instructionText} numberOfLines={2}>
              {steps[currentStepIndex]?.maneuver?.instruction}
            </Text>
            {/* Indicadores de carriles */}
            {lanes && lanes.length > 0 && (
              <View style={styles.lanesContainer}>
                {lanes.map((lane: any, idx: number) => {
                  const iconName = getLaneIcon(lane.indications);
                  return (
                    <View 
                      key={`lane-${idx}`} 
                      style={[
                        styles.laneIconWrapper, 
                        lane.valid ? styles.laneValid : styles.laneInvalid
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name={iconName as any} 
                        size={16} 
                        color={lane.valid ? '#00b0ff' : 'rgba(255, 255, 255, 0.3)'} 
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.muteButton} 
            onPress={() => setIsMuted(!isMuted)}
          >
            <MaterialCommunityIcons 
              name={isMuted ? "volume-off" : "volume-high"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Panel Inferior de Datos de Viaje Turn-by-Turn */}
      {navigationMode && (
        <View style={styles.navigationFooter}>
          <View style={styles.statsContainer}>
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>
                {calculateRemainingStats().timeMin}
              </Text>
              <Text style={styles.statLabel}>min</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>
                {calculateRemainingStats().distKm}
              </Text>
              <Text style={styles.statLabel}>km</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>
                {(() => {
                  const etaTime = new Date(Date.now() + calculateRemainingStats().timeMin * 60000);
                  let hours = etaTime.getHours();
                  const minutes = etaTime.getMinutes().toString().padStart(2, '0');
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  hours = hours % 12;
                  hours = hours ? hours : 12;
                  return `${hours}:${minutes} ${ampm}`;
                })()}
              </Text>
              <Text style={styles.statLabel}>ETA</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.exitNavigationButton} 
            onPress={() => {
              setNavigationMode(false);
              handleCloseDetail();
            }}
          >
            <Text style={styles.exitNavigationButtonText}>Salir</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Botón Flotante de SOS/Emergencia */}
      <TouchableOpacity 
        style={styles.sosButton} 
        onPress={() => setSosModalVisible(true)}
      >
        <MaterialCommunityIcons name="alert-decagram" size={26} color="#fff" />
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
    top: '40%',
    width: 54,
    height: 54,
    borderRadius: 27,
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
    zIndex: 999,
  },
  sosButtonText: {
    color: '#ffffff',
    fontSize: 10,
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
  },
  navigationHeader: {
    position: 'absolute',
    top: Spacing.xl + 10,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  maneuverIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(0, 176, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  instructionDistance: {
    color: '#00b0ff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    lineHeight: 18,
  },
  muteButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    marginLeft: Spacing.sm,
  },
  navigationFooter: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 20,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: {
    width: 1.5,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  exitNavigationButton: {
    backgroundColor: '#dc2626',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  exitNavigationButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  puckContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 176, 255, 0.25)',
    borderWidth: 2,
    borderColor: '#00b0ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  puckArrow: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lanesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  laneIconWrapper: {
    padding: 2,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laneValid: {
    backgroundColor: 'rgba(0, 176, 255, 0.1)',
    borderColor: '#00b0ff',
  },
  laneInvalid: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  }
});
