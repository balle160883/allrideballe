import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { OfflineService } from './OfflineService';

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
        minimumInterval: 1 * 60, // 1 minuto (idealmente más largo en producción, pero para este caso queremos rapidez)
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
        console.log('Background Sync task executed');
        await OfflineService.syncPendingGestiones();
        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
        console.error('Sync Background Error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});
