import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api/backend';
import { CameraView, useCameraPermissions } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegistroVisitaScreen({ route, navigation }: any) {
  const { visita, onScanSuccess } = route.params;
  const [loading, setLoading] = useState(false);
  const [cardId, setCardId] = useState('');
  const [reportType, setReportType] = useState('retraso');
  const [reportDesc, setReportDesc] = useState('');
  
  // Lógica de cámara y escaneo
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);

  const viajeId = visita.viaje_id || visita.id;

  // Lógica de sincronización offline al recuperar conexión
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        syncOfflineAbordajes();
      }
    });

    return () => unsubscribe();
  }, []);

  const syncOfflineAbordajes = async () => {
    try {
      const stored = await AsyncStorage.getItem('@offline_abordajes');
      if (!stored) return;

      const queue = JSON.parse(stored);
      if (queue.length === 0) return;

      console.log(`[Offline Sync] Sincronizando ${queue.length} abordajes pendientes...`);
      const remaining: any[] = [];
      let successCount = 0;

      for (const item of queue) {
        try {
          await api.post(`/transporte/viajes/${item.viajeId}/abordar`, {
            identificador_tarjeta: item.identificador_tarjeta
          });
          successCount++;
        } catch (e: any) {
          // Si el backend indica que ya está abordado (o es idempotente), lo removemos
          if (e.message && (e.message.includes('ya abordó') || e.message.includes('previamente') || e.message.includes('confirmado'))) {
            successCount++;
          } else {
            remaining.push(item);
          }
        }
      }

      await AsyncStorage.setItem('@offline_abordajes', JSON.stringify(remaining));

      if (successCount > 0) {
        Alert.alert(
          '📶 Sincronización Exitosa',
          `Se han sincronizado con éxito ${successCount} abordajes guardados localmente.`
        );
        if (onScanSuccess) onScanSuccess();
      }
    } catch (err) {
      console.error('Error al sincronizar abordajes offline:', err);
    }
  };

  const validateCardDirect = async (scannedCardId: string) => {
    if (!scannedCardId.trim()) return;

    setLoading(true);
    try {
      const state = await NetInfo.fetch();
      
      if (!state.isConnected) {
        // Modo Offline: Guardar localmente
        const stored = await AsyncStorage.getItem('@offline_abordajes');
        const queue = stored ? JSON.parse(stored) : [];
        
        const exists = queue.some(
          (item: any) => item.viajeId === viajeId && item.identificador_tarjeta === scannedCardId.trim()
        );
        
        if (!exists) {
          queue.push({
            viajeId,
            identificador_tarjeta: scannedCardId.trim(),
            timestamp: new Date().toISOString()
          });
          await AsyncStorage.setItem('@offline_abordajes', JSON.stringify(queue));
        }

        Alert.alert(
          '🎟️ Abordaje Local Guardado',
          'Sin conexión a internet. El boleto fue validado y guardado de manera local. Se sincronizará automáticamente al recuperar la señal.'
        );
        setCardId('');
        if (onScanSuccess) onScanSuccess();
        navigation.goBack();
        return;
      }

      // Proceso normal online
      const response = await api.post(`/transporte/viajes/${viajeId}/abordar`, {
        identificador_tarjeta: scannedCardId.trim()
      });

      Alert.alert(
        '🎟️ Pasajero Abordado',
        `Validado con éxito: ${response.reserva.pasajero_nombre || 'Pasajero'} en Asiento #${response.reserva.asiento_numero || 'N/A'}`
      );
      setCardId('');
      if (onScanSuccess) onScanSuccess();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error de Validación', e.message || 'La tarjeta/código no tiene una reservación activa para este viaje.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateCard = () => {
    if (!cardId.trim()) {
      Alert.alert('Error', 'Por favor ingresa o escanea el ID de la tarjeta del pasajero.');
      return;
    }
    validateCardDirect(cardId);
  };

  const handleStartScanning = async () => {
    if (!permission) {
      return;
    }
    if (!permission.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        Alert.alert('Permiso Denegado', 'Se requiere acceso a la cámara para escanear códigos QR.');
        return;
      }
    }
    setIsScanning(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setIsScanning(false);
    if (data) {
      setCardId(data);
      validateCardDirect(data);
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
        viaje_id: Number(viajeId),
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
    <>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Validador & Alertas</Text>
        <Text style={styles.subtitle}>{visita.ruta_nombre || visita.nombre}</Text>
        <Text style={styles.cuenta}>Viaje ID: #{viajeId}</Text>
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
            style={[styles.scanButton, { backgroundColor: '#6366f1' }]} 
            onPress={handleStartScanning}
          >
            <MaterialCommunityIcons name="camera" size={24} color="#fff" />
          </TouchableOpacity>
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
        <Text style={styles.helpText}>Toca el botón de cámara para escanear el QR o ingresa la tarjeta manualmente.</Text>
      </View>

      {/* Incident / Delay Reports */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificar Incidencia en Ruta</Text>
        <Text style={styles.inputLabel}>Tipo de Retraso/Alerta</Text>
        <View style={styles.optionsGrid}>
          {[
            { label: 'Desvío', value: 'desvio_ruta', icon: 'directions-fork' },
            { label: 'Retraso', value: 'atraso_proyectado', icon: 'bus-clock' },
            { label: 'Inicio Tardío', value: 'inicio_tardio', icon: 'clock-alert' },
            { label: 'No Abordado', value: 'no_abordado', icon: 'account-off' },
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

    {/* Modal para el lector de cámara QR */}
    <Modal
      visible={isScanning}
      animationType="slide"
      onRequestClose={() => setIsScanning(false)}
    >
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'code128', 'ean13', 'upc_a'],
          }}
          onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
        />
        
        {/* Visor / Overlay del Escáner */}
        <View style={styles.overlayContainer}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddleRow}>
            <View style={styles.overlaySide} />
            <View style={styles.scannerCutout}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              <View style={styles.scanLine} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.scanPromptText}>Apunta la cámara al código QR o de barras del boleto</Text>
            <TouchableOpacity 
              style={styles.cancelScanButton} 
              onPress={() => setIsScanning(false)}
            >
              <Text style={styles.cancelScanButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </>
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
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddleRow: {
    flexDirection: 'row',
    height: 250,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scannerCutout: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  overlayBottom: {
    flex: 1.5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    paddingTop: 30,
    gap: 30,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#10b981',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: '50%',
    height: 2,
    backgroundColor: '#10b981',
    opacity: 0.8,
  },
  scanPromptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cancelScanButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  cancelScanButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
