import { db } from '../../db';
import { recordingTasks } from '@shared/schema';
import { eq, and, lte, gte } from 'drizzle-orm';
import { logger } from '../logger';
import { RecordingTaskData, RecordingPart } from './types';
import { recordingLogger } from './logger';

const MAX_PART_DURATION_MIN = 20;

class RecordingTaskManager {
  async createTask(data: {
    userId: string;
    title: string;
    description?: string;
    streamUrl: string;
    streamPassword?: string;
    scheduledTime: Date;
    duration: number;
    saveTarget: 'library' | 'yandex_disk' | 'beget';
  }): Promise<string> {
    const totalParts = Math.ceil(data.duration / MAX_PART_DURATION_MIN);
    
    const parts: RecordingPart[] = Array.from({ length: totalParts }, (_, i) => ({
      partNumber: i + 1,
      fileName: '',
      startTime: new Date(data.scheduledTime.getTime() + i * MAX_PART_DURATION_MIN * 60 * 1000).toISOString(),
      status: 'pending' as const,
    }));

    const [task] = await db.insert(recordingTasks).values({
      userId: data.userId,
      title: data.title,
      description: data.description,
      streamUrl: data.streamUrl,
      streamPassword: data.streamPassword,
      scheduledTime: data.scheduledTime,
      duration: data.duration,
      maxPartDuration: MAX_PART_DURATION_MIN,
      status: 'ready',
      saveTarget: data.saveTarget,
      currentPart: 0,
      totalParts,
      parts,
    }).returning();

    logger.info(`📋 Created recording task: ${task.id}, parts: ${totalParts}`);
    
    await recordingLogger.logEvent({
      taskId: task.id,
      userId: data.userId,
      eventType: 'task_created',
      message: `Recording task created: ${data.title}`,
      metadata: { duration: data.duration, totalParts, saveTarget: data.saveTarget }
    });
    
    return task.id;
  }

  async getTask(taskId: string): Promise<RecordingTaskData | null> {
    const [task] = await db.select().from(recordingTasks).where(eq(recordingTasks.id, taskId));
    if (!task) return null;

    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      description: task.description || undefined,
      streamUrl: task.streamUrl,
      streamPassword: task.streamPassword || undefined,
      scheduledTime: task.scheduledTime,
      duration: task.duration,
      maxPartDuration: task.maxPartDuration || MAX_PART_DURATION_MIN,
      status: task.status as RecordingTaskData['status'],
      saveTarget: task.saveTarget as RecordingTaskData['saveTarget'],
      currentPart: task.currentPart || 0,
      totalParts: task.totalParts || 1,
      parts: (task.parts as RecordingPart[]) || [],
      playlistUrl: task.playlistUrl || undefined,
      libraryNoteId: task.libraryNoteId || undefined,
      errorMessage: task.errorMessage || undefined,
      startedAt: task.startedAt || undefined,
      completedAt: task.completedAt || undefined,
      begetUrl: task.begetUrl || undefined,
    };
  }

  async getUserTasks(userId: string): Promise<RecordingTaskData[]> {
    const tasks = await db.select()
      .from(recordingTasks)
      .where(eq(recordingTasks.userId, userId))
      .orderBy(recordingTasks.scheduledTime);

    return tasks.map(task => ({
      id: task.id,
      userId: task.userId,
      title: task.title,
      description: task.description || undefined,
      streamUrl: task.streamUrl,
      streamPassword: task.streamPassword || undefined,
      scheduledTime: task.scheduledTime,
      duration: task.duration,
      maxPartDuration: task.maxPartDuration || MAX_PART_DURATION_MIN,
      status: task.status as RecordingTaskData['status'],
      saveTarget: task.saveTarget as RecordingTaskData['saveTarget'],
      currentPart: task.currentPart || 0,
      totalParts: task.totalParts || 1,
      parts: (task.parts as RecordingPart[]) || [],
      playlistUrl: task.playlistUrl || undefined,
      libraryNoteId: task.libraryNoteId || undefined,
      errorMessage: task.errorMessage || undefined,
      startedAt: task.startedAt || undefined,
      completedAt: task.completedAt || undefined,
      begetUrl: task.begetUrl || undefined,
    }));
  }

  async getScheduledTasks(): Promise<RecordingTaskData[]> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fiveMinutesAhead = new Date(now.getTime() + 5 * 60 * 1000);

    const tasks = await db.select()
      .from(recordingTasks)
      .where(
        and(
          eq(recordingTasks.status, 'ready'),
          lte(recordingTasks.scheduledTime, fiveMinutesAhead),
          gte(recordingTasks.scheduledTime, fiveMinutesAgo)
        )
      );

    return tasks.map(task => ({
      id: task.id,
      userId: task.userId,
      title: task.title,
      description: task.description || undefined,
      streamUrl: task.streamUrl,
      streamPassword: task.streamPassword || undefined,
      scheduledTime: task.scheduledTime,
      duration: task.duration,
      maxPartDuration: task.maxPartDuration || MAX_PART_DURATION_MIN,
      status: task.status as RecordingTaskData['status'],
      saveTarget: task.saveTarget as RecordingTaskData['saveTarget'],
      currentPart: task.currentPart || 0,
      totalParts: task.totalParts || 1,
      parts: (task.parts as RecordingPart[]) || [],
      playlistUrl: task.playlistUrl || undefined,
      libraryNoteId: task.libraryNoteId || undefined,
      errorMessage: task.errorMessage || undefined,
      startedAt: task.startedAt || undefined,
      completedAt: task.completedAt || undefined,
      begetUrl: task.begetUrl || undefined,
    }));
  }

  async updateTaskStatus(
    taskId: string,
    status: RecordingTaskData['status'],
    updates?: Partial<{
      currentPart: number;
      parts: RecordingPart[];
      errorMessage: string;
      playlistUrl: string;
      begetUrl: string;
      startedAt: Date;
      completedAt: Date;
    }>
  ): Promise<void> {
    await db.update(recordingTasks)
      .set({
        status,
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(recordingTasks.id, taskId));
  }

  async cancelTask(taskId: string): Promise<void> {
    await this.updateTaskStatus(taskId, 'cancelled');
    logger.info(`Task cancelled: ${taskId}`);
  }

  async recoverTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'failed' && task.status !== 'in_progress') {
      throw new Error('Task cannot be recovered');
    }

    await this.updateTaskStatus(taskId, 'ready');
    logger.info(`Task recovered and ready for worker: ${taskId}`);
  }
}

export const recordingTaskManager = new RecordingTaskManager();
