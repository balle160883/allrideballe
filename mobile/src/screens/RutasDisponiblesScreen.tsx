import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api/backend';
import { useAuth } from '../context/AuthContext';
import { Parada } from '../hooks/useVisitas';

interface Ruta {
  ruta_id: number;
  nombre: string;
  origen: string;
  destino: string;
  paradas: Parada[];
  horarios: string[];
  distancia_km: number;
  tiempo_estimado_min: number;
  estado: string;
}

export default function RutasDisponiblesScreen({ navigation }: any) {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchRutas = async () => {
    try {
      setLoading(true);
      const data = await api.get('/transporte/rutas');
      setRutas(data || []);
    } catch (e) {
      console.error('Error fetching rutas:', e);
      Alert.alert('Error', 'No se pudieron cargar las rutas disponibles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRutas();
  }, []);

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return time;
    }
  };

  const renderRutaItem = ({ item }: { item: Ruta }) => (
    <View style={styles.rutaCard}>
      <View style={styles.rutaHeader}>
        <View style={styles.rutaIconContainer}>
          <MaterialCommunityIcons name="route" size={28} color={Colors.primary} />
        </View>
        <View style={styles.rutaInfo}>
          <Text style={styles.rutaNombre}>{item.nombre}</Text>
          <View style={styles.rutaRecorrido}>
            <MaterialCommunityIcons name="arrow-right-top" size={16} color={Colors.secondary} />
            <Text style={styles.rutaTexto} numberOfLines={1}>{item.origen}</Text>
          </View>
          <View style={styles.rutaRecorrido}>
            <MaterialCommunityIcons name="arrow-right-bottom" size={16} color={Colors.primary} />
            <Text style={styles.rutaTexto} numberOfLines={1}>{item.destino}</Text>
          </View>
        </View>
        <View style={[styles.estadoBadge, item.estado === 'activa' && styles.estadoActivo]}>
          <Text style={[styles.estadoTexto, item.estado === 'activa' && styles.estadoActivoTexto]}>
            {item.estado === 'activa' ? 'Activa' : 'Inactiva'}
          </Text>
        </View>
      </View>

      <View style={styles.rutaDetalles}>
        <View style={styles.detalleItem}>
          <MaterialCommunityIcons name="map-marker-distance" size={18} color={Colors.textMuted} />
          <Text style={styles.detalleTexto}>{item.distancia_km.toFixed(1)} km</Text>
        </View>
        <View style={styles.detalleItem}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.detalleTexto}>{item.tiempo_estimado_min} min</Text>
        </View>
        <View style={styles.detalleItem}>
          <MaterialCommunityIcons name="bus-stop" size={18} color={Colors.textMuted} />
          <Text style={styles.detalleTexto}>{item.paradas.length} paradas</Text>
        </View>
      </View>

      {item.horarios && item.horarios.length > 0 && (
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

      {item.paradas && item.paradas.length > 0 && (
        <View style={styles.paradasContainer}>
          <Text style={styles.paradasTitulo}>Paradas:</Text>
          <View style={styles.paradasList}>
            {item.paradas.slice(0, 5).map((parada) => (
              <View key={parada.orden} style={styles.paradaItem}>
                <View style={[styles.paradaOrden, parada.orden === 1 && styles.paradaOrdenPrimera]}>
                  <Text style={[styles.paradaOrdenTexto, parada.orden === 1 && styles.paradaOrdenPrimeraTexto]}>
                    {parada.orden}
                  </Text>
                </View>
                <Text style={styles.paradaNombre} numberOfLines={1}>{parada.nombre}</Text>
              </View>
            ))}
            {item.paradas.length > 5 && (
              <Text style={styles.paradasExtra}>+ {item.paradas.length - 5} paradas más...</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando rutas disponibles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="routes" size={32} color={Colors.primary} />
        <Text style={styles.titulo}>Rutas Disponibles</Text>
      </View>

      <FlatList
        data={rutas}
        keyExtractor={(item) => item.ruta_id.toString()}
        renderItem={renderRutaItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchRutas} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="routes" size={64} color={Colors.border} />
            <Text style={styles.emptyTitle}>Sin rutas disponibles</Text>
            <Text style={styles.emptySubtitle}>No hay rutas registradas en el sistema.</Text>
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
  estadoTexto: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  estadoActivoTexto: {
    color: Colors.success,
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
  },
  horarioTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
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
});
