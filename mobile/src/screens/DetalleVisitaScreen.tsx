import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  TextInput,
  Image,
} from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/backend';
import * as SecureStore from 'expo-secure-store';
import { OfflineService } from '../utils/OfflineService';
import { HapticFeedback } from '../utils/Haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DetalleViajeScreen({ route, navigation }: any) {
  const { visita: viaje } = route.params;
  const { user } = useAuth();
  const isConductor = user?.rol === 'conductor';
  const [loading, setLoading] = useState(false);
  const [reservas, setReservas] = useState<any[]>([]);
  const [tripState, setTripState] = useState(viaje.viaje_estado || viaje.estado);

  const viajeId = viaje.viaje_id || viaje.id;

  // Estados de lista rápida y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [manifestFilter, setManifestFilter] = useState<'todos' | 'pendientes' | 'abordados'>('todos');

  useEffect(() => {
    fetchManifiesto();
  }, []);

  const fetchManifiesto = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/transporte/viajes/${viajeId}/reservas`);
      setReservas(data || []);
      if (Array.isArray(data)) {
        OfflineService.cacheTripPasajeros(Number(viajeId), data);
      }
    } catch (e) {
      console.warn('Error cargando manifiesto en red, consultando caché local:', e);
      try {
        const cached = await AsyncStorage.getItem(`@passengers_viaje_${viajeId}`);
        if (cached) {
          setReservas(JSON.parse(cached));
        }
      } catch (cacheErr) {
        console.error('Error leyendo caché:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async () => {
    try {
      setLoading(true);
      await api.patch(`/transporte/viajes/${viajeId}/estado`, { estado: 'en_ruta' });
      await SecureStore.setItemAsync('active_viaje_id', viajeId.toString());
      setTripState('en_ruta');
      Alert.alert(
        '🚌 Viaje Iniciado',
        'El recorrido está en ruta. El rastreo GPS está activo y transmitiendo.'
      );
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo iniciar el viaje: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishTrip = async () => {
    Alert.alert(
      'Terminar Recorrido',
      '¿Confirmas que el viaje ha concluido? Esta acción notificará a la central.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.patch(`/transporte/viajes/${viajeId}/estado`, { estado: 'completado' });
              await SecureStore.deleteItemAsync('active_viaje_id');
              setTripState('completado');
              Alert.alert('✅ Recorrido Finalizado', 'El viaje ha concluido con éxito. GPS detenido.');
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', 'No se pudo finalizar: ' + e.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleBoarding = async (reservaId: number, currentStatus: string) => {
    const next = currentStatus === 'confirmado' ? 'pendiente' : 'confirmado';
    HapticFeedback.light();
    // Actualización optimista inmediata en la UI
    setReservas(prev => prev.map(r => r.id === reservaId ? { ...r, estado: next } : r));

    try {
      await api.patch(`/transporte/reservas/${reservaId}/estado`, { estado: next });
    } catch (e: any) {
      console.log('Error de red al actualizar abordaje, guardando offline:', e?.message);
      // Guardar en cola offline si no hay cobertura 4G
      await OfflineService.saveQRAbordajeOffline(reservaId, Number(viajeId));
    }
  };

  const handleScanQR = () => {
    const scanData = {
      ...viaje,
      id: viajeId
    };
    navigation.navigate('RegistroVisita', { visita: scanData, onScanSuccess: fetchManifiesto });
  };

  const handleNavigate = () => {
    // Redirigir al conductor directamente a la pestaña del Mapa para que visualice la ruta en Mapbox
    navigation.navigate('Mapa', { viaje: { ...viaje, id: viajeId } });
  };

  // Métricas del manifiesto y filtro interactivo
  const totalReservas = reservas.length;
  const abordados = reservas.filter(r => r.estado === 'confirmado').length;
  const capacidad = viaje.capacidad || viaje.saldoTotal || 30;
  const ocupacionPct = capacidad > 0 ? Math.round((abordados / capacidad) * 100) : 0;

  const filteredReservas = useMemo(() => {
    return reservas.filter(r => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || 
        (r.pasajero_nombre && r.pasajero_nombre.toLowerCase().includes(q)) ||
        (r.asiento_numero && r.asiento_numero.toString().includes(q)) ||
        (r.identificador_tarjeta && r.identificador_tarjeta.toLowerCase().includes(q));

      const isBoarded = r.estado === 'confirmado';
      const matchTab = 
        manifestFilter === 'todos' ? true :
        manifestFilter === 'pendientes' ? !isBoarded :
        isBoarded;

      return matchSearch && matchTab;
    });
  }, [reservas, searchQuery, manifestFilter]);

  const salida = new Date(viaje.fecha_hora_salida || viaje.diasMora);
  const salidaStr = salida.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const salidaDay = salida.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  const stateColor =
    tripState === 'en_ruta' ? '#3b82f6' :
    tripState === 'completado' ? '#10b981' : '#f59e0b';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Hero Card ── */}
      <View style={[styles.heroCard, { borderTopColor: stateColor }]}>
        <View style={styles.heroTopRow}>
          <View style={[styles.statePill, { backgroundColor: stateColor + '20' }]}>
            <View style={[styles.stateDot, { backgroundColor: stateColor }]} />
            <Text style={[styles.stateText, { color: stateColor }]}>
              {tripState === 'en_ruta' ? 'En Ruta' :
               tripState === 'completado' ? 'Completado' :
               tripState === 'cancelado' ? 'Cancelado' : 'Programado'}
            </Text>
          </View>
          <Text style={styles.tripIdText}>Viaje #{viajeId}</Text>
        </View>

        <Text style={styles.rutaNombre}>
          {viaje.ruta_nombre || viaje.nombre}
        </Text>

        <View style={styles.routeLine}>
          <MaterialCommunityIcons name="circle-small" size={20} color={Colors.textMuted} />
          <Text style={styles.routeSegment}>{viaje.origen || viaje.domicilio}</Text>
        </View>
        <View style={[styles.routeLine, { marginBottom: 4 }]}>
          <MaterialCommunityIcons name="map-marker" size={18} color={Colors.primary} />
          <Text style={[styles.routeSegment, { color: Colors.primary, fontWeight: '700' }]}>
            {viaje.destino || viaje.colonia}
          </Text>
        </View>

        <View style={styles.heroDivider} />

        {/* Info grid */}
        <View style={styles.infoGrid}>
          <InfoCell icon="clock-outline" label="Salida" value={salidaStr} />
          <InfoCell icon="calendar-outline" label="Fecha" value={salidaDay} />
          <InfoCell icon="bus" label="Unidad" value={viaje.patente || viaje.socioId} />
          <InfoCell icon="account-tie" label="Conductor" value={viaje.conductor_nombre || viaje.nombreSocio || 'N/A'} />
        </View>
      </View>

      {/* ── Barra de ocupación ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="account-group" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Ocupación del Vehículo</Text>
        </View>

        <View style={styles.occupancyRow}>
          <View style={styles.occupancyStat}>
            <Text style={styles.occupancyBig}>{abordados}</Text>
            <Text style={styles.occupancyLabel}>Abordados</Text>
          </View>
          <View style={styles.occupancyStat}>
            <Text style={[styles.occupancyBig, { color: Colors.textMuted }]}>{totalReservas}</Text>
            <Text style={styles.occupancyLabel}>Reservados</Text>
          </View>
          <View style={styles.occupancyStat}>
            <Text style={[styles.occupancyBig, { color: '#6366f1' }]}>{capacidad}</Text>
            <Text style={styles.occupancyLabel}>Capacidad</Text>
          </View>
          <View style={styles.occupancyStat}>
            <Text style={[styles.occupancyBig, { color: ocupacionPct > 80 ? '#ef4444' : '#10b981' }]}>
              {ocupacionPct}%
            </Text>
            <Text style={styles.occupancyLabel}>Ocupación</Text>
          </View>
        </View>

        {/* Barra de progreso visual */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {
            width: `${Math.min(ocupacionPct, 100)}%` as any,
            backgroundColor: ocupacionPct > 90 ? '#ef4444' : ocupacionPct > 60 ? '#f59e0b' : '#10b981',
          }]} />
        </View>
        <Text style={styles.progressLabel}>
          {capacidad - abordados} asientos disponibles
        </Text>
      </View>

      {/* ── Manifiesto de Pasajeros / Lista Rápida (Solo Conductor) ── */}
      {isConductor && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="format-list-checks" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Lista Rápida de Abordaje</Text>
            </View>
            <TouchableOpacity 
              style={styles.scanShortcutBtn} 
              onPress={handleScanQR}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={16} color="#fff" />
              <Text style={styles.scanShortcutBtnText}>Escanear QR</Text>
            </TouchableOpacity>
          </View>

          {/* Buscador de Pasajeros */}
          <View style={styles.searchBarContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.textMuted} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Buscar por nombre, asiento o credencial..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textMuted}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Pestañas de Filtrado Rápido */}
          <View style={styles.filterPillsRow}>
            {(['todos', 'pendientes', 'abordados'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.filterPill, manifestFilter === tab && styles.filterPillActive]}
                onPress={() => setManifestFilter(tab)}
              >
                <Text style={[styles.filterPillText, manifestFilter === tab && styles.filterPillTextActive]}>
                  {tab === 'todos' ? `Todos (${totalReservas})` :
                   tab === 'pendientes' ? `Pendientes (${totalReservas - abordados})` :
                   `Abordados (${abordados})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading && reservas.length === 0 ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : filteredReservas.length === 0 ? (
            <View style={styles.emptyManifest}>
              <MaterialCommunityIcons name="account-search-outline" size={36} color={Colors.border} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No hay pasajeros que coincidan con la búsqueda' : 'Sin pasajeros en esta categoría'}
              </Text>
            </View>
          ) : (
            <View style={styles.passengerList}>
              {filteredReservas.map((res: any, idx: number) => {
                const isBoarded = res.estado === 'confirmado';
                return (
                  <TouchableOpacity
                    key={res.id}
                    style={[styles.passengerRow, isBoarded && styles.passengerBoarded]}
                    onPress={() => handleToggleBoarding(res.id, res.estado)}
                    activeOpacity={0.7}
                  >
                    {/* Número de asiento */}
                    <View style={[styles.seatBadge, isBoarded && styles.seatBadgeBoarded]}>
                      <Text style={[styles.seatText, isBoarded && styles.seatTextBoarded]}>
                        {res.asiento_numero || idx + 1}
                      </Text>
                    </View>

                    {/* Info pasajero */}
                    <View style={styles.passengerInfo}>
                      <Text style={[styles.passengerName, isBoarded && styles.passengerNameBoarded]}>
                        {res.pasajero_nombre || 'Pasajero'}
                      </Text>
                      <Text style={styles.passengerCard}>
                        {res.identificador_tarjeta
                          ? `🪪 ${res.identificador_tarjeta}`
                          : '⚠️ Sin credencial registrada'}
                      </Text>
                    </View>

                    {/* Check icon interactivo */}
                    <MaterialCommunityIcons
                      name={isBoarded ? 'check-circle' : 'checkbox-blank-circle-outline'}
                      size={28}
                      color={isBoarded ? '#10b981' : Colors.border}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ── Boleto Digital QR (Solo Pasajero) ── */}
      {!isConductor && (
        <View style={styles.passengerTicketCard}>
          <View style={styles.ticketHeader}>
            <MaterialCommunityIcons name="ticket-confirmation" size={26} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.ticketTitle}>Pase de Abordar Digital</Text>
              <Text style={styles.ticketSubtitle}>Presenta este código al chofer para subir</Text>
            </View>
            <View style={styles.ticketPill}>
              <Text style={styles.ticketPillText}>Activo</Text>
            </View>
          </View>

          <View style={styles.qrContainer}>
            <Image
              source={{
                uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                  viaje.identificador_tarjeta || `RES-${viaje.reserva_id || viaje.id}`
                )}`
              }}
              style={styles.qrImage}
              resizeMode="contain"
            />
            <Text style={styles.qrCodeText}>
              {viaje.identificador_tarjeta || `RES-${viaje.reserva_id || viaje.id}`}
            </Text>
          </View>

          <View style={styles.ticketDetails}>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Pasajero:</Text>
              <Text style={styles.ticketValue}>{user?.gestor || user?.email}</Text>
            </View>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Asiento Asignado:</Text>
              <Text style={[styles.ticketValue, { color: Colors.primary, fontWeight: '900', fontSize: 16 }]}>
                {viaje.asiento_numero ? `#${viaje.asiento_numero}` : 'General / Sin Asignar'}
              </Text>
            </View>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Ruta:</Text>
              <Text style={styles.ticketValue}>{viaje.ruta_nombre || 'Ruta Corporativa'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Acciones de Navegación y Recorrido ── */}
      <View style={styles.actionsSection}>
        {isConductor ? (
          <>
            {tripState === 'programado' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                onPress={handleStartTrip}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <MaterialCommunityIcons name="play-circle" color="#fff" size={26} />}
                <Text style={styles.actionBtnText}>Iniciar Recorrido</Text>
              </TouchableOpacity>
            )}

            {tripState === 'en_ruta' && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleFinishTrip}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <MaterialCommunityIcons name="flag-checkered" color="#fff" size={26} />}
                  <Text style={styles.actionBtnText}>Terminar Recorrido</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#6366f1' }]}
                  onPress={handleScanQR}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="qrcode-scan" color="#fff" size={26} />
                  <Text style={styles.actionBtnText}>Escanear QR / RFID</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.secondary }]}
              onPress={handleNavigate}
            >
              <MaterialCommunityIcons name="navigation-variant" color="#fff" size={26} />
              <Text style={styles.actionBtnText}>Abrir Navegación GPS</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Vista del Pasajero: Solo un botón para ver el conductor en el mapa */
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={handleNavigate}
          >
            <MaterialCommunityIcons name="map-marker-radius" color="#fff" size={26} />
            <Text style={styles.actionBtnText}>Ver ubicación en el Mapa</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// Sub-componente celda de info
function InfoCell({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <MaterialCommunityIcons name={icon} size={16} color={Colors.primary} />
      <Text style={styles.infoCellLabel}>{label}</Text>
      <Text style={styles.infoCellValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  heroCard: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderTopWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  stateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  stateText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tripIdText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  rutaNombre: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 6,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  routeSegment: {
    fontSize: 14,
    color: Colors.textMuted,
    flex: 1,
  },
  heroDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: Spacing.sm,
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCellLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCellValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  section: {
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 14,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    width: '100%',
    marginTop: -8,
  },
  occupancyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  occupancyStat: {
    alignItems: 'center',
    flex: 1,
  },
  occupancyBig: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
  },
  occupancyLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 4,
  },
  emptyManifest: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  passengerList: {
    gap: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    gap: 10,
  },
  passengerBoarded: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  seatBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seatBadgeBoarded: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  seatText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.text,
  },
  seatTextBoarded: {
    color: '#16a34a',
  },
  passengerInfo: {
    flex: 1,
    gap: 2,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  passengerNameBoarded: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  passengerCard: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  actionsSection: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  scanShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  scanShortcutBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: Spacing.md,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    padding: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  passengerTicketCard: {
    backgroundColor: '#ffffff',
    margin: Spacing.md,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.text,
  },
  ticketSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  ticketPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ticketPillText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '900',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
  },
  qrImage: {
    width: 200,
    height: 200,
    backgroundColor: '#ffffff',
  },
  qrCodeText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
  },
  ticketDetails: {
    backgroundColor: '#f1f5f9',
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  ticketValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
});
