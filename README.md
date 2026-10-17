# MyEPA (EduSync)

**My Educational Program Aggregator** — агрегатор образовательных программ: курсы с разных
онлайн-платформ, дедлайны, заметки и записи вебинаров в одном личном кабинете.
Сайт: [myepa.ru](https://myepa.ru) (также epa-link.ru).

## Возможности

- **Платформы обучения:** каталог онлайн-платформ с фильтрами по региону, языку и
  категории, подключение своих платформ; для Stepik — вход через OAuth и синхронизация
  курсов.
- **Курсы:** личный список курсов, прогресс, избранное, общий каталог.
- **Дедлайны:** сроки по курсам, ближайшие дедлайны, отметка о выполнении.
- **Библиотека:** заметки по курсам с поиском и закреплением.
- **Аналитика** по обучению.
- **AI-ассистент:** чат и рекомендации через OpenRouter.
- **Запись вебинаров:** планирование записи трансляции по ссылке; отдельный воркер
  открывает страницу в Chromium (или берёт прямой поток через ffmpeg, yt-dlp, streamlink),
  записывает видео со звуком и сохраняет в S3, в библиотеку или на Яндекс Диск. Статус
  старта и причины ошибок видны в карточке задачи. Управление очередью и параллельностью —
  из админ-панели.
- **Подписки и оплата:** тарифы, оплата через ЮKassa или Альфа-Банк, автопродление.
- **Аккаунт:** регистрация и вход (JWT), профиль с фото, письма через SMTP;
  двухфакторная аутентификация по SMS подготовлена, но выключена (`ENABLE_2FA`).
- **Админ-панель:** пользователи и роли, мониторинг системы, платежи, управление записью.

## Стек

- **Сервер:** Node.js, Express, TypeScript (ESM), Drizzle ORM + PostgreSQL.
- **Клиент:** React, Vite, Tailwind CSS, shadcn/ui (Radix), Wouter.
- **Воркер записи:** Playwright/Chromium, ffmpeg, PulseAudio, yt-dlp / streamlink,
  S3-совместимое хранилище (AWS SDK).
- **Деплой:** Docker (два образа: `web` и `worker`), Traefik, GitHub Actions.

## Структура репозитория

```
client/src/              React-клиент: components/, services/, hooks/
server/
  index.ts               точка входа веб-приложения
  recording-worker.ts    точка входа воркера записи
  routes/                API: auth, courses, deadlines, library, platforms, stepik,
                         ai, recording, subscriptions, users, admin, profile
  services/              бизнес-логика; recording/ — очередь и исполнитель записи,
                         payments/ — платёжные шлюзы
  storage/               доступ к данным
  middleware/            безопасность, авторизация, логирование, метрики, кэш
shared/schema.ts         схема БД (Drizzle)
config/environment.ts    конфигурация из переменных окружения
docker/                  entrypoint воркера (PulseAudio)
docs/                    документация по записи вебинаров
Dockerfile               сборка образов web и worker
docker-compose.prod.yml  продакшен-конфигурация
```

## Запуск локально

```bash
npm ci
cp .env.example .env       # заполнить значения
npm run dev                # веб-приложение в режиме разработки
npm run worker:dev         # воркер записи (нужны Chromium и ffmpeg)
```

Сборка, проверка типов и схема БД:

```bash
npm run build              # vite build + esbuild сервера в dist/
npm run build:worker       # бандл воркера dist/recording-worker.js
npm start                  # запуск собранного веб-приложения
npm run worker             # запуск воркера
npm run check              # tsc
npm run db:push            # drizzle-kit push
```

CI (`.github/workflows/ci.yml`) выполняет `npm run check`, проверку
`docker-compose.prod.yml` с `.env.example`, `npm run build` и `npm run build:worker`.

## Переменные окружения

Полный список с комментариями — в `.env.example`. Основные группы:

| Переменные | Назначение |
|---|---|
| `NODE_ENV`, `PORT`, `HOST`, `APP_URL`, `FRONTEND_URL`, `APP_DOMAIN`, `APP_DOMAIN_ALT`, `STATIC_PATH` | режим, адреса и домены приложения |
| `DATABASE_URL`, `DATABASE_SSL`, `DATABASE_MAX_CONNECTIONS`, `DATABASE_CONNECTION_TIMEOUT`, `DATABASE_QUERY_TIMEOUT` | PostgreSQL |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY`, `PLATFORM_TOKENS_ENCRYPTION_KEY`, `API_SECRET` | секреты аутентификации и шифрования |
| `RATE_LIMIT_*`, `CORS_*`, `HSTS_*`, `SESSION_TIMEOUT`, `MAX_LOGIN_ATTEMPTS`, `ACCOUNT_LOCKOUT_DURATION` | безопасность и лимиты |
| `LOG_*`, `METRICS_*`, `CACHE_HIT_THRESHOLD`, `SLOW_REQUEST_THRESHOLD`, `RESPONSE_TIME_ALERT_THRESHOLD`, `ERROR_RATE_THRESHOLD` | логирование и метрики |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_TIMEOUT`, `OPENROUTER_MAX_RETRIES` | AI-ассистент |
| `BEGET_SMTP_HOST`, `BEGET_SMTP_PORT`, `BEGET_SMTP_USER`, `BEGET_SMTP_PASSWORD`, `EMAIL_TIMEOUT` | отправка писем |
| `SMS_RU_API_KEY`, `ENABLE_2FA` | SMS и двухфакторная аутентификация |
| `STEPIK_CLIENT_ID`, `STEPIK_CLIENT_SECRET` | интеграция со Stepik |
| `DEFAULT_PAYMENT_PROVIDER`, `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `ALFABANK_USERNAME`, `ALFABANK_PASSWORD` | платежи |
| `YANDEX_DISK_TOKEN`, `YANDEX_DISK_FOLDER_ID` | сохранение записей на Яндекс Диск |
| `BEGET_S3_ENDPOINT`, `BEGET_S3_REGION`, `BEGET_S3_BUCKET`, `BEGET_S3_ACCESS_KEY`, `BEGET_S3_SECRET_KEY`, `BEGET_S3_PUBLIC_URL` | S3-хранилище записей |
| `DISABLE_RECORDING_EXECUTOR` | выключает встроенный исполнитель записи в веб-приложении, когда работает отдельный воркер |
| `WORKER_ID`, `MAX_WORKERS`, `SCHEDULED_TIME_TZ_OFFSET_H`, `RECORDINGS_DIR`, `VIEWPORT_WIDTH`, `VIEWPORT_HEIGHT`, `FRAME_RATE` | настройки воркера записи |
| `RECORDING_JOIN_NAME`, `RECORDING_JOIN_EMAIL`, `RECORDING_JOIN_PHONE` | данные для формы входа на вебинар |
| `RECORDING_PROXY_URL`, `RECORDING_PROXY_BYPASS` | прокси для Chromium (см. `docs/RECORDING-PROXY.md`) |

## Деплой

Docker + Traefik. Образы `web` и `worker` собирает GitHub Actions
(`.github/workflows/docker.yml`) и публикует в GHCR; на сервере выполняется только
`pull` и перезапуск через `deploy.sh`. Воркер записи вынесен в отдельный профиль
compose, чтобы не запустить второй экземпляр случайно. Конфигурация — в
`docker-compose.prod.yml` и `deploy.sh`, особенности записи — в `docs/`.

## Статус

Активный проект. С 15.10.2026 здесь работает воркер записи вебинаров из
[Night Recorder](https://github.com/tulubyev/MYEPA-Record) — отдельного продукта, движок записи у них общий.

## Документация

- [docs/RECORDING-START-STATUS.md](docs/RECORDING-START-STATUS.md) — статусы старта
  записи и коды причин.
- [docs/RECORDING-SCALING.md](docs/RECORDING-SCALING.md) — запись под нагрузкой:
  управление, ёмкость, оптимизация.
- [docs/RECORDING-PROXY.md](docs/RECORDING-PROXY.md) — прокси для записи.
- [.env.example](.env.example) — переменные окружения с комментариями.

Контакт: alt@in2sys.fr
