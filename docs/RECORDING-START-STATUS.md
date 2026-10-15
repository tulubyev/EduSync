# Стартовала ли запись и почему нет

Для каждой задачи записи API отдаёт поле `start` (`GET /api/recording/tasks`, `/tasks/:id`),
а в карточке задачи показывается панель статуса.

## Состояния

| `start.state` | Когда | Что видит пользователь |
|---|---|---|
| `waiting` | задача `scheduled`/`ready`, воркер её ещё не взял | причина ожидания: «ещё не время, через N мин», «нет активного воркера» (`NO_WORKER`), «воркер занят другой записью» |
| `starting` | воркер взял задачу, идёт запуск | текущий этап: проверка ссылки → запуск браузера → открытие страницы → вход → ожидание первого кадра |
| `recording` | **получен первый кадр** — запись реально идёт | «Запись стартовала» + время |
| `retrying` | попытка не удалась, будет повтор (до 3) | причина + «будет повторная попытка» |
| `failed` | окончательный отказ | «Запись не стартовала» (или «началась, но прервалась») + причина + что делать |

Запись считается начавшейся только после первого кадра (`recordingConfirmed = true`), а не в момент
перехода задачи в `in_progress`.

## Коды причин (`start.code`)

`URL_INVALID`, `URL_UNREACHABLE`, `URL_BLOCKED_RF` (нужен прокси, см. `RECORDING-PROXY.md`), `URL_FORBIDDEN`,
`URL_NOT_FOUND`, `PAGE_LOAD_TIMEOUT`, `JOIN_FORM_FAILED`, `BROWSER_LAUNCH_FAILED`, `BROWSER_DISCONNECTED`,
`NO_FRAMES`, `FFMPEG_FAILED`, `DISK_SPACE_LOW`, `S3_UPLOAD_FAILED`, `NO_WORKER`, `WORKER_RESTARTED`,
`HEARTBEAT_TIMEOUT`, `UNKNOWN`.

## Где хранится

- `recording_tasks.metadata.start` — последнее состояние (схема БД не менялась).
- `recording_logs` — события `start_stage`, `recording_started`, `start_failed`, `task_failed`
  с `metadata.code` (`GET /api/recording/tasks/:id/logs`).
- Классификатор — `server/services/recording/startStatus.ts`, запись воркером — `executor/startTracker.ts`.

## Диагностика на сервере

```sql
SELECT id, status, metadata->'start' FROM recording_tasks ORDER BY updated_at DESC LIMIT 5;
SELECT created_at, event_type, message FROM recording_logs WHERE task_id = '<id>' ORDER BY created_at;
```

Воркер считается живым, если `recording_worker_status.last_seen_at` свежее ~90 с. Старые строки
(например, от Replit) можно удалить: `DELETE FROM recording_worker_status WHERE worker_id IN (...)`.
