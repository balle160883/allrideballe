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
import * as Speech from 'expo-speech';
import { HapticFeedback } from '../utils/Haptics';

export default function RegistroVisitaScreen({ route, navigation }: any) {
  const { visita, onScanSuccess } = route.params;
  const [loading, setLoading] = useState(false);
  const [cardId, setCardId] = useState('');
  const [reportType, setReportType] = useState('retraso');
  const [reportDesc, setReportDesc] = useState('');
  
  // Lógica de cámara y escaneo profesional
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [lastBoardedPassenger, setLastBoardedPassenger] = useState<any | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);

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
    setScanCooldown(true);
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

        // Confirmación de éxito háptica y de audio
        HapticFeedback.success();
        Speech.speak('Boleto validado en modo fuera de línea', { language: 'es' });

        setLastBoardedPassenger({
          nombre: `Pasajero (${scannedCardId.trim()})`,
          asiento: 'Offline',
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          offline: true,
        });

        setCardId('');
        if (onScanSuccess) onScanSuccess();
        return;
      }

      // Proceso normal online
      const response = await api.post(`/transporte/viajes/${viajeId}/abordar`, {
        identificador_tarjeta: scannedCardId.trim()
      });

      // Confirmación de éxito háptica y de audio
      HapticFeedback.success();
      Speech.speak('Boleto validado con éxito', { language: 'es' });

      setLastBoardedPassenger({
        nombre: response.reserva?.pasajero_nombre || 'Pasajero Confirmado',
        asiento: response.reserva?.asiento_numero ? `#${response.reserva.asiento_numero}` : 'General',
        email: response.reserva?.pasajero_email || '',
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        offline: false,
      });

      setCardId('');
      if (onScanSuccess) onScanSuccess();
    } catch (e: any) {
      // Confirmación de error háptica y de audio
      HapticFeedback.error();
      Speech.speak('Boleto no válido', { language: 'es' });

      Alert.alert('Error de Validación', e.message || 'La tarjeta/código no tiene una reservación activa para este viaje.');
      setScanCooldown(false);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateCard = () => {
    if (!cardId.trim()) {
      HapticFeedback.error();
      Alert.alert('Error', 'Por favor ingresa o escanea el ID de la tarjeta del pasajero.');
      return;
    }
    validateCardDirect(cardId);
  };

  const handleStartScanning = async () => {
    HapticFeedback.light();
    if (!permission) {
      return;
    }
    if (!permission.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        HapticFeedback.error();
        Alert.alert('Permiso Denegado', 'Se requiere acceso a la cámara para escanear códigos QR.');
        return;
      }
    }
    setIsScanning(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (loading || scanCooldown || lastBoardedPassenger) return;
    HapticFeedback.medium();
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

    {/* Modal para el lector de cámara QR Profesional */}
    <Modal
      visible={isScanning}
      animationType="slide"
      onRequestClose={() => {
        setIsScanning(false);
        setLastBoardedPassenger(null);
        setScanCooldown(false);
      }}
    >
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          enableTorch={isTorchOn}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'code128', 'ean13', 'upc_a'],
          }}
          onBarcodeScanned={isScanning && !lastBoardedPassenger && !loading ? handleBarcodeScanned : undefined}
        />
        
        {/* Barra Superior de Herramientas: Flash, Girar y Salir */}
        <View style={styles.cameraTopBar}>
          <TouchableOpacity 
            style={[styles.cameraToolBtn, isTorchOn && styles.cameraToolBtnActive]} 
            onPress={() => setIsTorchOn(!isTorchOn)}
          >
            <MaterialCommunityIcons 
              name={isTorchOn ? "flashlight" : "flashlight-off"} 
              size={22} 
              color="#fff" 
            />
            <Text style={styles.cameraToolText}>{isTorchOn ? "Flash ON" : "Flash"}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cameraToolBtn} 
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          >
            <MaterialCommunityIcons name="camera-flip" size={22} color="#fff" />
            <Text style={styles.cameraToolText}>Girar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.cameraToolBtn, { backgroundColor: 'rgba(239, 68, 68, 0.4)' }]} 
            onPress={() => {
              setIsScanning(false);
              setLastBoardedPassenger(null);
              setScanCooldown(false);
            }}
          >
            <MaterialCommunityIcons name="close" size={22} color="#fff" />
            <Text style={styles.cameraToolText}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        {/* Visor / Overlay del Escáner */}
        {!lastBoardedPassenger ? (
          <View style={styles.overlayContainer}>
            <View style={styles.overlayTop}>
              <Text style={styles.scanInstructionText}>Enfoca el código QR o credencial en el recuadro</Text>
            </View>
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
              <Text style={styles.scanPromptText}>Escaneo continuo activado</Text>
            </View>
          </View>
        ) : (
          /* Tarjeta de Confirmación de Abordaje Exitoso */
          <View style={styles.confirmedOverlay}>
            <View style={styles.confirmedCard}>
              <View style={styles.confirmedHeader}>
                <MaterialCommunityIcons name="check-decagram" size={48} color="#10b981" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.confirmedTitle}>¡Pasajero Abordado!</Text>
                  <Text style={styles.confirmedTime}>Hora: {lastBoardedPassenger.hora}</Text>
                </View>
                {lastBoardedPassenger.offline && (
                  <View style={styles.offlineTag}>
                    <Text style={styles.offlineTagText}>OFFLINE</Text>
                  </View>
                )}
              </View>

              <View style={styles.confirmedDivider} />

              <View style={styles.confirmedBody}>
                <Text style={styles.confirmedName}>{lastBoardedPassenger.nombre}</Text>
                <View style={styles.confirmedSeatRow}>
                  <MaterialCommunityIcons name="seat-passenger" size={24} color={Colors.primary} />
                  <Text style={styles.confirmedSeat}>Asiento: <Text style={styles.confirmedSeatNumber}>{lastBoardedPassenger.asiento}</Text></Text>
                </View>
              </View>

              <View style={styles.confirmedActions}>
                <TouchableOpacity
                  style={[styles.confirmedBtn, { backgroundColor: '#10b981' }]}
                  onPress={() => {
                    setLastBoardedPassenger(null);
                    setScanCooldown(false);
                  }}
                >
                  <MaterialCommunityIcons name="qrcode-scan" size={20} color="#fff" />
                  <Text style={styles.confirmedBtnText}>Siguiente Pasajero</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmedBtn, { backgroundColor: '#475569' }]}
                  onPress={() => {
                    setIsScanning(false);
                    setLastBoardedPassenger(null);
                    setScanCooldown(false);
                  }}
                >
                  <Text style={styles.confirmedBtnText}>Terminar Escaneo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
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
  cameraTopBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  cameraToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  cameraToolBtnActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  cameraToolText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  scanInstructionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 30,
  },
  confirmedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 200,
  },
  confirmedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10b981',
  },
  confirmedTime: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  offlineTag: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  offlineTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  confirmedDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  confirmedBody: {
    gap: 8,
  },
  confirmedName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  confirmedSeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  confirmedSeat: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  confirmedSeatNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.primary,
  },
  confirmedActions: {
    marginTop: 20,
    gap: 10,
  },
  confirmedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  confirmedBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
