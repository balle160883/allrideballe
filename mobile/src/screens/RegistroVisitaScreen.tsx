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

export default function RegistroVisitaScreen({ route, navigation }: any) {
  const { visita, onScanSuccess } = route.params;
  const [loading, setLoading] = useState(false);
  const [cardId, setCardId] = useState('');
  const [reportType, setReportType] = useState('retraso');
  const [reportDesc, setReportDesc] = useState('');

  const handleValidateCard = async () => {
    if (!cardId.trim()) {
      Alert.alert('Error', 'Por favor ingresa o escanea el ID de la tarjeta del pasajero.');
      return;
    }

    setLoading(true);
    try {
      // Registrar abordaje por RFID / ID tarjeta
      const response = await api.post(`/transporte/viajes/${visita.id}/abordar`, {
        identificador_tarjeta: cardId.trim()
      });

      Alert.alert('Éxito', `Abordaje confirmado: ${response.reserva.pasajero_nombre} en Asiento #${response.reserva.asiento_numero}`);
      setCardId('');
      if (onScanSuccess) onScanSuccess();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'La tarjeta no tiene una reservación activa para este viaje.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAlert = async () => {
    if (!reportDesc.trim()) {
      Alert.alert('Error', 'Describe el incidente antes de enviarlo.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/transporte/alertas`, {
        viaje_id: Number(visita.id),
        tipo: reportType,
        descripcion: reportDesc.trim()
      });

      Alert.alert('Alerta Reportada', 'El incidente fue enviado a la central de monitoreo.');
      setReportDesc('');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo enviar el reporte: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Validador & Alertas</Text>
        <Text style={styles.subtitle}>{visita.nombre}</Text>
        <Text style={styles.cuenta}>Viaje ID: #{visita.id}</Text>
      </View>

      {/* RFID Validation Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Escanear Boleto / RFID</Text>
        <Text style={styles.inputLabel}>Número de Tarjeta de Personal</Text>
        <View style={styles.scanRow}>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            placeholder="Ej: RFID-4029-X"
            value={cardId}
            onChangeText={setCardId}
            autoCapitalize="none"
          />
          <TouchableOpacity 
            style={styles.scanButton} 
            onPress={handleValidateCard}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <MaterialCommunityIcons name="card-search-outline" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.helpText}>Puedes simular el escaneo escribiendo la tarjeta y presionando validar.</Text>
      </View>

      {/* Incident / Delay Reports */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificar Incidencia en Ruta</Text>
        <Text style={styles.inputLabel}>Tipo de Retraso/Alerta</Text>
        <View style={styles.optionsGrid}>
          {[
            { label: 'Tráfico', value: 'retraso', icon: 'bus-clock' },
            { label: 'Desvío', value: 'desvio', icon: 'directions-fork' },
            { label: 'Avería', value: 'accidente', icon: 'engine-outline' },
            { label: 'Obstrucción', value: 'bloqueo', icon: 'alert-octagon-outline' },
          ].map((opt) => (
            <TouchableOpacity 
              key={opt.value}
              style={[
                styles.optionCard,
                reportType === opt.value && styles.optionCardSelected
              ]}
              onPress={() => setReportType(opt.value)}
            >
              <MaterialCommunityIcons 
                name={opt.icon as any} 
                size={24} 
                color={reportType === opt.value ? '#fff' : Colors.primary} 
              />
              <Text style={[
                styles.optionLabel,
                reportType === opt.value && styles.optionLabelSelected
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Descripción de la Situación</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Ej: Tráfico lento por obras públicas en Av. Vallarta, estimado 15 min de retraso."
          multiline
          numberOfLines={4}
          value={reportDesc}
          onChangeText={setReportDesc}
        />

        <TouchableOpacity 
          style={[styles.saveButton, loading && { opacity: 0.7 }]} 
          onPress={handleSendAlert}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Enviar Alerta a Central</Text>
            </>
          )}
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
    fontWeight: 'bold',
  },
  section: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  scanRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
  scanButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Spacing.sm,
  },
  helpText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  optionCard: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    height: 72,
  },
  optionCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
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
    height: 100,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    padding: Spacing.md,
    borderRadius: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 56,
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
