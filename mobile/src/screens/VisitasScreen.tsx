import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { useViajes, Viaje } from '../hooks/useVisitas';
import ViajeCard from '../components/VisitaCard';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProximityAlert } from '../hooks/useProximityAlert';
import RatingModal from '../components/RatingModal';
import { useAuth } from '../context/AuthContext';

type Tab = 'activos' | 'completados';

export default function VisitasScreen({ navigation }: any) {
  const { viajes, loading, refresh, calificarViaje } = useViajes();
  const { user } = useAuth();
  const isConductor = user?.rol === 'conductor';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('activos');
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [viajeACalificar, setViajeACalificar] = useState<Viaje | null>(null);

  const handleNavigateToViaje = React.useCallback((viaje: Viaje) => {
    navigation.navigate('DetalleVisita', { visita: viaje });
  }, [navigation]);

  const handleCalificarPress = (viaje: Viaje) => {
    setViajeACalificar(viaje);
    setRatingModalVisible(true);
  };

  const handleSubmitRating = async (rating: number, comment?: string) => {
    if (!viajeACalificar) return;
    await calificarViaje(viajeACalificar.viaje_id, viajeACalificar.reserva_id, rating, comment);
  };

  useProximityAlert(viajes, handleNavigateToViaje);

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [])
  );

  const handleViajePress = handleNavigateToViaje;

  const filtered = React.useMemo(() => {
    const byTab = viajes.filter(v =>
      activeTab === 'activos' ? !v.isRealizada : v.isRealizada
    );
    if (!searchQuery.trim()) return byTab;
    const q = searchQuery.toLowerCase();
    return byTab.filter(v =>
      v.ruta_nombre.toLowerCase().includes(q) ||
      v.destino.toLowerCase().includes(q) ||
      v.origen.toLowerCase().includes(q) ||
      v.conductor_nombre.toLowerCase().includes(q)
    );
  }, [viajes, searchQuery, activeTab]);

  const activos = viajes.filter(v => !v.isRealizada);
  const completados = viajes.filter(v => v.isRealizada);
  const enProgreso = viajes.filter(v => v.estado === 'en_ruta');

  if (loading && viajes.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando itinerario...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Banner si hay viaje en progreso */}
      {enProgreso.length > 0 && (
        <TouchableOpacity
          style={styles.liveBanner}
          onPress={() => handleViajePress(enProgreso[0])}
        >
          <View style={styles.liveDot} />
          <MaterialCommunityIcons name="bus-clock" size={18} color="#fff" />
          <Text style={styles.liveBannerText}>
            Viaje en curso: {enProgreso[0].ruta_nombre} — Toca para ver
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por ruta, destino o conductor..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      {/* Pestañas */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activos' && styles.activeTab]}
          onPress={() => setActiveTab('activos')}
        >
          <MaterialCommunityIcons
            name="bus"
            size={16}
            color={activeTab === 'activos' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'activos' && styles.activeTabText]}>
            Activos
          </Text>
          {activos.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'activos' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'activos' && styles.tabBadgeTextActive]}>
                {activos.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'completados' && styles.activeTab]}
          onPress={() => setActiveTab('completados')}
        >
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={16}
            color={activeTab === 'completados' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'completados' && styles.activeTabText]}>
            Completados
          </Text>
          {completados.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'completados' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'completados' && styles.tabBadgeTextActive]}>
                {completados.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <ViajeCard viaje={item} onPress={handleViajePress} />
            {item.isRealizada && !isConductor && (
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => handleCalificarPress(item)}
              >
                <MaterialCommunityIcons name="star" size={18} color={Colors.primary} />
                <Text style={styles.rateButtonText}>Calificar viaje</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name={activeTab === 'activos' ? 'bus-clock' : 'history'}
              size={64}
              color={Colors.border}
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'activos' ? 'Sin viajes activos' : 'Sin viajes completados'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'activos'
                ? 'No tienes rutas asignadas para hoy.'
                : 'Los viajes finalizados aparecerán aquí.'}
            </Text>
          </View>
        }
      />

      {/* Modal de calificación */}
      {viajeACalificar && (
        <RatingModal
          visible={ratingModalVisible}
          onClose={() => setRatingModalVisible(false)}
          onSubmit={handleSubmitRating}
          viajeNombre={viajeACalificar.ruta_nombre}
        />
      )}
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
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    opacity: 0.9,
  },
  liveBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: Spacing.md,
    marginBottom: 0,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 15,
    color: Colors.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    margin: Spacing.md,
    marginBottom: 4,
    borderRadius: 10,
    padding: 4,
    backgroundColor: '#f1f5f9',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 5,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  activeTabText: {
    color: Colors.primary,
  },
  tabBadge: {
    backgroundColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeActive: {
    backgroundColor: '#dbeafe',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  tabBadgeTextActive: {
    color: Colors.primary,
  },
  list: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  cardContainer: {
    marginBottom: Spacing.sm,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyState: {
    paddingTop: 80,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
