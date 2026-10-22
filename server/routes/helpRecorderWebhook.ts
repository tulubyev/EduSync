/**
 * Вебхук Help Recorder: POST /api/hr/webhook, событие task.finished (docs/HELP-RECORDER.md).
 * Подпись проверяется по сырому телу (HR_WEBHOOK_SECRET), поэтому маршрут подключается до express.json.
 * Тело — только повод перечитать карточку записи: статус и файлы берутся из API (sync.ts), а не из тела.
 */
import express, { type Express } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { recordingTasks } from '@shared/schema';
import { logger } from '../services/logger';
import { syncHrTask, verifyHrSignature } from '../services/helpRecorder';

export function registerHelpRecorderWebhook(app: Express): void {
  app.post('/api/hr/webhook', express.raw({ type: '*/*', limit: '64kb' }), async (req, res) => {
    const secret = (process.env.HR_WEBHOOK_SECRET || '').trim();
    if (!secret) return res.status(404).json({ message: 'Not found' });
    const raw: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    if (!verifyHrSignature(raw, req.get('x-hr-signature'), secret)) {
      logger.warn('[HR] Вебхук с неверной подписью отклонён');
      return res.status(401).json({ message: 'Invalid signature' });
    }
    let ev: any;
    try { ev = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).json({ message: 'Bad JSON' }); }
    if (ev?.event !== 'task.finished' || typeof ev.task_id !== 'string') return res.json({ ok: true, ignored: true });

    const [row] = await db.select().from(recordingTasks).where(sql`${recordingTasks.metadata}->>'hrTaskId' = ${ev.task_id}`).limit(1);
    if (!row) return res.json({ ok: true, ignored: true }); // запись уже удалили у нас
    try {
      await syncHrTask(row);
      res.json({ ok: true });
    } catch (e) {
      // ответ не 2xx — Help Recorder повторит доставку
      logger.warn(`[HR] Вебхук: синхронизация ${row.id} не удалась: ${(e as Error).message}`);
      res.status(503).json({ message: 'Retry later' });
    }
  });
}
