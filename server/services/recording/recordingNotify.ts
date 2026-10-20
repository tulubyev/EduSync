/**
 * Письмо владельцу записи «Запись выполнена» / «прервана» / «не выполнена».
 *
 * Отправляет воркер, когда задача окончательно завершилась. Если после записи стоит автосклейка,
 * письмо откладывается до её окончания — чтобы в нём уже была ссылка на весь файл.
 * Каждая задача уведомляется один раз (metadata.notifiedAt, атомарно).
 *
 *   RECORDING_NOTIFY_EMAIL=false — не отправлять письма
 *   Пользователь может отключить письма в настройках (user_settings.email_notifications)
 */
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { recordingTasks, users, userSettings } from '@shared/schema';
import { logger } from '../logger';
import { emailService } from '../emailService';
import { listTaskVideos, presignDownload, downloadFileName, DOWNLOAD_URL_TTL_HOURS } from './recordingFiles';

const ENABLED = process.env.RECORDING_NOTIFY_EMAIL !== 'false';
/** Сколько ссылок на части перечислять в письме (дальше — «все части в кабинете») */
const MAX_PART_LINKS = 12;

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const fmtMsk = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';

function fmtDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return 'меньше минуты';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? (m ? `${h} ч ${m} мин` : `${h} ч`) : `${m} мин`;
}

function appUrl(): string {
  const explicit = (process.env.APP_URL || '').replace(/\/+$/, '');
  return explicit || `https://${process.env.APP_DOMAIN || 'myepa.ru'}`;
}

/**
 * @param afterMerge вызвано из очереди склейки: письмо уходит, только если его отложили до склейки
 */
export async function notifyRecordingResult(taskId: string, opts: { afterMerge?: boolean } = {}): Promise<void> {
  if (!ENABLED) return;
  try {
    const [task] = await db.select().from(recordingTasks).where(eq(recordingTasks.id, taskId));
    if (!task || (task.status !== 'completed' && task.status !== 'failed')) return;
    const meta = (task.metadata as any) ?? {};
    if (meta.notifiedAt) return;

    const mergePending = meta.mergeStatus === 'queued' || meta.mergeStatus === 'merging';
    if (opts.afterMerge) {
      // Ручная склейка из кабинета — пользователь и так на странице, письмо не нужно
      if (!meta.notifyAfterMerge) return;
    } else if (mergePending) {
      await db
        .update(recordingTasks)
        .set({ metadata: sql`coalesce(${recordingTasks.metadata}, '{}'::jsonb) || '{"notifyAfterMerge": true}'::jsonb` })
        .where(eq(recordingTasks.id, taskId));
      return;
    }

    // Захватываем право отправить письмо — второй вызов (другой воркер, повтор) ничего не сделает
    const claimed: any = await db.execute(sql`
      UPDATE recording_tasks
         SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('notifiedAt', ${new Date().toISOString()}::text, 'notifyAfterMerge', false)
       WHERE id = ${taskId} AND coalesce(metadata->>'notifiedAt', '') = ''
      RETURNING id`);
    if ((claimed?.rows?.length ?? 0) === 0) return;

    const [user] = await db.select({ email: users.email, firstName: users.firstName }).from(users).where(eq(users.id, task.userId));
    if (!user?.email) return;
    const [settings] = await db
      .select({ emailNotifications: userSettings.emailNotifications })
      .from(userSettings)
      .where(eq(userSettings.userId, task.userId));
    if (settings && settings.emailNotifications === false) return;

    const { subject, html } = await buildEmail(task, meta, user.firstName);
    const res = await emailService.sendEmail({ to: user.email, subject, html });
    if (res.success) logger.info(`[NOTIFY] Письмо о задаче ${taskId} отправлено`);
    else logger.warn(`[NOTIFY] Письмо о задаче ${taskId} не отправлено: ${res.error}`);
  } catch (e) {
    logger.warn(`[NOTIFY] Ошибка уведомления о задаче ${taskId}: ${(e as Error).message}`);
  }
}

