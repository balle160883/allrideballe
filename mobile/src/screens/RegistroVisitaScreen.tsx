import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api/backend';
import { useAuth } from '../context/AuthContext';
import { BluetoothPrinter, TicketType } from '../utils/BluetoothPrinter';
import { useVisitas } from '../hooks/useVisitas';
import { OfflineService } from '../utils/OfflineService';


export default function RegistroVisitaScreen({ route, navigation }: any) {
  const { visita: initialVisita } = route.params;
  const { user } = useAuth();
  const { visitas } = useVisitas();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [montoPromesa, setMontoPromesa] = useState('');
  const [fechaPromesa, setFechaPromesa] = useState(new Date().toLocaleDateString('es-MX'));

  // Sincronizamos con los datos en tiempo real si el hook los actualiza
  const visita = visitas.find(v => v.id === initialVisita.id) || initialVisita;

  const handlePrint = async (tipo: TicketType) => {
    await BluetoothPrinter.generateTicket({
      tipo: tipo,
      nombreSocio: visita.nombre,
      socioId: visita.socioId,
      cuenta: visita.numCuenta,
      saldoAtrasado: visita.saldoAlDia,
      gestorNombre: user?.gestor || 'Gestor CPO',
      gestorTelefono: '3339421050 ext. 1110, 1111, 1194',
      observaciones: observaciones,
      folioConvenio: tipo === 'promesa' ? `#CV-${Date.now().toString().slice(-6)}` : undefined,
      nombreAval: visita.tipo.includes('Aval') ? visita.nombre : undefined,
      titularNombre: visita.tipo.includes('Aval') ? (visita.nombreSocio || 'Titular del Crédito') : undefined,
      titularSocioId: visita.tipo.includes('Aval') ? visita.socioId : undefined,
    });
  };

  const resultados = [
    { label: 'Abordado QR', value: 'visita_exitosa', icon: 'qrcode-scan' },
    { label: 'Tarjeta/Físico', value: 'promesa_pago', icon: 'card-bulleted' },
    { label: 'No Abordó', value: 'no_encontrado', icon: 'account-cancel' },
    { label: 'Retrasado', value: 'reclamacion', icon: 'bus-alert' },
    { label: 'Contingencia', value: 'otro', icon: 'alert-decagram' },
  ];

  const handleSave = async () => {
    if (!resultado) {
      Alert.alert('Error', 'Por favor selecciona un resultado del abordaje.');
      return;
    }

    if (resultado === 'promesa_pago') {
      if (!montoPromesa || !fechaPromesa) {
        Alert.alert('Error', 'Para registro físico, el número de asiento y la fecha son obligatorios.');
        return;
      }
    }

    setLoading(true);
    try {
      const isOnline = await OfflineService.isOnline();

      // Preparar datos para sincronización (tanto online como offline)
      const interactionData = {
        socio_id: visita.socioId,
        gestor_id: user?.id,
        num_cuenta: visita.numCuenta,
        tipo_contacto: 'abordaje',
        resultado: resultado,
        descripcion: observaciones,
        sujeto_tipo: 'Pasajero',
        fecha_gestion: new Date().toISOString(),
      };

      // Si es reserva manual
      let promesaData = null;
      if (resultado === 'promesa_pago') {
        const parts = fechaPromesa.split('/');
        const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : null;
        promesaData = {
          monto_prometido: parseFloat(montoPromesa.replace(',', '')),
          fecha_promesa: isoDate || new Date().toISOString().split('T')[0],
          estado: 'pendiente'
        };
      }

      // Siempre marcamos como VISITADO para que pase a la pestaña de "Completadas"
      const updateAsignacion = { numCuenta: visita.numCuenta, situacion: 'VISITADO' };

      if (!isOnline) {
        // MODO OFFLINE: Guardar localmente
        await OfflineService.saveGestionOffline({
          interaction: { ...interactionData, prestamo_id: visita.prestamoId },
          promesa: promesaData,
          updateAsignacion: updateAsignacion
        });

        Alert.alert(
          'Modo Offline', 
          'No tienes conexión. El abordaje se guardó localmente y se sincronizará automáticamente cuando recuperes señal.',
          [{ text: 'Entendido', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // MODO ONLINE: Proceder normalmente
      const interaction = await api.post('/crm/interacciones', {
        ...interactionData,
        prestamo_id: visita.prestamoId || null
      });

      if (resultado === 'promesa_pago' && promesaData) {
        await api.post('/crm/promesas', {
          ...promesaData,
          prestamo_id: interaction.prestamo_id || visita.prestamoId,
          interaccion_id: interaction.id,
        });
      }

      // Actualizar asignación
      if (updateAsignacion) {
        await api.patch(`/portfolio/asignaciones/${updateAsignacion.numCuenta}`, {
          'SITUACIÓN DEL CRÉDITO': updateAsignacion.situacion
        });
      }

      Alert.alert('Éxito', 'Abordaje registrado correctamente.', [
        { text: 'Aceptar', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        'Error de Red', 
        'Ocurrió un error al conectar con el servidor. ¿Deseas guardar el registro localmente para reintentar después?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Guardar Offline', 
            onPress: async () => {
              await OfflineService.saveGestionOffline({
                interaction: {
                  socio_id: visita.socioId,
                  gestor_id: user?.id,
                  tipo_contacto: 'abordaje',
                  resultado: resultado,
                  descripcion: observaciones,
                  sujeto_tipo: 'Pasajero',
                  fecha_gestion: new Date().toISOString(),
                },
                promesa: resultado === 'promesa_pago' ? {
                    monto_prometido: parseFloat(montoPromesa.replace(',', '')),
                    fecha_promesa: new Date().toISOString(),
                    estado: 'pendiente'
                } : undefined,
                updateAsignacion: { numCuenta: visita.numCuenta, situacion: 'VISITADO' }
              });
              navigation.goBack();
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Control de Abordaje</Text>
        <Text style={styles.subtitle}>{visita.nombre}</Text>
        <Text style={styles.cuenta}>Viaje ID: {visita.numCuenta}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Vehículo</Text>
          <Text style={styles.statValue}>Bus Mercedes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Capacidad</Text>
          <Text style={styles.statValue}>42 Pasajeros</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Ruta</Text>
          <Text style={styles.statValue}>Planta Norte</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado de Abordaje</Text>
        <View style={styles.optionsGrid}>
          {resultados.map((opt) => (
            <TouchableOpacity 
              key={opt.value}
              style={[
                styles.optionCard,
                resultado === opt.value && styles.optionCardSelected
              ]}
              onPress={() => setResultado(opt.value)}
            >
              <MaterialCommunityIcons 
                name={opt.icon as any} 
                size={28} 
                color={resultado === opt.value ? '#fff' : Colors.primary} 
              />
              <Text style={[
                styles.optionLabel,
                resultado === opt.value && styles.optionLabelSelected
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {resultado === 'promesa_pago' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles de Abordaje Físico</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Asiento Número</Text>
              <TextInput
                style={styles.textInput}
                placeholder="14"
                keyboardType="numeric"
                value={montoPromesa}
                onChangeText={setMontoPromesa}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Fecha Viaje (DD/MM/AAAA)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: 25/04/2026"
                value={fechaPromesa}
                onChangeText={setFechaPromesa}
              />
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Observaciones / Incidencias</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Escribe aquí novedades del viaje o del pasajero..."
          multiline
          numberOfLines={4}
          value={observaciones}
          onChangeText={setObservaciones}
        />
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, loading && { opacity: 0.7 }]} 
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons name="content-save-outline" size={24} color="#fff" />
            <Text style={styles.saveButtonText}>Guardar Gestión</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.text,
    marginTop: 4,
  },
  cuenta: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  avalDetail: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: '#f8fafc',
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
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Spacing.sm,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionCard: {
    width: '31%',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1,
  },
  optionCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    color: Colors.text,
  },
  optionLabelSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  textArea: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Spacing.sm,
    padding: Spacing.md,
    fontSize: 16,
    textAlignVertical: 'top',
    height: 120,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 56,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
