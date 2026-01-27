package bot.molt.android.sync

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import bot.molt.android.NodeApp
import java.util.concurrent.TimeUnit

/**
 * Background sync worker that periodically syncs chat history when the app is backgrounded.
 * Uses WorkManager for battery-efficient scheduling.
 */
class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        Log.d(TAG, "Background sync starting")

        val app = applicationContext as? NodeApp
        if (app == null) {
            Log.w(TAG, "NodeApp not available")
            return Result.failure()
        }

        val runtime = app.runtime

        return try {
            // Only sync if connected to gateway
            if (runtime.isConnected.value) {
                Log.d(TAG, "Gateway connected, refreshing chat")
                runtime.refreshChat()
                runtime.refreshChatSessions(limit = 50)
                Log.d(TAG, "Background sync completed successfully")
                Result.success()
            } else {
                Log.d(TAG, "Gateway not connected, skipping sync")
                Result.success()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Background sync failed", e)
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "SyncWorker"
        private const val WORK_NAME = "clawdbot_background_sync"

        /**
         * Schedule periodic background sync.
         * Runs every 15 minutes (minimum interval) when network is available and battery isn't low.
         */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()

            val request = PeriodicWorkRequestBuilder<SyncWorker>(
                15, TimeUnit.MINUTES // Minimum interval allowed by WorkManager
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request
                )

            Log.d(TAG, "Background sync scheduled")
        }

        /**
         * Cancel scheduled background sync.
         */
        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "Background sync cancelled")
        }
    }
}
