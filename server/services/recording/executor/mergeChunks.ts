import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../logger';
import { BegetStorage } from './begetStorage';
import { db } from '../../../db';
import { recordingTasks } from '../../../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { executorConfig } from './config';

export type MergeStatus = 'idle' | 'queued' | 'merging' | 'completed' | 'failed';

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

      // Склейка идёт без перекодирования (-c copy): у всех частей должен совпадать формат,
      // иначе получится битый файл. Особенно важно для частей из разных записей.
      await this.updateMergeStatus(taskId, 'merging', `Проверка формата ${chunkUrls.length} частей...`);
      await this.checkSameFormat(chunkUrls);

      await this.updateMergeStatus(taskId, 'merging', `Слияние ${chunkUrls.length} частей через FFmpeg...`);

      await this.runFFmpegConcat(concatListPath, outputPath);

      const fileSizeMb = Math.round(fs.statSync(outputPath).size / 1024 / 1024);
      logger.info(`[MERGE] Merged file: ${fileSizeMb} МБ → uploading to S3`);

      await this.updateMergeStatus(taskId, 'merging', `Загрузка итогового файла (${fileSizeMb} МБ) в S3...`);

      // Метка времени в имени: повторная склейка (другой набор частей) — новый адрес, и CDN
      // не отдаст из кэша прежний файл
      const mergedFileName = `${taskId}_merged_${Date.now().toString(36)}_${safeTitle}.mp4`;
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
      let lastErrorLine = '';
      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        const lines = text.split('\n');
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          if (/error|invalid|failed|not found|forbidden|denied/i.test(line)) lastErrorLine = line.slice(0, 300);
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
          reject(new Error(`FFmpeg concat завершился с кодом ${code}${lastErrorLine ? `: ${lastErrorLine}` : ''}`));
        }
      });

      proc.on('error', (err) => reject(new Error(`FFmpeg не запустился: ${err.message}`)));
    });
  }

  /**
   * Формат каждой части (кодеки, разрешение, звук) через ffprobe. Несовпадение — понятная ошибка
   * вместо битого файла. Если часть не удалось прочитать — не мешаем склейке, ошибку покажет ffmpeg.
   */
  private async checkSameFormat(urls: string[]): Promise<void> {
    const formats: Array<string | null> = [];
    for (const u of urls) formats.push(await probeFormat(u)); // по очереди — не нагружаем сеть и CPU
    const known = formats.map((f, i) => ({ f, n: i + 1 })).filter((x): x is { f: string; n: number } => !!x.f);
    const first = known[0];
    const other = known.find((x) => x.f !== first?.f);
    if (first && other) {
      throw new Error(
        `Части разного формата — без перекодирования не склеить: №${first.n} — ${first.f}, №${other.n} — ${other.f}. ` +
          'Выберите части одной записи или одного качества.',
      );
    }
  }

  /** Отметить слияние неудачным без запуска ffmpeg (например, частей меньше двух). */
  async markFailed(taskId: string, reason: string): Promise<void> {
    await this.updateMergeStatus(taskId, 'failed', reason);
  }

  private async updateMergeStatus(
    taskId: string,
    status: MergeStatus,
    progress: string,
    mergedUrl?: string,
  ): Promise<void> {
    try {
      // Точечное обновление ключей metadata (jsonb ||), чтобы не затереть то, что параллельно
      // пишет воркер (например, metadata.start)
      const patch: Record<string, unknown> = { mergeStatus: status, mergeProgress: progress };
      if (mergedUrl) patch.mergedUrl = mergedUrl;
      if (status === 'failed') patch.mergeError = progress;
      if (status === 'completed') patch.mergeError = null;

      await db
        .update(recordingTasks)
        .set({
          metadata: sql`coalesce(${recordingTasks.metadata}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
          ...(mergedUrl ? { begetUrl: mergedUrl } : {}),
          updatedAt: new Date(),
        })
        .where(eq(recordingTasks.id, taskId));
    } catch (err) {
      logger.warn('[MERGE] Failed to update merge status in DB:', err);
    }
  }
}

/** «h264 1920×1080 + aac 48000 Гц стерео» или null, если ffprobe не смог прочитать файл. */
function probeFormat(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const args = [
      '-v', 'error',
      '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
      '-show_entries', 'stream=codec_type,codec_name,width,height,sample_rate,channels',
      '-of', 'json',
      url,
    ];
    let out = '';
    let proc;
    try {
      proc = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => proc.kill('SIGKILL'), 60_000);
    proc.stdout?.on('data', (d: Buffer) => { out += d.toString(); });
    proc.on('error', () => { clearTimeout(timer); resolve(null); });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return resolve(null);
      try {
        const streams: any[] = JSON.parse(out).streams ?? [];
        const v = streams.find((s) => s.codec_type === 'video');
        const a = streams.find((s) => s.codec_type === 'audio');
        const video = v ? `${v.codec_name} ${v.width}×${v.height}` : 'без видео';
        const ch = a?.channels === 1 ? 'моно' : a?.channels === 2 ? 'стерео' : `${a?.channels} кан`;
        const audio = a ? `${a.codec_name} ${a.sample_rate} Гц ${ch}` : 'без звука';
        resolve(`${video} + ${audio}`);
      } catch {
        resolve(null);
      }
    });
  });
}

// Слияние идёт на диске воркера (том /data/recordings), а не в /tmp контейнера
export const chunkMerger = new ChunkMerger(path.join(executorConfig.recording.outputDir, 'merge'));
