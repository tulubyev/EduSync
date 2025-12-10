import { recordingTaskManager } from './taskManager';
import { logger } from '../logger';

class RecordingScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private checkIntervalMs = 10 * 1000; // Check every 10 seconds for more responsive execution
  private isRunning = false;
  private lastExecutedTaskIds: Set<string> = new Set();

  start(): void {
    if (this.isRunning) {
      logger.warn('Recording scheduler already running');
      return;
    }

    this.isRunning = true;
    logger.info('🗓️ Recording scheduler started (database-triggered, checking every 10s)');

    this.intervalId = setInterval(async () => {
      await this.checkAndExecuteTasks();
    }, this.checkIntervalMs);

    this.checkAndExecuteTasks();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Recording scheduler stopped');
  }

  private async checkAndExecuteTasks(): Promise<void> {
    if (recordingTaskManager.isTaskProcessing()) {
      logger.debug('Task already processing, skipping check');
      return;
    }

    try {
      // Get tasks scheduled within 5 minutes window (check 5 min before to just after scheduled time)
      const scheduledTasks = await recordingTaskManager.getScheduledTasks();
      
      if (scheduledTasks.length === 0) {
        return;
      }

      const now = new Date();
      let executedAny = false;

      for (const task of scheduledTasks) {
        // Skip if already executed in this session
        if (this.lastExecutedTaskIds.has(task.id)) {
          continue;
        }

        const scheduledTime = new Date(task.scheduledTime);
        const diffMs = scheduledTime.getTime() - now.getTime();

        // Execute if within the execution window: scheduled time ± 1 minute
        // This allows execution from 1 minute before to 1 minute after scheduled time
        if (diffMs <= 60 * 1000 && diffMs >= -60 * 1000) {
          logger.info(`⏰ Executing scheduled task: ${task.id} - ${task.title} (scheduled in ${Math.round(diffMs / 1000)}s)`);
          
          this.lastExecutedTaskIds.add(task.id);
          await recordingTaskManager.executeTask(task.id);
          executedAny = true;
          
          // Only execute one task per check to avoid overload
          break;
        }
      }

      // Cleanup: remove IDs of completed/failed tasks from tracking
      if (executedAny) {
        const currentTaskIds = new Set(scheduledTasks.map(t => t.id));
        Array.from(this.lastExecutedTaskIds).forEach(taskId => {
          if (!currentTaskIds.has(taskId)) {
            this.lastExecutedTaskIds.delete(taskId);
          }
        });
      }
    } catch (error) {
      logger.error('Error checking scheduled tasks:', error);
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }

  async triggerManualCheck(): Promise<void> {
    logger.info('Manual task check triggered');
    await this.checkAndExecuteTasks();
  }
}

export const recordingScheduler = new RecordingScheduler();
