import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SectionList, 
  ActivityIndicator, 
  RefreshControl,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { useGroupedVisitas, Visita } from '../hooks/useVisitas';
import VisitaCard from '../components/VisitaCard';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProximityAlert } from '../hooks/useProximityAlert';

export default function VisitasScreen({ navigation }: any) {
  const { sections, loading, refresh } = useGroupedVisitas();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'pendientes' | 'realizadas'>('pendientes');
  
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [])
  );

  const handleVisitaPress = (visita: Visita) => {
    navigation.navigate('DetalleVisita', { visita });
  };

  // Activa alertas de proximidad basadas en la lista original completa
  const allVisitas = sections.reduce((acc: any[], curr: any) => [...acc, ...curr.data], []);
  useProximityAlert(allVisitas, handleVisitaPress);

  const filteredSections = React.useMemo(() => {
    // 1. Filtrar por pestaña primero
    let baseSections = sections.map((section: any) => ({
      ...section,
      data: section.data.filter((visita: Visita) => 
        activeTab === 'pendientes' ? !visita.isRealizada : visita.isRealizada
      )
    })).filter((section: any) => section.data.length > 0);

    // 2. Filtrar por búsqueda
    if (!searchQuery) return baseSections;
    const lowerQuery = searchQuery.toLowerCase();
    
    return baseSections.map((section: any) => ({
      ...section,
      data: section.data.filter((visita: Visita) => 
        visita.colonia?.toLowerCase().includes(lowerQuery) || 
        visita.domicilio?.toLowerCase().includes(lowerQuery) ||
        visita.nombre?.toLowerCase().includes(lowerQuery)
      )
    })).filter((section: any) => section.data.length > 0);
  }, [sections, searchQuery, activeTab]);



  if (loading && sections.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.textMuted} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Buscar por ruta o destino..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pendientes' && styles.activeTab]} 
          onPress={() => setActiveTab('pendientes')}
        >
          <MaterialCommunityIcons 
            name="clock-outline" 
            size={18} 
            color={activeTab === 'pendientes' ? Colors.primary : Colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'pendientes' && styles.activeTabText]}>
            Activas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'realizadas' && styles.activeTab]} 
          onPress={() => setActiveTab('realizadas')}
        >
          <MaterialCommunityIcons 
            name="check-circle-outline" 
            size={18} 
            color={activeTab === 'realizadas' ? Colors.primary : Colors.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'realizadas' && styles.activeTabText]}>
            Completadas
          </Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={filteredSections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VisitaCard visita={item} onPress={handleVisitaPress} />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="map-marker" size={16} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>SERVICIO: {title}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name={activeTab === 'pendientes' ? "playlist-check" : "history"} 
              size={64} 
              color={Colors.border} 
            />
            <Text style={styles.emptyText}>
              {activeTab === 'pendientes' 
                ? "No tienes rutas activas para hoy." 
                : "No hay rutas completadas registradas aún."}
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: Spacing.md,
    marginBottom: 0,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.md,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.md,
    borderRadius: Spacing.sm,
    padding: 4,
    backgroundColor: '#f1f5f9',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowS: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    }
  } as any,
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  activeTabText: {
    color: Colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe', // Sky 100
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  list: {
    padding: Spacing.md,
  },
  emptyState: {
    paddingTop: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
});
