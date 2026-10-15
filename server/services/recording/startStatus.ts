/**
 * Статус старта записи: «стартовала или нет» и причина отказа.
 *
 * Воркер пишет в recording_tasks.metadata.start этапы запуска (StartRecord) и
 * итог (код причины + человекочитаемый текст + подсказка). Для задач, которые
 * ещё не взяты в работу, причину ожидания вычисляет сервер (diagnoseWaiting).
 *
 * Модуль чистый (без БД и playwright), чтобы его можно было импортировать и в
 * воркере, и в веб-сервере, и проверять юнит-тестом.
 */

export type StartStage =
  | 'validating_url'
  | 'launching_browser'
  | 'opening_page'
  | 'joining'
  | 'capturing'
  | 'recording'
  | 'uploading';

export const STAGE_LABELS: Record<StartStage, string> = {
  validating_url: 'Проверяем ссылку',
  launching_browser: 'Запускаем браузер',
  opening_page: 'Открываем страницу трансляции',
  joining: 'Входим в трансляцию',
  capturing: 'Ждём первый кадр',
  recording: 'Запись идёт',
  uploading: 'Загружаем запись',
};

export type StartFailureCode =
  | 'URL_INVALID'
  | 'URL_UNREACHABLE'
  | 'URL_BLOCKED_RF'
  | 'URL_FORBIDDEN'
  | 'URL_NOT_FOUND'
  | 'PAGE_LOAD_TIMEOUT'
  | 'JOIN_FORM_FAILED'
  | 'BROWSER_LAUNCH_FAILED'
  | 'BROWSER_DISCONNECTED'
  | 'NO_FRAMES'
  | 'FFMPEG_FAILED'
  | 'AUDIO_UNAVAILABLE'
  | 'DISK_SPACE_LOW'
  | 'S3_UPLOAD_FAILED'
  | 'NO_WORKER'
  | 'PAUSED'
  | 'USER_LIMIT'
  | 'WORKER_RESTARTED'
  | 'HEARTBEAT_TIMEOUT'
  | 'UNKNOWN';

/** Что сохраняется в recording_tasks.metadata.start */
export interface StartRecord {
  /** starting — идёт запуск, recording — запись подтверждена, retrying — попытка не удалась, будет повтор, failed — окончательно */
  state: 'starting' | 'recording' | 'retrying' | 'failed';
  stage?: StartStage;
  attempt?: number;
  maxAttempts?: number;
  /** true, если был получен хотя бы один кадр (запись реально началась) */
  recordingConfirmed?: boolean;
  startedAt?: string;
  recordingStartedAt?: string;
  updatedAt: string;
  code?: StartFailureCode;
  reason?: string;
  hint?: string;
  /** Сырой текст ошибки для диагностики */
  detail?: string;
}

/** Что отдаётся клиенту в task.start (запись воркера + вычисленное сервером ожидание) */
export interface StartStatus extends Omit<StartRecord, 'state'> {
  state: StartRecord['state'] | 'waiting';
  /** Для state='starting': человекочитаемое название этапа */
  stageLabel?: string;
  /** warn — стоит обратить внимание, error — запись не стартует/не стартовала */
  severity?: 'info' | 'warn' | 'error';
}

export interface Classified {
  code: StartFailureCode;
  reason: string;
  hint?: string;
}

const PROXY_HINT =
  'Сервер в РФ не может открыть этот сайт. Используйте источник, доступный из РФ (Rutube, VK Видео), либо настройте прокси для записи (RECORDING_PROXY_URL, см. docs/RECORDING-PROXY.md).';

/**
 * Определяет код и понятную причину по тексту ошибки и этапу, на котором она случилась.
 */
