import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../api/backend';

const PENDING_GESTIONES_KEY = '@pending_gestiones';

export interface PendingGestion {
  id: string;
  data: {
    interaction?: any;
    promesa?: any;
    updateAsignacion?: {
      numCuenta: string;
      situacion: string;
    };
  };
  timestamp: number;
}

export const OfflineService = {
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return !!state.isConnected && !!state.isInternetReachable;
  },

  async saveGestionOffline(gestion: PendingGestion['data']) {
    try {
      const existing = await this.getPendingGestiones();
      const newItem: PendingGestion = {
        id: Date.now().toString(),
        data: gestion,
        timestamp: Date.now(),
      };
      const updated = [...existing, newItem];
      await AsyncStorage.setItem(PENDING_GESTIONES_KEY, JSON.stringify(updated));
      console.log('Gestión guardada offline localmente');
      return true;
    } catch (error) {
      console.error('Error saving gestion offline:', error);
      return false;
    }
  },

  async getPendingGestiones(): Promise<PendingGestion[]> {
    try {
      const data = await AsyncStorage.getItem(PENDING_GESTIONES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending gestiones:', error);
      return [];
    }
  },

  async syncPendingGestiones() {
    const pending = await this.getPendingGestiones();
    if (pending.length === 0) return;

    if (!(await this.isOnline())) {
      console.log('Sync skipped: Device is offline');
      return;
    }

    console.log(`Iniciando sincronización de ${pending.length} gestiones...`);
    const remaining: PendingGestion[] = [];

    for (const item of pending) {
      try {
        // 1. Insertar interacción
        let interactionId = null;
        if (item.data.interaction) {
          const interaction = await api.post('/crm/interacciones', item.data.interaction);
          interactionId = interaction.id;
        }

        // 2. Insertar promesa si existe
        if (item.data.promesa && interactionId) {
            const promesaData = {
                ...item.data.promesa,
                interaccion_id: interactionId
            };
            await api.post('/crm/promesas', promesaData);
        }

        // 3. Actualizar asignación si aplica
        if (item.data.updateAsignacion) {
            await api.patch(`/portfolio/asignaciones/${item.data.updateAsignacion.numCuenta}`, {
                'SITUACIÓN DEL CRÉDITO': item.data.updateAsignacion.situacion
            });
        }

        console.log(`Gestión ${item.id} sincronizada con éxito.`);
      } catch (error) {
        console.error(`Error sincronizando gestión ${item.id}:`, error);
        remaining.push(item); // Re-encolar para el siguiente intento
      }
    }

    // Actualizar almacenamiento local con lo que no se pudo sincronizar
    await AsyncStorage.setItem(PENDING_GESTIONES_KEY, JSON.stringify(remaining));
  },

  // ==========================================
  // VALIDADOR QR OFFLINE Y CACHÉ DE PASAJEROS
  // ==========================================
  async cacheTripPasajeros(viajeId: number, pasajeros: any[]) {
    try {
      const key = `@passengers_viaje_${viajeId}`;
      await AsyncStorage.setItem(key, JSON.stringify(pasajeros));
      console.log(`[OfflineService] Guardados ${pasajeros.length} pasajeros en caché local para el viaje ${viajeId}`);
    } catch (e) {
      console.error('[OfflineService] Error guardando pasajeros en caché:', e);
    }
  },

  async validateQROffline(viajeId: number, qrToken: string) {
    try {
      const key = `@passengers_viaje_${viajeId}`;
      const data = await AsyncStorage.getItem(key);
      if (!data) return { valid: false, message: 'No hay lista de pasajeros guardada para validar offline' };

      const pasajeros: any[] = JSON.parse(data);
      const match = pasajeros.find(p => p.qr_code === qrToken || p.reserva_id?.toString() === qrToken || p.pasajero_id?.toString() === qrToken);

      if (match) {
        return { valid: true, pasajero: match };
      }
      return { valid: false, message: 'Código QR no encontrado en el itinerario de este viaje' };
    } catch (e: any) {
      return { valid: false, message: e.message };
    }
  },

  async saveQRAbordajeOffline(reservaId: number, viajeId: number) {
    try {
      const key = '@pending_abordajes_qr';
      const existingStr = await AsyncStorage.getItem(key);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const newScan = { reservaId, viajeId, timestamp: new Date().toISOString() };
      await AsyncStorage.setItem(key, JSON.stringify([...existing, newScan]));
      console.log('[OfflineService] Abordaje QR guardado en cola local para sincronización');
    } catch (e) {
      console.error('[OfflineService] Error al guardar abordaje QR offline:', e);
    }
  },

  async syncPendingAbordajes() {
    const key = '@pending_abordajes_qr';
    try {
      const data = await AsyncStorage.getItem(key);
      if (!data) return;
      const pending: any[] = JSON.parse(data);
      if (pending.length === 0) return;

      if (!(await this.isOnline())) return;

      console.log(`[OfflineService] Sincronizando ${pending.length} abordajes QR acumulados...`);
      const remaining: any[] = [];

      for (const item of pending) {
        try {
          await api.post('/transporte/asistencia', {
            reserva_id: item.reservaId,
            estado: 'confirmado'
          });
        } catch {
          remaining.push(item);
        }
      }

      await AsyncStorage.setItem(key, JSON.stringify(remaining));
    } catch (e) {
      console.error('[OfflineService] Error sincronizando abordajes:', e);
    }
  },

  // ==========================================
  // ALERTAS / SOS OFFLINE
  // ==========================================
  async saveAlertaOffline(alerta: {
    viaje_id: number | null;
    tipo: string;
    descripcion: string;
    latitud?: number;
    longitud?: number;
    prioridad?: string;
    timestamp?: string;
  }) {
    try {
      const key = '@pending_alertas_sos';
      const existingStr = await AsyncStorage.getItem(key);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const newAlerta = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ...alerta,
        timestamp: alerta.timestamp || new Date().toISOString(),
      };
      await AsyncStorage.setItem(key, JSON.stringify([...existing, newAlerta]));
      console.log('[OfflineService] Alerta SOS/incidente guardada offline');
      return true;
    } catch (e) {
      console.error('[OfflineService] Error guardando alerta offline:', e);
      return false;
    }
  },

  async syncPendingAlertas() {
    const key = '@pending_alertas_sos';
    try {
      const data = await AsyncStorage.getItem(key);
      if (!data) return;
      const pending: any[] = JSON.parse(data);
      if (pending.length === 0) return;

      if (!(await this.isOnline())) return;

      console.log(`[OfflineService] Sincronizando ${pending.length} alertas pendientes...`);
      const remaining: any[] = [];

      for (const item of pending) {
        try {
          await api.post('/transporte/alertas', {
            viaje_id: item.viaje_id,
            tipo: item.tipo,
            descripcion: item.descripcion,
            latitud: item.latitud,
            longitud: item.longitud,
            prioridad: item.prioridad || 'alta',
          });
          console.log(`[OfflineService] Alerta ${item.tipo} sincronizada con éxito`);
        } catch {
          remaining.push(item);
        }
      }

      await AsyncStorage.setItem(key, JSON.stringify(remaining));
    } catch (e) {
      console.error('[OfflineService] Error sincronizando alertas:', e);
    }
  }
};
