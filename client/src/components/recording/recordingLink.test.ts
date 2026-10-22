/** Ссылка на запись в карточке библиотеки (npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRecordingRef } from './recordingLink';

test('ссылка на запись в библиотеке распознаётся, чужие ссылки — нет', () => {
  const id = '8932b2fe-3d57-4d33-8fb8-fe6ae5fc074e';
  assert.deepEqual(parseRecordingRef(`https://myepa.ru/recordings?task=${id}&video=2`), { taskId: id, video: '2' });
  assert.deepEqual(parseRecordingRef(`https://myepa.ru/recordings?task=${id}&video=merged`), { taskId: id, video: 'merged' });
  assert.deepEqual(parseRecordingRef(`/recordings?task=${id.toUpperCase()}`), { taskId: id, video: '' });
  assert.equal(parseRecordingRef('https://myepa.ru/recordings'), null, 'старые карточки — просто ссылка');
  assert.equal(parseRecordingRef(`https://evil.example/x?y=/recordings?task=${id}&video=1"><script>`), null);
  assert.equal(parseRecordingRef('https://s3/bucket/myepa/recordings/2026/10/x.mp4'), null);
  assert.equal(parseRecordingRef(undefined), null);
});
