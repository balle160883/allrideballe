import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BluetoothPrinter } from '../utils/BluetoothPrinter';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/backend';
import { Linking, Platform } from 'react-native';
import { OfflineService } from '../utils/OfflineService';

export default function DetalleVisitaScreen({ route, navigation }: any) {
  const { visita } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const esVencido = visita.situacion?.toUpperCase().includes('VENCID') || visita.diasMora > 0;
  const statusColor = esVencido ? '#ef4444' : Colors.success;

  const handlePrint = async () => {
    setLoading(true);
    try {
      await BluetoothPrinter.generateTicket({
        tipo: visita.tipo.includes('Aval') ? 'aval' : 'aviso',
          nombreSocio: visita.tipo.includes('Aval') ? (visita.nombreSocio || 'Socio Titular') : visita.nombre,
          socioId: visita.socioId,
          cuenta: visita.numCuenta,
          saldoAtrasado: visita.saldoAlDia,
          gestorNombre: user?.gestor || 'Gestor CPO',
          gestorTelefono: '3339421050 ext. 1110, 1111, 1194',
          nombreAval: visita.tipo.includes('Aval') ? visita.nombre : undefined,
          titularNombre: visita.tipo.includes('Aval') ? (visita.nombreSocio || 'Socio Titular') : undefined,
          titularSocioId: visita.tipo.includes('Aval') ? visita.socioId : undefined,
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el ticket.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrar = () => {
    navigation.navigate('RegistroVisita', { visita });
  };

  const handleCerrarVisita = async () => {
    Alert.alert(
      'Cerrar Visita',
      '¿Estás seguro de que deseas marcar esta visita como completada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            setLoading(true);
            try {
              const isOnline = await OfflineService.isOnline();
              
              if (!isOnline) {
                 await OfflineService.saveGestionOffline({
                   updateAsignacion: {
                     numCuenta: visita.numCuenta,
                     situacion: 'VISITADO'
                   }
                 });
                 Alert.alert('Modo Offline', 'Visita cerrada (guardada para sincronizar luego).');
                 navigation.goBack();
                 return;
              }

              await api.patch(`/portfolio/asignaciones/${visita.numCuenta}`, {
                'SITUACIÓN DEL CRÉDITO': 'VISITADO'
              });

              Alert.alert('Éxito', 'Visita cerrada correctamente.');
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', 'No se pudo cerrar la visita: ' + e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReabrirVisita = async () => {
    Alert.alert(
      'Volver a realizar visita',
      '¿Deseas marcar esta visita como pendiente nuevamente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            setLoading(true);
            try {
              const isOnline = await OfflineService.isOnline();
              
              if (!isOnline) {
                 Alert.alert('Error', 'Esta acción requiere conexión a internet.');
                 return;
              }

              // Actualizamos el estado a 'VIGENTE' (o el estado original)
              await api.patch(`/portfolio/asignaciones/${visita.numCuenta}`, {
                'SITUACIÓN DEL CRÉDITO': 'VIGENTE'
              });

              Alert.alert('Éxito', 'La visita ha sido marcada como pendiente nuevamente.');
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', 'No se pudo actualizar la visita: ' + e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };


  const handleNavigate = async () => {
    const { latitud, longitud, domicilio, colonia, municipio } = visita;
    
    // Priorizamos Waze como solicitó el usuario
    const wazeUrl = latitud && longitud 
      ? `https://waze.com/ul?ll=${latitud},${longitud}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(`${domicilio}, ${colonia}, ${municipio || ''}`)}&navigate=yes`;

    // Respaldo para Google Maps / Apple Maps
    const googleMapsUrl = latitud && longitud
      ? `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${domicilio}, ${colonia}, ${municipio || ''}`)}`;

    try {
      const canOpenWaze = await Linking.canOpenURL('waze://');
      if (canOpenWaze) {
        await Linking.openURL(wazeUrl);
      } else {
        // Si no tiene Waze, abrimos el mapa por defecto del sistema
        await Linking.openURL(googleMapsUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir la aplicación de navegación.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.tipo}>Ruta Corporativa</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{visita.isRealizada ? 'COMPLETADO' : 'EN RUTA'}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cuenta}>Viaje ID: {visita.numCuenta}</Text>
              <Text style={styles.socioId}>Vehículo: Bus 42</Text>
            </View>
        </View>
        <Text style={styles.nombre}>{visita.nombre}</Text>
        
        <View style={styles.infoRow}>
           <MaterialCommunityIcons name="map-marker" size={20} color={Colors.primary} />
           <Text style={styles.infoText}>
             {visita.domicilio || 'Sin recorrido asignado'}
           </Text>
        </View>

        <View style={styles.infoRow}>
           <MaterialCommunityIcons name="bus-clock" size={20} color={Colors.primary} />
           <Text style={styles.infoText}>Frecuencia: Diaria · 07:30 hrs</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Capacidad</Text>
          <Text style={styles.statValue}>42 Asientos</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Reservas</Text>
          <Text style={styles.statValue}>1 Ocupado</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Estado</Text>
          <Text style={styles.statValue}>Vigente</Text>
        </View>
      </View>

      <View style={styles.financialSection}>
        <Text style={styles.sectionTitle}>Detalles del Servicio</Text>
        <Text style={styles.creditType}>Operador: Transportes del Valle</Text>
        
        <View style={styles.finGrid}>
          <View style={styles.finBox}>
            <Text style={styles.finLabel}>Parada Inicial</Text>
            <Text style={styles.finValue}>Plaza Central</Text>
          </View>
          <View style={styles.finBox}>
            <Text style={styles.finLabel}>Parada Final</Text>
            <Text style={[styles.finValue, { color: Colors.primary }]}>Planta Norte</Text>
          </View>
          <View style={styles.finBox}>
            <Text style={styles.finLabel}>Tipo Flota</Text>
            <Text style={styles.finValue}>Buses</Text>
          </View>
          <View style={styles.finBox}>
            <Text style={styles.finLabel}>Operación</Text>
            <Text style={[styles.finValue, { color: Colors.success }]}>Normal</Text>
          </View>
          <View style={styles.finBox}>
            <Text style={styles.finLabel}>Soporte Offline</Text>
            <Text style={styles.finValue}>Activo</Text>
          </View>
        </View>

        <View style={styles.datesRow}>
          <View style={styles.dateBox}>
            <Text style={styles.finLabel}>Último Abordaje</Text>
            <Text style={styles.dateValue}>María Gómez</Text>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.finLabel}>Siguiente Servicio</Text>
            <Text style={styles.dateValue}>11:30 hrs</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleRegistrar}>
          <MaterialCommunityIcons name="qrcode-scan" color="#fff" size={24} />
          <Text style={styles.actionButtonText}>Validar Abordaje</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.accentButton, loading && { opacity: 0.7 }]} 
          onPress={() => Alert.alert('Reservas', 'Asientos asignados:\nAsiento 14: María Gómez')}
          disabled={loading}
        >
          <MaterialCommunityIcons name="seat-passenger" color="#fff" size={24} />
          <Text style={styles.actionButtonText}>Ver Asientos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleNavigate}>
          <MaterialCommunityIcons name="navigation-variant-outline" color="#fff" size={24} />
          <Text style={styles.actionButtonText}>Iniciar Navegación</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.successButton]} 
          onPress={handleCerrarVisita}
          disabled={loading}
        >
          <MaterialCommunityIcons name="check-circle-outline" color="#fff" size={24} />
          <Text style={styles.actionButtonText}>Completar Ruta</Text>
        </TouchableOpacity>

        {visita.isRealizada && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#f59e0b' }]} 
            onPress={handleReabrirVisita}
            disabled={loading}
          >
            <MaterialCommunityIcons name="refresh" color="#fff" size={24} />
            <Text style={styles.actionButtonText}>Reiniciar Recorrido</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.history}>
         <Text style={styles.historyTitle}>Log del Viaje</Text>
         <View style={styles.historyItem}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.historyText}>Viaje programado iniciado sin incidencias.</Text>
         </View>
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
  avalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    backgroundColor: '#eff6ff',
    padding: Spacing.md,
    borderRadius: Spacing.sm,
  },
  avalText: {
    marginLeft: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
  },
  socioName: {
    fontWeight: 'bold',
    color: Colors.primary,
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
    fontSize: 16,
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
  finGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  finBox: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: Spacing.sm,
    borderRadius: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  finLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  finValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
  },
  datesRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  dateBox: {
    flex: 1,
    backgroundColor: '#e0e7ff',
    padding: Spacing.sm,
    borderRadius: Spacing.sm,
    alignItems: 'center',
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
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
  accentButton: {
    backgroundColor: Colors.accent,
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
  history: {
    padding: Spacing.lg,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  historyText: {
    color: Colors.textMuted,
    fontSize: 14,
  }
});
