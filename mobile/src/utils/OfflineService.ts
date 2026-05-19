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
  }
};
