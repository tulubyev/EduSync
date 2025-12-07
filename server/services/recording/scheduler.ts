import { recordingTaskManager } from './taskManager';
import { logger } from '../logger';

class RecordingScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private checkIntervalMs = 60 * 1000; // Check every minute
  private isRunning = false;

  start(): void {
    if (this.isRunning) {
      logger.warn('Recording scheduler already running');
      return;
    }

    this.isRunning = true;
    logger.info('🗓️ Recording scheduler started (checking every minute)');

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
      const scheduledTasks = await recordingTaskManager.getScheduledTasks();
      
      if (scheduledTasks.length === 0) {
        return;
      }

      logger.info(`Found ${scheduledTasks.length} tasks ready to execute`);

      for (const task of scheduledTasks) {
        const now = new Date();
        const scheduledTime = new Date(task.scheduledTime);
        const diffMs = scheduledTime.getTime() - now.getTime();

        if (diffMs <= 60 * 1000 && diffMs >= -5 * 60 * 1000) {
          logger.info(`⏰ Executing scheduled task: ${task.id} - ${task.title}`);
          await recordingTaskManager.executeTask(task.id);
          break;
        }
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
