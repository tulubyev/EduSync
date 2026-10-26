/**
 * Ссылка на запись в библиотеке: <сайт>/recordings?task=<id записи>&video=<часть или merged>.
 * Ссылки на сами файлы временные (Help Recorder — 12 ч), поэтому в карточке хранится ссылка на запись,
 * а свежая ссылка на файл берётся при показе (RecordingVideo) — только для владельца записи.
 */
export interface RecordingRef { taskId: string; video: string }

const RE = /^(?:https?:\/\/[^/?#]+)?\/recordings\?task=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:&video=([A-Za-z0-9_-]{1,20}))?(?:[&#].*)?$/i;

export function parseRecordingRef(url: string | null | undefined): RecordingRef | null {
  const m = RE.exec(url ?? '');
  return m ? { taskId: m[1].toLowerCase(), video: m[2] ?? '' } : null;
}

/** Подпись файла записи на языке ученика: склейка, часть N или единственный файл (как partLabel на сервере) */
export function videoLabel(video: string, partCount: number, f: { merged: string; part: (n: string) => string; single: string }): string {
  if (video === 'merged') return f.merged;
  return partCount > 1 ? f.part(video) : f.single;
}
