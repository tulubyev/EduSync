import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../logger';
import { BegetStorage } from './begetStorage';
import { db } from '../../../db';
import { recordingTasks } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';

export type MergeStatus = 'idle' | 'merging' | 'completed' | 'failed';

export class ChunkMerger {
  private storage: BegetStorage;
  private outputDir: string;

  constructor(outputDir = '/tmp/recordings') {
    this.storage = new BegetStorage();
    this.outputDir = outputDir;
  }

  async merge(taskId: string, chunkUrls: string[], title: string): Promise<string> {
    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    const concatListPath = path.join(this.outputDir, `concat_${taskId}.txt`);
    const outputPath = path.join(this.outputDir, `merged_${taskId}_${safeTitle}.mp4`);

    await this.updateMergeStatus(taskId, 'merging', 'Подготовка к слиянию...');

    try {
      fs.mkdirSync(this.outputDir, { recursive: true });

      // Write concat list with HTTP URLs — FFmpeg downloads them on the fly
      const listContent = chunkUrls.map(url => `file '${url}'`).join('\n');
      fs.writeFileSync(concatListPath, listContent, 'utf-8');
      logger.info(`[MERGE] Concat list written (${chunkUrls.length} chunks) → ${concatListPath}`);
      logger.info(`[MERGE] URLs:\n${listContent}`);

      await this.updateMergeStatus(taskId, 'merging', `Слияние ${chunkUrls.length} частей через FFmpeg...`);

      await this.runFFmpegConcat(concatListPath, outputPath);

      const fileSizeMb = Math.round(fs.statSync(outputPath).size / 1024 / 1024);
      logger.info(`[MERGE] Merged file: ${fileSizeMb} МБ → uploading to S3`);

      await this.updateMergeStatus(taskId, 'merging', `Загрузка итогового файла (${fileSizeMb} МБ) в S3...`);

      const mergedFileName = `${taskId}_merged_${safeTitle}.mp4`;
      const mergedUrl = await this.storage.uploadVideo(outputPath, mergedFileName);

      await this.updateMergeStatus(taskId, 'completed', 'Слияние завершено', mergedUrl);
      logger.info(`[MERGE] ✅ Task ${taskId} merged: ${mergedUrl}`);
      return mergedUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[MERGE] ❌ Task ${taskId} failed: ${msg}`);
      await this.updateMergeStatus(taskId, 'failed', msg);
      throw err;
    } finally {
      for (const p of [concatListPath, outputPath]) {
        try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
      }
    }
  }

  private runFFmpegConcat(listPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
        '-f', 'concat',
        '-safe', '0',
        '-i', listPath,
        '-c', 'copy',
        '-movflags', '+faststart',
        outputPath,
      ];

      logger.info(`[MERGE] Running: ffmpeg ${args.join(' ')}`);
      const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

      let lastProgressLine = '';
      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        const lines = text.split('\n');
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          if (line.startsWith('frame=') || line.includes('time=')) {
            if (line !== lastProgressLine) {
              logger.info(`[MERGE PROGRESS] ${line.slice(0, 150)}`);
              lastProgressLine = line;
            }
          } else {
            logger.info(`[MERGE FFMPEG] ${line.slice(0, 200)}`);
          }
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          logger.info('[MERGE] FFmpeg concat completed successfully');
          resolve();
        } else {
          reject(new Error(`FFmpeg concat завершился с кодом ${code}`));
        }
      });

      proc.on('error', (err) => reject(new Error(`FFmpeg не запустился: ${err.message}`)));
    });
  }

  private async updateMergeStatus(
    taskId: string,
    status: MergeStatus,
    progress: string,
    mergedUrl?: string,
  ): Promise<void> {
    try {
      const [task] = await db
        .select({ metadata: recordingTasks.metadata })
        .from(recordingTasks)
        .where(eq(recordingTasks.id, taskId));

      const meta = ((task?.metadata as Record<string, unknown>) ?? {});
      const newMeta: Record<string, unknown> = {
        ...meta,
        mergeStatus: status,
        mergeProgress: progress,
      };
      if (mergedUrl) newMeta.mergedUrl = mergedUrl;
      if (status === 'failed') newMeta.mergeError = progress;

      await db
        .update(recordingTasks)
        .set({
          metadata: newMeta,
          ...(mergedUrl ? { begetUrl: mergedUrl } : {}),
          updatedAt: new Date(),
        })
        .where(eq(recordingTasks.id, taskId));
    } catch (err) {
      logger.warn('[MERGE] Failed to update merge status in DB:', err);
    }
  }
}

export const chunkMerger = new ChunkMerger('/tmp/recordings');
