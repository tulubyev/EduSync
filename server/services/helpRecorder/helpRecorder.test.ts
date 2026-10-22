/**
 * Проверки связки с Help Recorder без сети и БД: подпись вебхука, перевод карточки в зеркало, тела запросов, тексты ошибок.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signHr, verifyHrSignature } from './signature';
import { cardToLocal, createBody, editBody, filesKey, filesToLocal, hrStartStatus, type HrCard } from './mapping';
import { hrErrorResponse, hrMessage } from './messages';
import { HrError } from './client';
import { hrEnabled, isHrTask } from './config';

const SECRET = 'whsec_test';

test('подпись вебхука: верная проходит, чужая, изменённое тело и старая — нет', () => {
  const body = JSON.stringify({ event: 'task.finished', task_id: 't1' });
  const now = 1_800_000_000;
  const h = signHr(body, SECRET, now);
  assert.equal(verifyHrSignature(body, h, SECRET, now), true);
  assert.equal(verifyHrSignature(Buffer.from(body), h, SECRET, now + 60), true, 'Buffer и небольшая разница часов');
  assert.equal(verifyHrSignature(body + ' ', h, SECRET, now), false, 'тело изменено');
  assert.equal(verifyHrSignature(body, h, 'whsec_other', now), false, 'другой секрет');
  assert.equal(verifyHrSignature(body, h, SECRET, now + 301), false, 'старше 5 минут');
  assert.equal(verifyHrSignature(body, undefined, SECRET, now), false);
  assert.equal(verifyHrSignature(body, 't=1,v1=zz', SECRET, now), false);
  assert.equal(verifyHrSignature(body, h, '', now), false, 'без секрета — всегда нет');
});

const card = (o: Partial<HrCard> = {}): HrCard => ({
  id: 'hr-1', title: 'Лекция', stream_url: 'https://example.com/w', scheduled_time: '2026-10-21T16:00:00.000Z', duration: 90,
  status: 'completed', parts: { current: 5, total: 5 }, started_at: '2026-10-21T16:00:05.000Z', completed_at: '2026-10-21T17:31:00.000Z',
  error: null, saved_parts: 0, url_check: { status: 'ok', message: 'доступна' },
  start: { state: 'recording', stage_label: 'Запись идёт', severity: 'info', method_label: 'Через браузер' },
  method: { label: 'Через браузер', platform: 'Bizon365' }, has_files: true, files_deleted_at: null, expires_at: '2026-11-20T17:31:00.000Z',
  merge: { status: 'completed', available: true, has_merged: true, error_code: null, error_detail: null }, ...o,
});

test('карточка → зеркало: статус, части, время, проверка ссылки, склейка', () => {
  const { set, meta } = cardToLocal(card(), new Date('2026-10-21T18:00:00Z'));
  assert.equal(set.status, 'completed');
  assert.deepEqual([set.currentPart, set.totalParts, set.duration], [5, 5, 90]);
  assert.equal((set.startedAt as Date).toISOString(), '2026-10-21T16:00:05.000Z');
  assert.equal((set.scheduledTime as Date).toISOString(), '2026-10-21T16:00:00.000Z');
  assert.equal(set.errorMessage, null);
  assert.deepEqual([set.urlCheckStatus, set.urlCheckMessage], ['ok', 'доступна']);
  assert.equal(meta.mergeStatus, 'completed');
  assert.equal(meta.mergeError, null);
  assert.equal((meta.hr as any).syncedAt, '2026-10-21T18:00:00.000Z');

  const failed = cardToLocal(card({ status: 'failed', error: { reason: 'Трансляция не началась', hint: 'Проверьте время' },
    merge: { status: 'failed', error_code: 'format_mismatch', error_detail: 'части 1 и 2' } }));
  assert.equal(failed.set.errorMessage, 'Трансляция не началась');
  assert.equal(failed.meta.mergeError, 'Части записаны в разном формате — склеить их нельзя: части 1 и 2');
  assert.equal(cardToLocal(card({ status: 'weird' })).set.status, 'failed', 'неизвестный статус — ошибка, а не «висит»');
  assert.equal(cardToLocal(card({ merge: { status: 'queued' } })).meta.mergeProgress, 'В очереди на склейку');
});

test('файлы → части зеркала с метками hr:<id>; ключ меняется вместе с файлами', () => {
  const at = new Date('2026-10-21T16:00:00Z');
  const r = filesToLocal([
    { id: 'merged', label: 'Вся запись', file_name: 'Лекция.mp4', url: 'https://s3/x?sig' },
    { id: '2', label: 'Часть 2', file_name: 'Лекция — часть 2.mp4', url: 'https://s3/2' },
    { id: '1', label: 'Часть 1', file_name: 'Лекция — часть 1.mp4', url: 'https://s3/1' },
  ], at);
  assert.deepEqual(r.parts.map((p) => [p.partNumber, p.publicUrl, p.status]), [[1, 'hr:1', 'completed'], [2, 'hr:2', 'completed']]);
  assert.equal(r.begetUrl, 'hr:1');
  assert.equal(r.mergedUrl, 'hr:merged');
  assert.ok(!JSON.stringify(r).includes('https://'), 'временные ссылки в зеркало не попадают');
  assert.deepEqual(filesToLocal([], at), { parts: [], begetUrl: null, mergedUrl: null });
  assert.notEqual(filesKey(card()), filesKey(card({ merge: { has_merged: false } })));
  assert.notEqual(filesKey(card()), filesKey(card({ files_deleted_at: '2026-11-20T00:00:00Z' })));
});

test('статус старта для кабинета — из карточки Help Recorder', () => {
  const { meta } = cardToLocal(card({ status: 'in_progress', start: { state: 'starting', stage_label: 'Входим в трансляцию', severity: 'info' } }));
  const st = hrStartStatus(meta, 'in_progress');
  assert.deepEqual([st.state, st.stageLabel, st.severity], ['starting', 'Входим в трансляцию', 'info']);
  const f = cardToLocal(card({ status: 'failed', start: null, error: { reason: 'Нет звука', hint: 'Проверьте' } }));
  assert.deepEqual([hrStartStatus(f.meta, 'failed').reason, hrStartStatus(f.meta, 'failed').severity], ['Нет звука', 'error']);
  assert.equal(hrStartStatus({}, 'scheduled'), undefined);
});

test('тела запросов: новая запись с подтверждением прав; правка не стирает то, чего форма не знает', () => {
  const b = createBody({ title: ' Лекция ', streamUrl: 'https://example.com/w', scheduledTime: '2026-10-21T16:00:00.000Z', duration: 60, streamPassword: '', joinName: 'Иван' });
  assert.deepEqual(b, { title: 'Лекция', stream_url: 'https://example.com/w', scheduled_time: '2026-10-21T16:00:00.000Z', duration: 60, join_name: 'Иван', rights_confirmed: true });

  assert.deepEqual(editBody({ title: 'Новое', streamUrl: 'https://example.com/w', scheduledTime: '2026-10-22T10:00:00+03:00', duration: '45', streamPassword: '', joinEmail: 'a@b.ru' }),
    { title: 'Новое', stream_url: 'https://example.com/w', scheduled_time: '2026-10-22T07:00:00.000Z', duration: 45, join_email: 'a@b.ru' });
  assert.deepEqual(editBody({ streamPassword: undefined, joinName: '  ' }), {}, 'пустые поля — не менять');
});

test('ошибки Help Recorder: понятный текст, сбои ключа и сети — 502 без подробностей', () => {
  assert.equal(hrMessage('limit_minutes', { max: 180 }), 'Запись не может быть длиннее 180 минут.');
  assert.equal(hrMessage('time_too_far', { days: 90 }), 'Можно планировать не дальше чем на 90 дней вперёд.');
  assert.match(hrMessage('что-то новое'), /недоступен/);
  assert.deepEqual(hrErrorResponse(new HrError(400, 'drm_platform', 'x')), { status: 400, message: 'Этот сервис записать нельзя: контент защищён (DRM).' });
  assert.equal(hrErrorResponse(new HrError(409, 'not_editable', 'x')).status, 409);
  assert.equal(hrErrorResponse(new HrError(429, 'partner_quota_day', 'x', { max: 2000 })).status, 429);
  for (const e of [new HrError(401, 'unauthorized', 'x'), new HrError(0, 'network', 'x'), new HrError(500, 'internal', 'x'), new HrError(400, 'user_required', 'x')]) {
    assert.equal(hrErrorResponse(e).status, 502);
    assert.doesNotMatch(hrErrorResponse(e).message, /unauthorized|user_required|ключ/);
  }
});

test('режим Help Recorder включается адресом и ключом; запись узнаётся по save_target или hrTaskId', () => {
  const keep = { url: process.env.HR_API_URL, key: process.env.HR_PARTNER_KEY };
  try {
    delete process.env.HR_API_URL; delete process.env.HR_PARTNER_KEY;
    assert.equal(hrEnabled(), false);
    process.env.HR_API_URL = 'https://api.recorder.help/'; process.env.HR_PARTNER_KEY = 'hrp_x';
    assert.equal(hrEnabled(), true);
  } finally {
    if (keep.url === undefined) delete process.env.HR_API_URL; else process.env.HR_API_URL = keep.url;
    if (keep.key === undefined) delete process.env.HR_PARTNER_KEY; else process.env.HR_PARTNER_KEY = keep.key;
  }
  assert.equal(isHrTask({ saveTarget: 'help_recorder' }), true);
  assert.equal(isHrTask({ saveTarget: 'beget', metadata: { hrTaskId: 'x' } }), true);
  assert.equal(isHrTask({ saveTarget: 'beget', metadata: {} }), false);
  assert.equal(isHrTask(null), false);
});
