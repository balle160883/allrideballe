import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { OfflineService } from './OfflineService';
import { TelemetryQueueService } from './TelemetryQueueService';

const SYNC_GESTIONES_TASK = 'SYNC_GESTIONES_TASK';

export const SyncTask = {
  async registerSyncTask() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_GESTIONES_TASK);
      if (isRegistered) {
        console.log('Task already registered');
        return;
      }

      await BackgroundFetch.registerTaskAsync(SYNC_GESTIONES_TASK, {
        minimumInterval: 1 * 60, // 1 minuto
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background Sync Task Registered');
    } catch (err) {
      console.log('Background Fetch registration failed:', err);
    }
  }
};

TaskManager.defineTask(SYNC_GESTIONES_TASK, async () => {
  try {
    console.log('[SyncTask] Ejecutando sincronización en segundo plano...');
    await Promise.allSettled([
      TelemetryQueueService.syncPendingLocations(),
      OfflineService.syncPendingAbordajes(),
      OfflineService.syncPendingAlertas(),
      OfflineService.syncPendingGestiones(),
    ]);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[SyncTask] Error en sync background:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
