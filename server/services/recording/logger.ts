import { db } from '../../db';
import { recordingLogs } from '@shared/schema';
import { logger } from '../logger';

type EventType = 
  | 'task_created' 
  | 'task_started' 
  | 'recording_started' 
  | 'recording_completed' 
  | 'upload_started' 
  | 'upload_completed' 
  | 'upload_failed' 
  | 'browser_error' 
  | 'task_failed' 
  | 'task_cancelled'
  | 'navigation_error'
  | 'browser_cleanup';

interface LogEventOptions {
  taskId: string;
  userId: string;
  eventType: EventType;
  message: string;
  partNumber?: number;
  errorDetails?: string;
  fileSize?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class RecordingLogger {
  async logEvent(options: LogEventOptions): Promise<void> {
    try {
      await db.insert(recordingLogs).values({
        taskId: options.taskId,
        userId: options.userId,
        eventType: options.eventType,
        message: options.message,
        partNumber: options.partNumber,
        errorDetails: options.errorDetails,
        fileSize: options.fileSize,
        duration: options.duration,
        metadata: options.metadata,
      });
      
      logger.debug(`📝 Logged event: ${options.eventType} for task ${options.taskId.substring(0, 8)}`);
    } catch (error) {
      logger.error('Failed to log recording event:', error);
    }
  }

  async getTaskLogs(taskId: string): Promise<any[]> {
    try {
      const logs = await db.query.recordingLogs.findMany({
        where: (logs, { eq }) => eq(logs.taskId, taskId),
        orderBy: (logs, { asc }) => asc(logs.createdAt),
      });
      return logs;
    } catch (error) {
      logger.error('Failed to retrieve task logs:', error);
      return [];
    }
  }

  async getUserRecordingLogs(userId: string, limit: number = 100): Promise<any[]> {
    try {
      const logs = await db.query.recordingLogs.findMany({
        where: (logs, { eq }) => eq(logs.userId, userId),
        orderBy: (logs, { desc }) => desc(logs.createdAt),
        limit,
      });
      return logs;
    } catch (error) {
      logger.error('Failed to retrieve user logs:', error);
      return [];
    }
  }

  async getTaskEventTimeline(taskId: string): Promise<any[]> {
    const logs = await this.getTaskLogs(taskId);
    return logs.map((log: any) => ({
      timestamp: log.createdAt,
      event: log.eventType,
      part: log.partNumber,
      message: log.message,
      error: log.errorDetails,
      fileSize: log.fileSize,
      duration: log.duration,
    }));
  }
}

export const recordingLogger = new RecordingLogger();
