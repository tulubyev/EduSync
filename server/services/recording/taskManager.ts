import { db } from '../../db';
import { recordingTasks } from '@shared/schema';
import { eq, and, lte, gte, or } from 'drizzle-orm';
import { logger } from '../logger';
import { streamingRecorderService } from './streamingRecorder';
import { yandexDiskService } from '../yandexDiskService';
import { playlistGenerator } from './playlistGenerator';
import { RecordingTaskData, RecordingPart } from './types';
import * as fs from 'fs';

const MAX_PART_DURATION_MIN = 20;

class RecordingTaskManager {
  private activeTask: string | null = null;
  private isProcessing = false;

  async createTask(data: {
    userId: string;
    title: string;
    description?: string;
    streamUrl: string;
    streamPassword?: string;
    scheduledTime: Date;
    duration: number;
    saveTarget: 'library' | 'yandex_disk';
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
      status: 'scheduled',
      saveTarget: data.saveTarget,
      currentPart: 0,
      totalParts,
      parts,
    }).returning();

    logger.info(`📋 Created recording task: ${task.id}, parts: ${totalParts}`);
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
          eq(recordingTasks.status, 'scheduled'),
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

  async executeTask(taskId: string): Promise<void> {
    if (this.isProcessing) {
      logger.warn(`Already processing task, skipping ${taskId}`);
      return;
    }

    const task = await this.getTask(taskId);
    if (!task) {
      logger.error(`Task not found: ${taskId}`);
      return;
    }

    if (task.status !== 'scheduled') {
      logger.warn(`Task ${taskId} is not scheduled, status: ${task.status}`);
      return;
    }

    this.isProcessing = true;
    this.activeTask = taskId;

    try {
      // Ensure clean browser state before starting
      await streamingRecorderService.stopBrowser();
      
      await this.updateTaskStatus(taskId, 'recording', { startedAt: new Date() });
      logger.info(`🎬 Starting task execution: ${taskId}`);

      const { audioAvailable } = await streamingRecorderService.initialize();
      logger.info(`Recording initialized - audio capture: ${audioAvailable ? 'available' : 'not available'}`);
      
      // Navigate with error handling - ensure cleanup on failure
      try {
        await streamingRecorderService.navigateToStream(task.streamUrl, task.streamPassword);
      } catch (navError) {
        logger.error(`Failed to navigate to stream: ${navError}`);
        await streamingRecorderService.stopBrowser();
        throw new Error(`Navigation failed: ${navError}`);
      }

      const parts: RecordingPart[] = [...task.parts];

      for (let i = task.currentPart; i < task.totalParts; i++) {
        const partDurationMs = Math.min(
          task.maxPartDuration * 60 * 1000,
          (task.duration - i * task.maxPartDuration) * 60 * 1000
        );

        if (partDurationMs <= 0) break;

        parts[i].status = 'recording';
        await this.updateTaskStatus(taskId, 'recording', { currentPart: i, parts });

        logger.info(`📹 Recording part ${i + 1}/${task.totalParts} (streaming mode)`);

        const { outputPath } = await streamingRecorderService.startStreamingRecording(
          taskId,
          i + 1,
          partDurationMs
        );

        const result = await streamingRecorderService.waitForRecordingComplete(partDurationMs);

        if (!result.success) {
          parts[i].status = 'failed';
          parts[i].error = result.error || 'Recording failed';
          await this.updateTaskStatus(taskId, 'failed', { 
            parts,
            errorMessage: `Part ${i + 1} failed: ${result.error}` 
          });
          throw new Error(`Recording part ${i + 1} failed: ${result.error}`);
        }

        parts[i].fileName = result.filePath.split('/').pop()!;
        parts[i].endTime = new Date().toISOString();
        parts[i].duration = result.actualDuration;
        parts[i].status = 'uploading';
        await this.updateTaskStatus(taskId, 'uploading', { parts });

        if (task.saveTarget === 'yandex_disk' && result.filePath && fs.existsSync(result.filePath)) {
          const fileBuffer = fs.readFileSync(result.filePath);
          const uploadResult = await yandexDiskService.uploadFile(
            parts[i].fileName,
            fileBuffer,
            'video/webm'
          );

          if (uploadResult.success) {
            parts[i].yandexPath = uploadResult.path;
            
            const linkResult = await yandexDiskService.getPublicLink(uploadResult.path!);
            if (linkResult.success) {
              parts[i].publicUrl = linkResult.link;
            }
            
            parts[i].status = 'completed';
            fs.unlinkSync(result.filePath);
          } else {
            parts[i].status = 'failed';
            parts[i].error = uploadResult.error;
          }
        } else if (result.filePath && fs.existsSync(result.filePath)) {
          parts[i].status = 'completed';
        } else {
          parts[i].status = 'failed';
          parts[i].error = 'Output file not created';
        }

        await this.updateTaskStatus(taskId, 'recording', { currentPart: i + 1, parts });
      }

      let playlistUrl: string | undefined;
      if (task.saveTarget === 'yandex_disk') {
        const completedParts = parts.filter(p => p.status === 'completed' && p.publicUrl);
        if (completedParts.length > 0) {
          const playlist = playlistGenerator.generateM3U8(completedParts);
          const playlistFileName = `playlist_${taskId}.m3u8`;
          const playlistBuffer = Buffer.from(playlist, 'utf-8');
          
          const uploadResult = await yandexDiskService.uploadFile(
            playlistFileName,
            playlistBuffer,
            'application/x-mpegURL'
          );
          
          if (uploadResult.success) {
            const linkResult = await yandexDiskService.getPublicLink(uploadResult.path!);
            if (linkResult.success) {
              playlistUrl = linkResult.link;
            }
          }
        }
      }

      await this.updateTaskStatus(taskId, 'completed', {
        parts,
        completedAt: new Date(),
        playlistUrl,
      });

      logger.info(`✅ Task completed: ${taskId}`);
    } catch (error: any) {
      logger.error(`Task execution failed: ${taskId}`, error);
      await this.updateTaskStatus(taskId, 'failed', {
        errorMessage: error.message || 'Unknown error',
      });
    } finally {
      await streamingRecorderService.stopBrowser();
      this.isProcessing = false;
      this.activeTask = null;
    }
  }

  async recoverTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'failed' && task.status !== 'recording') {
      throw new Error('Task cannot be recovered');
    }

    await this.updateTaskStatus(taskId, 'scheduled');
    logger.info(`Task recovered and rescheduled: ${taskId}`);
  }

  getActiveTask(): string | null {
    return this.activeTask;
  }

  isTaskProcessing(): boolean {
    return this.isProcessing;
  }
}

export const recordingTaskManager = new RecordingTaskManager();