export function classifyRecordingError(err: unknown, stage?: StartStage): Classified {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const msg = raw.toLowerCase();

  // --- Предпроверка URL (urlValidator) ---
  if (raw.includes('Некорректный URL') || raw.includes('Неподдерживаемый протокол')) {
    return {
      code: 'URL_INVALID',
      reason: 'Некорректная ссылка на трансляцию',
      hint: 'Проверьте ссылку: нужен адрес вида https://… (также поддерживаются rtsp/rtmp).',
    };
  }
  if (raw.includes('вероятно заблокирован в РФ') || raw.includes('списка заблокированных в РФ')) {
    return { code: 'URL_BLOCKED_RF', reason: 'Сайт трансляции недоступен с сервера (вероятно, заблокирован в РФ)', hint: PROXY_HINT };
  }
  if (raw.includes('DNS не разрешается') || raw.includes('Соединение отклонено') || raw.includes('Соединение сброшено')
    || /enotfound|econnrefused|econnreset|getaddrinfo/.test(msg)) {
    return {
      code: 'URL_UNREACHABLE',
      reason: 'Сервер записи не смог подключиться к адресу трансляции',
      hint: 'Проверьте, что ссылка открывается и трансляция существует. Если сайт доступен только из-за рубежа — нужен прокси.',
    };
  }
  if (raw.includes('Таймаут подключения')) {
    return {
      code: 'URL_UNREACHABLE',
      reason: 'Адрес трансляции не отвечает (таймаут подключения)',
      hint: 'Сайт может быть недоступен из РФ или перегружен. Проверьте ссылку; при необходимости настройте прокси.',
    };
  }
  if (/\b403\b/.test(raw)) {
    return {
      code: 'URL_FORBIDDEN',
      reason: 'Доступ к трансляции запрещён (403)',
      hint: 'Трансляция приватная или требует входа. Укажите пароль/имя/e-mail участника или откройте доступ по ссылке.',
    };
  }
  if (/\b404\b/.test(raw)) {
    return {
      code: 'URL_NOT_FOUND',
      reason: 'Трансляция не найдена (404)',
      hint: 'Возможно, вебинар удалён или ещё не создан. Проверьте ссылку.',
    };
  }

  // --- Открытие страницы в браузере ---
  if (/err_name_not_resolved|err_connection|err_internet_disconnected|err_address_unreachable|err_proxy|err_tunnel|err_timed_out|err_ssl|err_cert/.test(msg)) {
    return {
      code: 'URL_UNREACHABLE',
      reason: 'Браузер не смог открыть страницу трансляции (сеть/DNS/прокси)',
      hint: 'Проверьте ссылку и доступность сайта с сервера. Для сайтов, заблокированных в РФ, нужен прокси (RECORDING_PROXY_URL).',
    };
  }
  if (stage === 'opening_page' && (msg.includes('timeout') || msg.includes('timed out'))) {
    return {
      code: 'PAGE_LOAD_TIMEOUT',
      reason: 'Страница трансляции не загрузилась за 3 минуты',
      hint: 'Сайт перегружен или недоступен с сервера. Проверьте ссылку, повторите позже или используйте прокси.',
    };
  }
  if (stage === 'joining' || /форм[аы] входа|не удалось войти/.test(msg)) {
    return {
      code: 'JOIN_FORM_FAILED',
      reason: 'Не удалось войти в трансляцию (форма входа/пароль)',
      hint: 'Проверьте пароль, имя, e-mail и телефон участника в задаче и сохраните её заново.',
    };
  }

  // --- Браузер / захват ---
  if (stage === 'launching_browser' || (/failed to launch|browsertype\.launch|executable doesn't exist/.test(msg) && !/disconnected/.test(msg))) {
    return {
      code: 'BROWSER_LAUNCH_FAILED',
      reason: 'Не удалось запустить браузер на сервере записи',
      hint: 'Проблема на стороне воркера (Chromium/дисплей/память). Смотрите логи воркера: docker compose logs worker.',
    };
  }
  if (/browser disconnected|target closed|browser has been closed|page closed|браузер завис или упал|target page, context or browser has been closed/.test(msg)) {
    return {
      code: 'BROWSER_DISCONNECTED',
      reason: 'Браузер завершился или завис во время записи',
      hint: 'Часто это нехватка памяти на сервере. Повторите запись; если повторяется — проверьте память воркера.',
    };
  }
  if (raw.includes('Недостаточно места на диске')) {
    return { code: 'DISK_SPACE_LOW', reason: 'На сервере записи не хватает места на диске', hint: 'Освободите место (docker system prune, очистка /tmp/recordings) и перезапустите задачу.' };
  }
  if (/ffmpeg/.test(msg)) {
    return {
      code: 'FFMPEG_FAILED',
      reason: 'Кодировщик ffmpeg завершился с ошибкой',
      hint: 'Смотрите логи воркера ([FFMPEG]); частые причины — нет места на диске или сломанный аудиоустройство PulseAudio.',
    };
  }
  if (raw.includes('ни одного кадра') || raw.includes('0 frames') || raw.includes('страница не рендерится') || raw.includes('не прислал')) {
    return {
      code: 'NO_FRAMES',
      reason: 'Браузер открыл страницу, но видео не пошло (кадры не получены)',
      hint: 'Трансляция ещё не началась, закрыта для гостей или требует входа. Проверьте, что она идёт, и что указаны данные для входа.',
    };
  }

  // --- Загрузка / воркер ---
  if (raw.includes('S3') || raw.includes('чанк не был загружен') || /nosuchbucket|accessdenied|signaturedoesnotmatch|invalidaccesskey|uploadpart|multipart/.test(msg)) {
    return {
      code: 'S3_UPLOAD_FAILED',
      reason: 'Запись сделана, но загрузить её в хранилище S3 не удалось',
      hint: 'Проверьте ключи и бакет BEGET_S3_* в .env воркера. Файл мог остаться на диске воркера.',
    };
  }
  if (raw.includes('перезапустился') || raw.includes('Воркер перезапускался')) {
    return { code: 'WORKER_RESTARTED', reason: 'Воркер перезапустился во время записи', hint: 'Задача будет повторена автоматически (до 3 попыток).' };
  }
  if (raw.includes('heartbeat') || raw.includes('Воркер не отвечал')) {
    return { code: 'HEARTBEAT_TIMEOUT', reason: 'Воркер перестал отвечать во время записи', hint: 'Проверьте, что контейнер воркера запущен: docker compose ps.' };
  }

  return { code: 'UNKNOWN', reason: raw ? raw.slice(0, 300) : 'Неизвестная ошибка', hint: 'Подробности — в журнале событий задачи и логах воркера.' };
}

// ---------------------------------------------------------------------------
// Диагностика ожидающих задач (сервер, до того как воркер взял задачу)
// ---------------------------------------------------------------------------

export interface WorkerSnapshot {
  workerId: string;
  isActive: boolean | null;
  lastSeenAt: Date | string | null;
  activeTaskId: string | null;
}

export interface WaitingContext {
  now: Date;
  /** Поправка (часы), с которой воркер сравнивает scheduled_time (SCHEDULED_TIME_TZ_OFFSET_H) */
  tzOffsetH: number;
  workers: WorkerSnapshot[];
  /** Приём записей приостановлен админом */
  paused?: boolean;
  /** Разрешённая параллельность (null — не ограничена настройкой) */
  concurrency?: number | null;
  /** Лимит одновременных записей на пользователя (0/undefined — нет) */
  perUserLimit?: number;
  /** Сколько записей сейчас идёт у каждого пользователя */
  activeByUser?: Record<string, number>;
  /** Воркер считается живым, если был на связи не позднее этого времени (мс) */
  workerAliveMs: number;
}

export interface TaskForDiagnosis {
  id: string;
  userId?: string;
  status: string;
  scheduledTime: Date | string;
  attemptCount?: number | null;
  errorMessage?: string | null;
  urlCheckStatus?: string | null;
  urlCheckMessage?: string | null;
  start?: StartRecord | null;
}

function fmtDelta(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return 'менее минуты';
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

/**
 * Собирает итоговый StartStatus для отдачи клиенту.
 *  - есть запись воркера (metadata.start) → используем её;
 *  - задача ожидает → вычисляем, почему она ещё не стартовала.
 */
export function buildStartStatus(task: TaskForDiagnosis, ctx: WaitingContext): StartStatus | undefined {
  const rec = task.start ?? undefined;

  if (task.status === 'in_progress' || task.status === 'uploading') {
    if (!rec) {
      return { state: 'starting', stage: 'validating_url', stageLabel: STAGE_LABELS.validating_url, updatedAt: new Date().toISOString(), severity: 'info' };
    }
    const status: StartStatus = { ...rec, severity: rec.state === 'retrying' ? 'warn' : 'info' };
    if (rec.state === 'starting' && rec.stage) status.stageLabel = STAGE_LABELS[rec.stage];
    if (task.status === 'uploading') status.recordingConfirmed = true;
    return status;
  }

  if (task.status === 'failed' || task.status === 'completed') {
    if (!rec) return undefined;
    return { ...rec, severity: task.status === 'failed' ? 'error' : 'info' };
  }

  if (task.status === 'scheduled' || task.status === 'ready') {
    const scheduledMs = new Date(task.scheduledTime).getTime();
    const nowLocalMs = ctx.now.getTime() + ctx.tzOffsetH * 3600_000;
    const updatedAt = ctx.now.toISOString();

    // Предыдущая попытка не удалась — показываем причину и что будет повтор
    if (rec && rec.state === 'retrying') {
      return { ...rec, severity: 'warn' };
    }

    if (scheduledMs > nowLocalMs) {
      const hint = task.urlCheckStatus === 'failed' && task.urlCheckMessage
        ? `Внимание: ссылка сейчас не проходит проверку — ${task.urlCheckMessage}`
        : undefined;
      return {
        state: 'waiting',
        reason: `Ещё не время: запись начнётся через ${fmtDelta(scheduledMs - nowLocalMs)}`,
        hint,
        updatedAt,
        severity: hint ? 'warn' : 'info',
      };
    }

    // Время пришло, а задача всё ещё не взята
    if (ctx.paused) {
      return {
        state: 'waiting',
        code: 'PAUSED',
        reason: 'Приём записей приостановлен администратором — задача начнётся после возобновления',
        updatedAt,
        severity: 'warn',
      };
    }
    if (ctx.perUserLimit && ctx.perUserLimit > 0 && task.userId && (ctx.activeByUser?.[task.userId] ?? 0) >= ctx.perUserLimit) {
      return {
        state: 'waiting',
        code: 'USER_LIMIT',
        reason: `У вас уже идёт ${ctx.perUserLimit} запис${ctx.perUserLimit === 1 ? 'ь' : 'и'} одновременно — эта начнётся, когда одна из них закончится`,
        hint: 'Лимит одновременных записей на пользователя задаёт администратор.',
        updatedAt,
        severity: 'warn',
      };
    }

    // Смотрим воркеры
    const alive = ctx.workers.filter(
      (w) => w.isActive !== false && w.lastSeenAt && ctx.now.getTime() - new Date(w.lastSeenAt).getTime() <= ctx.workerAliveMs,
    );
    if (alive.length === 0) {
      return {
        state: 'waiting',
        code: 'NO_WORKER',
        reason: 'Время записи наступило, но нет активного воркера — запись не стартует',
        hint: 'Запустите воркер на сервере: WITH_WORKER=1 bash deploy.sh (или docker compose --profile worker up -d). Проверьте режим исполнителя в админке (vps).',
        updatedAt,
        severity: 'error',
      };
    }
    const busy = alive.filter((w) => w.activeTaskId).length;
    const capacity = ctx.concurrency ?? alive.length;
    if (busy >= Math.min(capacity, alive.length) || alive.every((w) => w.activeTaskId)) {
      return {
        state: 'waiting',
        reason: 'Все места для записи заняты — задача начнётся, когда одно освободится',
        hint: 'Число одновременных записей задаёт администратор (панель записи → «Приём записей»); верхний предел — MAX_WORKERS на сервере.',
        updatedAt,
        severity: 'warn',
      };
    }
    return {
      state: 'waiting',
      reason: task.status === 'scheduled' ? 'Время наступило — задача сейчас будет поставлена в очередь' : 'Задача в очереди, воркер скоро её подхватит',
      updatedAt,
      severity: 'info',
    };
  }

  return undefined;
}
