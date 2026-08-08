import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api/backend';
import { useAuth } from '../context/AuthContext';
import { Parada } from '../hooks/useVisitas';
import { useFocusEffect } from '@react-navigation/native';
import { SkeletonList } from '../components/SkeletonCard';
import { HapticFeedback } from '../utils/Haptics';

interface Ruta {
  ruta_id?: number;
  id?: number;
  nombre?: string;
  ruta_nombre?: string;
  origen: string;
  destino: string;
  paradas: Parada[];
  horarios?: string[];
  distancia_km?: number;
  tiempo_estimado_min?: number;
  estado?: string;
  // Campos del viaje disponible
  fecha_hora_salida?: string;
  capacidad?: number;
  ocupados?: number;
  modelo?: string;
  patente?: string;
}

const CACHE_KEY = 'cached_rutas_list';

export default function RutasDisponiblesScreen({ navigation }: any) {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);        // Carga inicial (muestra spinner/skeleton)
  const [refreshing, setRefreshing] = useState(false); // Pull-to-refresh manual
  const [isOfflineData, setIsOfflineData] = useState(false); // Indica si los datos vienen de caché local
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState<'todas' | 'disponibles'>('todas');
  const { user } = useAuth();

  const isPasajero = user?.rol === 'pasajero';

  // Cargar datos guardados en caché local inmediatamente
  const loadCachedRutas = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRutas(parsed);
          setIsOfflineData(true);
          setLoading(false); // Quitar spinner de inmediato si hay datos guardados
        }
      }
    } catch (err) {
      console.warn('Error al leer caché local de rutas:', err);
    }
  };

  // silent=true → refresca datos sin mostrar el spinner grande
  const fetchRutas = async (silent = false) => {
    try {
      if (!silent && rutas.length === 0) setLoading(true);

      const endpoint = isPasajero ? '/transporte/viajes/disponibles' : '/transporte/rutas';
      const data = await api.get(endpoint);

      if (Array.isArray(data)) {
        setRutas(data);
        setIsOfflineData(false);
        // Guardar en caché para acceso offline futuro
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
      }
    } catch (e) {
      console.error('Error fetching rutas:', e);
      // Si falla la red pero hay datos en caché, no borrar la lista
      if (rutas.length > 0) {
        setIsOfflineData(true);
      }
      // Solo mostrar alerta en carga manual si no hay datos almacenados
      if (!silent && rutas.length === 0) {
        Alert.alert('Modo sin conexión', 'No se pudieron actualizar las rutas. Mostrando versión guardada.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onManualRefresh = () => {
    setRefreshing(true);
    fetchRutas(false);
  };

  const REFRESH_INTERVAL_MS = 30_000; // Refrescar cada 60 segundos

  // useFocusEffect recarga las rutas CADA VEZ que el usuario navega a esta pantalla:
  // 1. Muestra inmediatamente los datos de la caché local
  // 2. Hace la petición en segundo plano para actualizar
  // 3. Mantiene un ciclo de refresco automático cada 30 segundos
  useFocusEffect(
    useCallback(() => {
      // 1. Carga inmediata desde almacenamiento local
      loadCachedRutas();

      // 2. Actualización silenciosa desde el servidor
      fetchRutas(true);

      // 3. Refresco periódico silencioso
      const interval = setInterval(() => {
        fetchRutas(true);
      }, REFRESH_INTERVAL_MS);

      // Limpieza al salir de la pantalla
      return () => clearInterval(interval);
    }, [isPasajero])
  );

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return time;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-MX', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const handleReservar = async (viajeId: number) => {
    HapticFeedback.medium();
    Alert.alert(
      '🎟️ Reservar Asiento',
      '¿Estás seguro que deseas solicitar un asiento para este viaje?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar',
          onPress: async () => {
            try {
              setLoading(true);
              await api.post('/transporte/reservas/solicitar', { viaje_id: viajeId });
              HapticFeedback.success();
              Alert.alert(
                'Solicitud Enviada',
                'Tu reservación ha sido registrada. Está pendiente de aprobación por parte del gerente.'
              );
              fetchRutas();
            } catch (err: any) {
              HapticFeedback.error();
              Alert.alert('Error', err.message || 'No se pudo realizar la solicitud de reserva.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Filtrado en tiempo real según texto de búsqueda y filtro de disponibilidad
  const filteredRutas = rutas.filter((item) => {
    const searchLower = searchQuery.toLowerCase().trim();
    const nombre = (item.ruta_nombre || item.nombre || '').toLowerCase();
    const origen = (item.origen || '').toLowerCase();
    const destino = (item.destino || '').toLowerCase();

    const matchesSearch =
      !searchLower ||
      nombre.includes(searchLower) ||
      origen.includes(searchLower) ||
      destino.includes(searchLower);

    if (!matchesSearch) return false;

    if (filterOption === 'disponibles') {
      if (isPasajero && item.capacidad !== undefined && item.ocupados !== undefined) {
        const libres = item.capacidad - item.ocupados;
        return libres > 0;
      }
      if (!isPasajero && item.estado) {
        return item.estado === 'activa';
      }
    }

    return true;
  });

  const renderRutaItem = ({ item }: { item: Ruta }) => {
    const nombre = item.ruta_nombre || item.nombre || 'Ruta sin nombre';
    const totalParadas = item.paradas ? item.paradas.length : 0;

    // Calcular cupo si aplica
    const tieneCupoInfo = item.capacidad !== undefined && item.ocupados !== undefined;
    const libres = tieneCupoInfo ? (item.capacidad! - item.ocupados!) : 0;
    const tieneLugares = libres > 0;

    return (
      <View style={styles.rutaCard}>
        <View style={styles.rutaHeader}>
          <View style={styles.rutaIconContainer}>
            <MaterialCommunityIcons name="bus-side" size={28} color={Colors.primary} />
          </View>
          <View style={styles.rutaInfo}>
            <Text style={styles.rutaNombre}>{nombre}</Text>
            <View style={styles.rutaRecorrido}>
              <MaterialCommunityIcons name="arrow-right-top" size={16} color={Colors.secondary} />
              <Text style={styles.rutaTexto} numberOfLines={1}>{item.origen}</Text>
            </View>
            <View style={styles.rutaRecorrido}>
              <MaterialCommunityIcons name="arrow-right-bottom" size={16} color={Colors.primary} />
              <Text style={styles.rutaTexto} numberOfLines={1}>{item.destino}</Text>
            </View>
          </View>

          {!isPasajero && (
            <View style={[styles.estadoBadge, item.estado === 'activa' && styles.estadoActivo]}>
              <Text style={[styles.estadoTexto, item.estado === 'activa' && styles.estadoActivoTexto]}>
                {item.estado === 'activa' ? 'Activa' : 'Inactiva'}
              </Text>
            </View>
          )}

          {isPasajero && tieneCupoInfo && (
            <View style={[styles.estadoBadge, tieneLugares ? styles.estadoActivo : styles.estadoInactivo]}>
              <Text style={[styles.estadoTexto, tieneLugares ? styles.estadoActivoTexto : styles.estadoInactivoTexto]}>
                {libres} Libres
              </Text>
            </View>
          )}
        </View>

        {/* Detalles del viaje/vehículo */}
        <View style={styles.rutaDetalles}>
          {item.distancia_km !== undefined && (
            <View style={styles.detalleItem}>
              <MaterialCommunityIcons name="map-marker-distance" size={18} color={Colors.textMuted} />
              <Text style={styles.detalleTexto}>{item.distancia_km.toFixed(1)} km</Text>
            </View>
          )}
          {item.tiempo_estimado_min !== undefined && (
            <View style={styles.detalleItem}>
              <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.textMuted} />
              <Text style={styles.detalleTexto}>{item.tiempo_estimado_min} min</Text>
            </View>
          )}
          <View style={styles.detalleItem}>
            <MaterialCommunityIcons name="bus-stop" size={18} color={Colors.textMuted} />
            <Text style={styles.detalleTexto}>{totalParadas} paradas</Text>
          </View>
        </View>

        {/* Mostrar fecha/hora de salida si es un viaje programado */}
        {isPasajero && item.fecha_hora_salida && (
          <View style={styles.horariosContainer}>
            <Text style={styles.horariosTitulo}>Salida Programada:</Text>
            <View style={styles.horarioBadge}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={Colors.primary} />
              <Text style={styles.horarioTexto}>{formatDateTime(item.fecha_hora_salida)}</Text>
            </View>
          </View>
        )}

        {/* Mostrar modelo y patente del bus */}
        {isPasajero && item.modelo && (
          <View style={styles.vehiculoContainer}>
            <MaterialCommunityIcons name="bus" size={16} color={Colors.textMuted} />
            <Text style={styles.vehiculoTexto}>{item.modelo} ({item.patente})</Text>
          </View>
        )}

        {/* Horarios fijos si es vista normal */}
        {!isPasajero && item.horarios && item.horarios.length > 0 && (
          <View style={styles.horariosContainer}>
            <Text style={styles.horariosTitulo}>Horarios:</Text>
            <View style={styles.horariosList}>
              {item.horarios.map((horario, index) => (
                <View key={index} style={styles.horarioBadge}>
                  <MaterialCommunityIcons name="clock" size={14} color={Colors.primary} />
                  <Text style={styles.horarioTexto}>{formatTime(horario)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Mostrar paradas */}
        {item.paradas && item.paradas.length > 0 && (
          <View style={styles.paradasContainer}>
            <Text style={styles.paradasTitulo}>Paradas del Recorrido:</Text>
            <View style={styles.paradasList}>
              {item.paradas.slice(0, 4).map((parada) => (
                <View key={parada.orden} style={styles.paradaItem}>
                  <View style={[styles.paradaOrden, parada.orden === 1 && styles.paradaOrdenPrimera]}>
                    <Text style={[styles.paradaOrdenTexto, parada.orden === 1 && styles.paradaOrdenPrimeraTexto]}>
                      {parada.orden}
                    </Text>
                  </View>
                  <Text style={styles.paradaNombre} numberOfLines={1}>{parada.nombre}</Text>
                </View>
              ))}
              {item.paradas.length > 4 && (
                <Text style={styles.paradasExtra}>+ {item.paradas.length - 4} paradas más...</Text>
              )}
            </View>
          </View>
        )}

        {/* Botón de reserva para pasajeros */}
        {isPasajero && (
          <TouchableOpacity
            style={[styles.reservarButton, !tieneLugares && styles.reservarButtonDisabled]}
            onPress={() => item.id && handleReservar(item.id)}
            disabled={!tieneLugares}
          >
            <MaterialCommunityIcons name="bookmark-check" size={20} color="#fff" />
            <Text style={styles.reservarButtonText}>
              {tieneLugares ? 'Reservar Asiento' : 'Sin Asientos Disponibles'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // 1. Mostrar Esqueleto Parpadeante (Skeleton Loader) mientras carga por primera vez y no hay datos
  if (loading && rutas.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="routes" size={32} color={Colors.primary} />
          <Text style={styles.titulo}>
            {isPasajero ? 'Viajes Disponibles' : 'Rutas Disponibles'}
          </Text>
        </View>
        <SkeletonList />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <MaterialCommunityIcons name="routes" size={32} color={Colors.primary} />
          <Text style={styles.titulo}>
            {isPasajero ? 'Viajes Disponibles' : 'Rutas Disponibles'}
          </Text>
        </View>
        {isOfflineData && (
          <View style={styles.offlineBadge}>
            <MaterialCommunityIcons name="cloud-off-outline" size={14} color="#b45309" />
            <Text style={styles.offlineBadgeText}>Guardado offline</Text>
          </View>
        )}
      </View>

      {/* Barra de Búsqueda y Filtros */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por ruta, origen o destino..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
            }}
            placeholderTextColor={Colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { HapticFeedback.light(); setSearchQuery(''); }}>
              <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Chips / Pills de Filtro */}
        <View style={styles.filterPills}>
          <TouchableOpacity
            style={[styles.filterPill, filterOption === 'todas' && styles.filterPillActive]}
            onPress={() => { HapticFeedback.light(); setFilterOption('todas'); }}
          >
            <Text style={[styles.filterPillText, filterOption === 'todas' && styles.filterPillTextActive]}>
              Todas ({rutas.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterOption === 'disponibles' && styles.filterPillActive]}
            onPress={() => { HapticFeedback.light(); setFilterOption('disponibles'); }}
          >
            <MaterialCommunityIcons
              name={isPasajero ? "seat-recline-extra" : "check-circle-outline"}
              size={14}
              color={filterOption === 'disponibles' ? '#fff' : Colors.primary}
            />
            <Text style={[styles.filterPillText, filterOption === 'disponibles' && styles.filterPillTextActive]}>
              {isPasajero ? 'Con Asientos' : 'Solo Activas'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredRutas}
        keyExtractor={(item) => (item.id || item.ruta_id || Math.random()).toString()}
        renderItem={renderRutaItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="routes" size={64} color={Colors.border} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No se encontraron resultados' : (isPasajero ? 'Sin viajes disponibles' : 'Sin rutas disponibles')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No hay rutas que coincidan con "${searchQuery}".`
                : (isPasajero 
                    ? 'No hay viajes programados disponibles para reservar en este momento.' 
                    : 'No hay rutas registradas en el sistema.')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.text,
  },
  list: {
    padding: Spacing.md,
  },
  rutaCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rutaHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.md,
  },
  rutaIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: Colors.primary + '15',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rutaInfo: {
    flex: 1,
  },
  rutaNombre: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 4,
  },
  rutaRecorrido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  rutaTexto: {
    fontSize: 14,
    color: Colors.textMuted,
    flex: 1,
  },
  estadoBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  estadoActivo: {
    backgroundColor: Colors.success + '20',
  },
  estadoInactivo: {
    backgroundColor: '#fef2f2',
  },
  estadoTexto: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  estadoActivoTexto: {
    color: Colors.success,
  },
  estadoInactivoTexto: {
    color: '#ef4444',
  },
  rutaDetalles: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detalleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detalleTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  horariosContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  horariosTitulo: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  horariosList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  horarioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  horarioTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  vehiculoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  vehiculoTexto: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  paradasContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  paradasTitulo: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  paradasList: {
    gap: 6,
  },
  paradaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paradaOrden: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paradaOrdenPrimera: {
    backgroundColor: Colors.primary,
  },
  paradaOrdenTexto: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.textMuted,
  },
  paradaOrdenPrimeraTexto: {
    color: '#fff',
  },
  paradaNombre: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  paradasExtra: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  emptyState: {
    paddingTop: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  reservarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  reservarButtonDisabled: {
    backgroundColor: Colors.border,
  },
  reservarButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  offlineBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  searchSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 0,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: Spacing.xs,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
});