async function buildEmail(task: any, meta: any, firstName?: string | null) {
  const title = task.title || 'Запись';
  const parts = (Array.isArray(task.parts) ? task.parts : []).filter((p: any) => p?.publicUrl);
  const totalMs = parts.reduce((s: number, p: any) => s + (typeof p.duration === 'number' ? p.duration : 0), 0);
  const mergedUrl: string | undefined = meta.mergedUrl && meta.mergeStatus === 'completed' ? meta.mergedUrl : undefined;
  const videos = listTaskVideos({ title, begetUrl: task.begetUrl, parts, mergedUrl });
  const hasFiles = videos.length > 0;

  let kind: 'ok' | 'partial' | 'none';
  if (task.status === 'completed') kind = 'ok';
  else kind = hasFiles ? 'partial' : 'none';

  const subject =
    kind === 'ok'
      ? `✅ Запись выполнена: «${title}»`
      : kind === 'partial'
        ? `⚠️ Запись прервана: «${title}» — сохранено частей: ${parts.length || 1}`
        : `❌ Запись не выполнена: «${title}»`;

  // Ссылки на скачивание прямо из письма (подписанные, срок — RECORDING_DOWNLOAD_TTL_HOURS)
  const links: string[] = [];
  for (const v of videos.slice(0, MAX_PART_LINKS + 1)) {
    const url = (await presignDownload(v, downloadFileName(title, v)).catch(() => null)) ?? v.url;
    const label = v.id === 'merged' ? '<strong>Вся запись одним файлом</strong>' : esc(v.label);
    links.push(`<li style="margin:4px 0"><a href="${esc(url)}">${label}</a></li>`);
  }
  const moreParts = videos.length > MAX_PART_LINKS + 1 ? `<li>…и ещё ${videos.length - MAX_PART_LINKS - 1} — в кабинете</li>` : '';

  const facts: string[] = [];
  facts.push(`Запланирована: ${esc(fmtMsk(task.scheduledTime))} (МСК)`);
  if (task.streamUrl) facts.push(`Источник: <a href="${esc(task.streamUrl)}">${esc(task.streamUrl.length > 70 ? task.streamUrl.slice(0, 70) + '…' : task.streamUrl)}</a>`);
  if (totalMs > 0) facts.push(`Записано: ${fmtDuration(totalMs)}${parts.length > 1 ? `, частей: ${parts.length}` : ''}`);
  if (meta.mergeStatus === 'failed') facts.push(`Склейка в один файл не удалась: ${esc(meta.mergeError || 'неизвестная ошибка')} — части доступны по отдельности`);

  const reason: string = meta.start?.reason || task.errorMessage || '';
  const hint: string = meta.start?.hint || '';
  const problem =
    kind === 'ok'
      ? ''
      : `<div style="background:#fff4e5;border-left:4px solid #f0a020;padding:12px 16px;margin:16px 0;border-radius:4px">
           <div><strong>${kind === 'partial' ? 'Запись прервалась' : 'Запись не началась'}:</strong> ${esc(reason || 'причина не определена')}</div>
           ${hint ? `<div style="margin-top:6px;color:#555">Что сделать: ${esc(hint)}</div>` : ''}
         </div>`;

  const lead =
    kind === 'ok'
      ? 'Запись готова — её можно посмотреть в кабинете или скачать.'
      : kind === 'partial'
        ? 'Запись остановилась раньше времени, но часть успела сохраниться.'
        : 'К сожалению, записать трансляцию не получилось.';

  const cabinet = `${appUrl()}/recordings`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;color:#222">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden">
    <div style="background:${kind === 'ok' ? '#5b4bd5' : kind === 'partial' ? '#d08a00' : '#c0392b'};color:#fff;padding:24px 28px">
      <div style="font-size:14px;opacity:.85">My EPA · запись по расписанию</div>
      <div style="font-size:20px;font-weight:600;margin-top:6px">${esc(title)}</div>
    </div>
    <div style="padding:24px 28px;line-height:1.5">
      <p style="margin-top:0">${firstName ? `${esc(firstName)}, ${lead[0].toLowerCase()}${lead.slice(1)}` : lead}</p>
      <div style="color:#555;font-size:14px">${facts.map((f) => `<div>${f}</div>`).join('')}</div>
      ${problem}
      ${links.length ? `<p style="margin-bottom:4px"><strong>Скачать:</strong></p><ul style="margin-top:0;padding-left:20px">${links.join('')}${moreParts}</ul>
      <p style="font-size:12px;color:#888;margin-top:0">Ссылки на скачивание действуют ${DOWNLOAD_URL_TTL_HOURS} ч. Позже скачать можно в кабинете.</p>` : ''}
      <p style="margin:24px 0 8px"><a href="${esc(cabinet)}" style="background:#5b4bd5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block">Открыть записи в кабинете</a></p>
    </div>
    <div style="background:#f8f9fa;padding:14px 28px;color:#888;font-size:12px">Письмо отправлено автоматически. Отключить уведомления можно в настройках профиля My EPA.</div>
  </div>
</body></html>`;
  return { subject, html };
}
