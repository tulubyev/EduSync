import { db } from '../../db';
import { recordingTasks } from '@shared/schema';
import { eq, and, lte, gte, desc } from 'drizzle-orm';
import { logger } from '../logger';
import { RecordingTaskData, RecordingPart } from './types';
import { recordingLogger } from './logger';
import { randomUUID } from 'crypto';

const TRANSLIT_MAP: Record<string, string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
  'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
  'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh',
  'щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
  'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'Yo','Ж':'Zh','З':'Z',
  'И':'I','Й':'Y','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R',
  'С':'S','Т':'T','У':'U','Ф':'F','Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh',
  'Щ':'Shch','Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'Yu','Я':'Ya',
};

function slugify(text: string): string {
  return text
    .split('')
    .map(c => TRANSLIT_MAP[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

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
    const taskId = randomUUID();

    const dateStr = data.scheduledTime.toISOString().slice(0, 10); // YYYY-MM-DD
    const s3Prefix = `epa/recordings/${data.userId}/${taskId}/`;
    const s3Filename = `${slugify(data.title) || 'recording'}_${dateStr}`;

    const parts: RecordingPart[] = Array.from({ length: totalParts }, (_, i) => ({
      partNumber: i + 1,
      fileName: `${s3Filename}_part${String(i + 1).padStart(3, '0')}.mp4`,
      startTime: new Date(data.scheduledTime.getTime() + i * MAX_PART_DURATION_MIN * 60 * 1000).toISOString(),
      status: 'pending' as const,
    }));

    const READY_ADVANCE_MS = 5 * 60 * 1000; // 5 minutes before scheduled time
    const initialStatus = data.scheduledTime.getTime() - Date.now() > READY_ADVANCE_MS
      ? 'scheduled'
      : 'ready';

    const [task] = await db.insert(recordingTasks).values({
      id: taskId,
      userId: data.userId,
      title: data.title,
      description: data.description,
      streamUrl: data.streamUrl,
      streamPassword: data.streamPassword,
      scheduledTime: data.scheduledTime,
      duration: data.duration,
      maxPartDuration: MAX_PART_DURATION_MIN,
      status: initialStatus,
      saveTarget: data.saveTarget,
      currentPart: 0,
      totalParts,
      parts,
      s3Prefix,
      s3Filename,
    }).returning();

    await recordingLogger.logEvent({
      taskId: task.id,
      userId: data.userId,
      eventType: 'task_created',
      message: `Recording task created: ${data.title}`,
      metadata: { 
        streamUrl: data.streamUrl, 
        duration: data.duration, 
        totalParts,
        saveTarget: data.saveTarget 
      }
    });

    logger.info(`Created recording task: ${task.id}, parts: ${totalParts}, target: ${data.saveTarget}`);
    return task.id;
  }

  async getTask(taskId: string): Promise<RecordingTaskData | null> {
    const [task] = await db.select().from(recordingTasks).where(eq(recordingTasks.id, taskId));
    if (!task) return null;

    return this.mapTaskToData(task);
  }

  async getUserTasks(userId: string): Promise<RecordingTaskData[]> {
    const tasks = await db.select()
      .from(recordingTasks)
      .where(eq(recordingTasks.userId, userId))
      .orderBy(desc(recordingTasks.scheduledTime));

    return tasks.map(task => this.mapTaskToData(task));
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

    return tasks.map(task => this.mapTaskToData(task));
  }

  async getReadyTasks(): Promise<RecordingTaskData[]> {
    const tasks = await db.select()
      .from(recordingTasks)
      .where(eq(recordingTasks.status, 'ready'))
      .orderBy(recordingTasks.scheduledTime);

    return tasks.map(task => this.mapTaskToData(task));
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
      workerId: string;
      attemptCount: number;
      lastHeartbeat: Date;
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

  async promoteScheduledTasks(): Promise<number> {
    const now = new Date();
    const readyAt = new Date(now.getTime() + 5 * 60 * 1000); // promote 5 min before scheduled time

    const result = await db
      .update(recordingTasks)
      .set({ status: 'ready', updatedAt: now })
      .where(
        and(
          eq(recordingTasks.status, 'scheduled'),
          lte(recordingTasks.scheduledTime, readyAt)
        )
      )
      .returning({ id: recordingTasks.id, title: recordingTasks.title });

    if (result.length > 0) {
      result.forEach(t => logger.info(`Promoted scheduled task to ready: ${t.id} "${t.title}"`));
    }

    return result.length;
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

    await this.updateTaskStatus(taskId, 'ready', {
      errorMessage: undefined,
      workerId: undefined,
    });
    
    await recordingLogger.logEvent({
      taskId,
      userId: task.userId,
      eventType: 'task_started',
      message: `Task recovered and ready for retry`,
    });
    
    logger.info(`Task recovered and ready: ${taskId}`);
  }

  async deleteTask(taskId: string): Promise<void> {
    await db.delete(recordingTasks).where(eq(recordingTasks.id, taskId));
    logger.info(`Task deleted: ${taskId}`);
  }

  private mapTaskToData(task: any): RecordingTaskData {
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
      begetUrl: task.begetUrl || undefined,
      s3Prefix: task.s3Prefix || undefined,
      s3Filename: task.s3Filename || undefined,
      libraryNoteId: task.libraryNoteId || undefined,
      errorMessage: task.errorMessage || undefined,
      startedAt: task.startedAt || undefined,
      completedAt: task.completedAt || undefined,
      workerId: task.workerId || undefined,
      attemptCount: task.attemptCount || 0,
      lastHeartbeat: task.lastHeartbeat || undefined,
      urlCheckStatus: (task.urlCheckStatus as RecordingTaskData['urlCheckStatus']) || 'pending',
      urlCheckMessage: task.urlCheckMessage || undefined,
      urlCheckedAt: task.urlCheckedAt || undefined,
    };
  }
}

export const recordingTaskManager = new RecordingTaskManager();
