/**
 * Тексты ошибок Help Recorder для кабинета My EPA (коды — из ответа API; тексты — как в кабинете Help Recorder).
 */
import { HrError } from './client';

const MESSAGES: Record<string, string> = {
  invalid_field: 'Проверьте заполнение полей.',
  invalid_url: 'Нужна ссылка, начинающаяся с http:// или https://.',
  url_not_allowed: 'Эту ссылку записать нельзя: адрес внутренний или недопустимый.',
  url_unresolvable: 'Адрес не найден. Проверьте ссылку.',
  source_not_allowed: 'Эту площадку записать нельзя.',
  drm_platform: 'Этот сервис записать нельзя: контент защищён (DRM).',
  invalid_time: 'Укажите дату и время.',
  time_in_past: 'Время начала уже прошло.',
  time_too_far: 'Можно планировать не дальше чем на {days} дней вперёд.',
  invalid_duration: 'Длительность: от 1 до 720 минут.',
  limit_minutes: 'Запись не может быть длиннее {max} минут.',
  limit_month: 'Достигнут лимит записей на этот месяц: {max}.',
  limit_concurrent: 'В это время уже идут другие ваши записи (лимит одновременных: {max}).',
  limit_pending: 'Слишком много запланированных записей (не больше {max}).',
  rights_required: 'Подтвердите, что вы вправе записывать это событие.',
  partner_quota_day: 'Сервис записи сегодня перегружен. Попробуйте позже.',
  partner_quota_active: 'Сейчас запланировано слишком много записей. Попробуйте позже.',
  not_cancellable: 'Отменить можно только запись, которая ещё не началась.',
  not_editable: 'Запись уже началась или закончилась — изменить её нельзя.',
  not_retryable: 'Повторить сейчас нельзя.',
  event_over: 'Событие уже закончилось, повторять запись поздно.',
  not_ready: 'Запись ещё не готова.',
  files_deleted: 'Файлы удалены по сроку хранения.',
  not_mergeable: 'Склеивать можно только готовую запись, файлы которой ещё хранятся.',
  merge_busy: 'Склейка уже идёт или стоит в очереди.',
  merge_not_cancellable: 'Склейка уже началась или закончилась — отменить нельзя.',
  invalid_sources: 'Часть недоступна: запись удалена, не готова или её файлы удалены. Обновите страницу.',
  too_many_parts: 'За раз можно склеить не больше {max} частей.',
  too_few_parts: 'Выберите хотя бы две части.',
  merge_too_long: 'Склеенный файл — не длиннее {max} минут.',
  task_busy: 'Запись ещё идёт, склеивается или копируется. Удалить её можно после окончания.',
  storage_unavailable: 'Хранилище файлов сейчас недоступно. Попробуйте позже.',
  not_found: 'Запись не найдена в сервисе записи.',
  rate_limited: 'Слишком много запросов. Подождите немного и повторите.',
  not_active: 'Аккаунт удаляется — запись недоступна.',
};

/** Понятный текст по коду ошибки; {max} и {days} — из data ответа */
export function hrMessage(code: string, data?: Record<string, unknown>): string {
  const text = MESSAGES[code];
  if (!text) return 'Сервис записи сейчас недоступен. Попробуйте позже.';
  return text.replace(/\{(\w+)\}/g, (_, k) => String(data?.[k] ?? '…'));
}

/** Ответ кабинету: статус и текст (ошибки ключа и сети — 502, их видит администратор в логах) */
export function hrErrorResponse(e: HrError): { status: number; message: string } {
  if (e.status === 0 || e.status === 401 || e.status >= 500 || e.code === 'user_required' || e.code === 'invalid_account') {
    return { status: 502, message: 'Сервис записи сейчас недоступен. Попробуйте позже.' };
  }
  return { status: e.status === 429 ? 429 : e.status === 404 ? 404 : e.status === 409 ? 409 : 400, message: hrMessage(e.code, e.data) };
}
