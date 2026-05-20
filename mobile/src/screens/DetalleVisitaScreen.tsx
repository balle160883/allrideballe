import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Linking
} from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/backend';
import * as SecureStore from 'expo-secure-store';

export default function DetalleVisitaScreen({ route, navigation }: any) {
  const { visita } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reservas, setReservas] = useState<any[]>([]);
  const [tripState, setTripState] = useState(visita.situacion);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/transporte/viajes/${visita.id}/reservas`);
      setReservas(data || []);
    } catch (e) {
      console.warn("Error fetching reservations for trip details:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async () => {
    try {
      setLoading(true);
      await api.patch(`/transporte/viajes/${visita.id}/estado`, { estado: 'en_progreso' });
      await SecureStore.setItemAsync('active_viaje_id', visita.id.toString());
      setTripState('en_progreso');
      Alert.alert('Viaje Iniciado', 'El viaje ha cambiado a En Progreso. El rastreo GPS en segundo plano está activo.');
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo iniciar el viaje: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishTrip = async () => {
    try {
      setLoading(true);
      await api.patch(`/transporte/viajes/${visita.id}/estado`, { estado: 'finalizado' });
      await SecureStore.deleteItemAsync('active_viaje_id');
      setTripState('finalizado');
      Alert.alert('Viaje Finalizado', 'El recorrido ha concluido con éxito.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo finalizar el viaje: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePassenger = async (reservaId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'confirmado' ? 'reservado' : 'confirmado';
    try {
      setLoading(true);
      await api.patch(`/transporte/reservas/${reservaId}/estado`, { estado: nextStatus });
      fetchReservations();
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo actualizar el abordaje: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrar = () => {
    navigation.navigate('RegistroVisita', { visita, onScanSuccess: fetchReservations });
  };

  const handleNavigate = async () => {
    const lat = visita.latitud || 20.6736;
    const lng = visita.longitud || -103.3496;
    
    // Waze
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    // Google Maps
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    try {
      const canOpenWaze = await Linking.canOpenURL('waze://');
      if (canOpenWaze) {
        await Linking.openURL(wazeUrl);
      } else {
        await Linking.openURL(googleMapsUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar la aplicación de mapas.');
    }
  };

  const countConfirmed = reservas.filter(r => r.estado === 'confirmado').length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.tipo}>Ruta de Personal</Text>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: tripState === 'en_progreso' ? '#3b82f6' : tripState === 'finalizado' ? '#10b981' : '#f59e0b' }
              ]}>
                <Text style={styles.statusText}>
                  {tripState === 'en_progreso' ? 'En Progreso' : tripState === 'finalizado' ? 'Finalizado' : 'Programado'}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cuenta}>Viaje ID: #{visita.id}</Text>
              <Text style={styles.socioId}>Unidad: {visita.socioId}</Text>
            </View>
        </View>
        <Text style={styles.nombre}>{visita.nombre}</Text>
        
        <View style={styles.infoRow}>
           <MaterialCommunityIcons name="map-marker" size={20} color={Colors.primary} />
           <Text style={styles.infoText}>
             {visita.domicilio} → {visita.colonia}
           </Text>
        </View>

        <View style={styles.infoRow}>
           <MaterialCommunityIcons name="account-tie" size={20} color={Colors.primary} />
           <Text style={styles.infoText}>Chofer: {visita.nombreSocio}</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Capacidad</Text>
          <Text style={styles.statValue}>{visita.saldoTotal} Asientos</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Abordados</Text>
          <Text style={styles.statValue}>{countConfirmed} / {reservas.length}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Vehículo</Text>
          <Text style={styles.statValue} numberOfLines={1}>{visita.socioId}</Text>
        </View>
      </View>

      {/* Manifest list */}
      <View style={styles.financialSection}>
        <Text style={styles.sectionTitle}>Manifiesto de Pasajeros</Text>
        <Text style={styles.creditType}>Confirmar boarding de personal</Text>
        
        {loading && reservas.length === 0 ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
        ) : reservas.length === 0 ? (
          <Text style={styles.emptyText}>No hay reservaciones de asientos para este viaje.</Text>
        ) : (
          <View style={styles.passengerList}>
            {reservas.map((res: any) => {
              const isConfirmed = res.estado === 'confirmado';
              return (
                <TouchableOpacity 
                  key={res.id} 
                  style={[styles.passengerRow, isConfirmed && styles.passengerConfirmed]}
                  onPress={() => handleTogglePassenger(res.id, res.estado)}
                >
                  <View style={styles.seatBadge}>
                    <Text style={styles.seatText}>#{res.asiento_numero}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.passengerName, isConfirmed && { textDecorationLine: 'line-through' }]}>
                      {res.pasajero_nombre}
                    </Text>
                    <Text style={styles.passengerCard}>RFID: {res.identificador_tarjeta || 'No asignada'}</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={isConfirmed ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                    size={24} 
                    color={isConfirmed ? Colors.success : Colors.border} 
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {tripState === 'programado' && (
          <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleStartTrip}>
            <MaterialCommunityIcons name="play" color="#fff" size={24} />
            <Text style={styles.actionButtonText}>Iniciar Recorrido</Text>
          </TouchableOpacity>
        )}

        {tripState === 'en_progreso' && (
          <>
            <TouchableOpacity style={[styles.actionButton, styles.successButton]} onPress={handleFinishTrip}>
              <MaterialCommunityIcons name="check-circle-outline" color="#fff" size={24} />
              <Text style={styles.actionButtonText}>Terminar Recorrido</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleRegistrar}>
              <MaterialCommunityIcons name="qrcode-scan" color="#fff" size={24} />
              <Text style={styles.actionButtonText}>Escanear Abordaje</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleNavigate}>
          <MaterialCommunityIcons name="navigation-variant-outline" color="#fff" size={24} />
          <Text style={styles.actionButtonText}>Navegación GPS</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  card: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  tipo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cuenta: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: 'bold',
  },
  socioId: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  nombre: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoText: {
    marginLeft: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
  },
  financialSection: {
    padding: Spacing.md,
    backgroundColor: '#fff',
    marginHorizontal: Spacing.lg,
    borderRadius: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  creditType: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  passengerList: {
    marginTop: 8,
    gap: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  passengerConfirmed: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  seatBadge: {
    backgroundColor: '#f1f5f9',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatText: {
    fontSize: 12,
    fontWeight: 'black',
    color: Colors.text,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  passengerCard: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  actions: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    height: 60,
    borderRadius: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.secondary,
  },
  successButton: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    paddingLeft: Spacing.sm,
  },
});
