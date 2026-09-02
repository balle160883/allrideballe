import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { api } from '../api/backend';

export interface TelemetryPoint {
  id: string;
  viaje_id?: number;
  latitud: number;
  longitud: number;
  velocidad?: number;
  timestamp: string; // ISO 8601
}

const TELEMETRY_QUEUE_KEY = '@pending_telemetry_queue';
const MAX_QUEUE_SIZE = 2500; // Máximo de puntos retenidos offline (~3.5 horas a 5s/punto)
const BATCH_SIZE = 50;        // Cantidad de puntos por petición HTTP

type QueueSubscriber = (pendingCount: number, isOnline: boolean, isSyncing: boolean) => void;

class TelemetryQueueManager {
  private isSyncing = false;
  private subscribers: Set<QueueSubscriber> = new Set();
  private lastOnlineState = true;
  private netInfoUnsubscribe: (() => void) | null = null;

  constructor() {
    this.initNetworkMonitoring();
  }

  /**
   * Monitorea la conectividad celular/WiFi en tiempo real
   */
  private initNetworkMonitoring() {
    this.netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = !!(state.isConnected && state.isInternetReachable !== false);
      const stateChanged = isOnline !== this.lastOnlineState;
      this.lastOnlineState = isOnline;

      if (stateChanged) {
        console.log(`[TelemetryQueue] Conectividad cambiada: ${isOnline ? '🟢 En línea' : '🔴 Sin conexión'}`);
        this.notifySubscribers();
      }

      // Si recuperamos conexión, sincronizar de inmediato
      if (isOnline) {
        this.syncPendingLocations().catch(err => {
          console.log('[TelemetryQueue] Error en sincronización por reconexión:', err?.message);
        });
      }
    });
  }

  /**
   * Comprueba si el dispositivo tiene salida a internet
   */
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable !== false);
  }

  /**
   * Obtiene todos los puntos de telemetría encolados localmente
   */
  async getQueue(): Promise<TelemetryPoint[]> {
    try {
      const raw = await AsyncStorage.getItem(TELEMETRY_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error('[TelemetryQueue] Error al leer la cola:', err);
      return [];
    }
  }

  /**
   * Obtiene la cantidad de puntos pendientes de sincronización
   */
  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Encola un punto GPS en AsyncStorage si no hay señal o si la transmisión en vivo falló
   */
  async enqueueLocation(point: Omit<TelemetryPoint, 'id' | 'timestamp'> & { timestamp?: string }): Promise<number> {
    try {
      const queue = await this.getQueue();

      const newPoint: TelemetryPoint = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        viaje_id: point.viaje_id,
        latitud: point.latitud,
        longitud: point.longitud,
        velocidad: point.velocidad,
        timestamp: point.timestamp || new Date().toISOString(),
      };

      // Si se excede el límite máximo de seguridad, descartar los más antiguos
      let updated = [...queue, newPoint];
      if (updated.length > MAX_QUEUE_SIZE) {
        updated = updated.slice(updated.length - MAX_QUEUE_SIZE);
      }

      await AsyncStorage.setItem(TELEMETRY_QUEUE_KEY, JSON.stringify(updated));
      console.log(`[TelemetryQueue] Punto GPS guardado en cola local (Total acumulado: ${updated.length})`);

      this.notifySubscribers(updated.length);

      // Si estamos online, intentar vaciar la cola
      if (this.lastOnlineState && !this.isSyncing) {
        this.syncPendingLocations();
      }

      return updated.length;
    } catch (err) {
      console.error('[TelemetryQueue] Error al encolar punto GPS:', err);
      return 0;
    }
  }

  /**
   * Vacía la cola en lotes enviándolos al endpoint masivo del backend
   */
  async syncPendingLocations(): Promise<{ synced: number; remaining: number }> {
    if (this.isSyncing) {
      return { synced: 0, remaining: await this.getPendingCount() };
    }

    const online = await this.isOnline();
    if (!online) {
      console.log('[TelemetryQueue] Sincronización omitida: sin conexión a internet');
      return { synced: 0, remaining: await this.getPendingCount() };
    }

    let queue = await this.getQueue();
    if (queue.length === 0) {
      return { synced: 0, remaining: 0 };
    }

    this.isSyncing = true;
    this.notifySubscribers(queue.length);
    let totalSynced = 0;

    console.log(`[TelemetryQueue] Iniciando sincronización de ${queue.length} puntos de telemetría offline...`);

    try {
      while (queue.length > 0) {
        const batch = queue.slice(0, BATCH_SIZE);

        try {
          const payload = batch.map(p => ({
            viaje_id: p.viaje_id,
            latitud: p.latitud,
            longitud: p.longitud,
            velocidad: p.velocidad,
            timestamp: p.timestamp,
          }));

          await api.post('/transporte/locations/batch', { locations: payload });

          totalSynced += batch.length;
          queue = queue.slice(batch.length);
          await AsyncStorage.setItem(TELEMETRY_QUEUE_KEY, JSON.stringify(queue));
          console.log(`[TelemetryQueue] Sincronizados ${batch.length} puntos. Restantes: ${queue.length}`);
          this.notifySubscribers(queue.length);
        } catch (postErr: any) {
          console.warn('[TelemetryQueue] Fallo al enviar lote a /transporte/locations/batch:', postErr?.message);
          // Interrumpir ciclo para reintentar más adelante
          break;
        }
      }
    } finally {
      this.isSyncing = false;
      this.notifySubscribers(queue.length);
    }

    return { synced: totalSynced, remaining: queue.length };
  }

  /**
   * Suscribe componentes de React a cambios de conteo o conectividad
   */
  subscribe(callback: QueueSubscriber): () => void {
    this.subscribers.add(callback);
    // Notificación inicial inmediata
    this.getPendingCount().then(count => {
      callback(count, this.lastOnlineState, this.isSyncing);
    });

    return () => {
      this.subscribers.delete(callback);
    };
  }

  private async notifySubscribers(countOverride?: number) {
    const count = countOverride !== undefined ? countOverride : await this.getPendingCount();
    for (const sub of this.subscribers) {
      try {
        sub(count, this.lastOnlineState, this.isSyncing);
      } catch (e) {
        console.error('[TelemetryQueue] Error notificando a suscriptor:', e);
      }
    }
  }

  /**
   * Limpia recursos
   */
  destroy() {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    this.subscribers.clear();
  }
}

export const TelemetryQueueService = new TelemetryQueueManager();
