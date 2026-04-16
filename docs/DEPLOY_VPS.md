# Деплой My EPA на VPS — Детальный план

**Сервер**: 62.217.178.173  
**ОС**: Debian/Ubuntu (рекомендуется Ubuntu 22.04 LTS)  
**Текущее состояние**: VPS используется только для PostgreSQL 16  
**Цель**: развернуть объединённое приложение EPA (Node.js + Playwright + FFmpeg) на том же VPS

---

## Архитектура после деплоя

```
Internet
    │
    ▼
[Nginx] :80 / :443 (Let's Encrypt SSL)
    │
    ├── / → EPA App (Node.js :5000)
    │         ├── Express API /api/*
    │         ├── Vite SPA (React)
    │         └── Recording Executor (TaskPoller внутри процесса)
    │
    └── Postgres :5432 (уже работает, без изменений)
```

---

## Шаг 0: Предварительные требования

### 0.1 Доступ к VPS
```bash
ssh tulubyev@62.217.178.173
```
Убедиться что есть sudo-права.

### 0.2 Проверить PostgreSQL
```bash
sudo systemctl status postgresql
psql -U tulubyev -d myepa_db -c "SELECT version();"
```
БД уже работает — не трогаем.

### 0.3 Открыть порты в файрволле
```bash
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw status
```
Порт 5000 оставить закрытым снаружи (Nginx будет проксировать).

---

## Шаг 1: Установка системных зависимостей

### 1.1 Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # должно быть v20.x
npm --version
```

### 1.2 Chromium для Playwright
```bash
sudo apt-get install -y chromium-browser
which chromium-browser   # → /usr/bin/chromium-browser
```

### 1.3 FFmpeg
```bash
sudo apt-get install -y ffmpeg
ffmpeg -version   # должно быть 4.x или 5.x
```

### 1.4 PulseAudio (виртуальный микшер для захвата аудио)
```bash
sudo apt-get install -y pulseaudio pulseaudio-utils
```

### 1.5 Nginx
```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
```

### 1.6 PM2 (менеджер процессов)
```bash
sudo npm install -g pm2
pm2 --version
```

### 1.7 Git
```bash
sudo apt-get install -y git
```

---

## Шаг 2: Получение кода

### 2.1 Создать пользователя для приложения (опционально, рекомендуется)
```bash
sudo useradd -m -s /bin/bash epa
sudo su - epa
```

### 2.2 Клонировать репозиторий
```bash
cd /home/epa   # или /var/www/epa
git clone <URL репозитория> myepa
cd myepa
```

> Если репозиторий приватный — настроить SSH-ключ или Personal Access Token.

### 2.3 Установить зависимости
```bash
npm install
```

---

## Шаг 3: Переменные окружения

### 3.1 Создать файл `.env`
```bash
nano /home/epa/myepa/.env
```

Содержимое `.env`:
```env
# Основное
NODE_ENV=production
PORT=5000

# База данных (уже на этом VPS)
DATABASE_URL=postgresql://tulubyev:<пароль>@localhost:5432/myepa_db
PGHOST=localhost
PGPORT=5432
PGUSER=tulubyev
PGPASSWORD=<пароль>
PGDATABASE=myepa_db

# Безопасность
JWT_SECRET=<сгенерировать: openssl rand -hex 64>
ENCRYPTION_KEY=<сгенерировать: openssl rand -hex 32>

# Email (Beget SMTP)
BEGET_SMTP_HOST=smtp.beget.com
BEGET_SMTP_USER=<email>
BEGET_SMTP_PASSWORD=<пароль>

# S3 хранилище (Beget)
BEGET_S3_ENDPOINT=https://s3.ru1.storage.beget.cloud
BEGET_S3_ACCESS_KEY=<ключ>
BEGET_S3_SECRET_KEY=<секрет>
BEGET_S3_BUCKET=<имя бакета>
BEGET_S3_REGION=ru-1
BEGET_S3_PUBLIC_URL=https://<бакет>.s3.ru1.storage.beget.cloud

# Recording Executor
WORKER_ID=epa-worker-vps-1
POLL_INTERVAL_MS=5000
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
RECORDINGS_DIR=/tmp/epa-recordings

# Оплата
YOOKASSA_SHOP_ID=<id>
YOOKASSA_SECRET_KEY=<ключ>
```

### 3.2 Защитить файл
```bash
chmod 600 /home/epa/myepa/.env
```

---

## Шаг 4: Сборка приложения

### 4.1 Сборка фронтенда и бэкенда
```bash
cd /home/epa/myepa
npm run build
```
Результат: `dist/public/` (React SPA) + `dist/index.js` (Express сервер).

### 4.2 Накатить миграции БД
```bash
npm run db:push
```
> ⚠️ Запускать только первый раз или при изменении схемы. Не трогает существующие данные.

### 4.3 Создать папку для временных записей
```bash
mkdir -p /tmp/epa-recordings
chmod 777 /tmp/epa-recordings
```

---

## Шаг 5: Playwright — установка браузерных зависимостей

### 5.1 Установить зависимости для Chromium
```bash
cd /home/epa/myepa
npx playwright install-deps chromium
```

### 5.2 Проверить запуск Chromium
```bash
/usr/bin/chromium-browser --headless --no-sandbox --dump-dom https://example.com | head -20
```
Должен вернуть HTML страницы.

---

## Шаг 6: Настройка PM2

### 6.1 Создать конфиг PM2
```bash
nano /home/epa/myepa/ecosystem.config.cjs
```

Содержимое:
```javascript
module.exports = {
  apps: [
    {
      name: 'myepa',
      script: './dist/index.js',
      instances: 1,          // 1 экземпляр — Recording Executor не поддерживает кластер
      exec_mode: 'fork',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      out_file: '/var/log/epa/out.log',
      error_file: '/var/log/epa/error.log',
      merge_logs: true,
    },
  ],
};
```

### 6.2 Создать папку для логов
```bash
sudo mkdir -p /var/log/epa
sudo chown epa:epa /var/log/epa
```

### 6.3 Запустить приложение через PM2
```bash
cd /home/epa/myepa
pm2 start ecosystem.config.cjs
pm2 save                       # сохранить список процессов
pm2 startup                    # автозапуск при ребуте (выполнить команду которую выдаст)
```

### 6.4 Проверить статус
```bash
pm2 list
pm2 logs myepa --lines 50
```

В логах должно быть:
```
Recording poller started (worker: epa-worker-vps-1, interval: 5000ms)
S3 connectivity: OK
serving on port 5000
```

---

## Шаг 7: Nginx — обратный прокси

### 7.1 Создать конфиг сайта
```bash
sudo nano /etc/nginx/sites-available/myepa
```

Содержимое (без SSL на первом этапе):
```nginx
server {
    listen 80;
    server_name myepa.ru www.myepa.ru;   # заменить на реальный домен

    # Размер тела запроса (для загрузки аватаров base64)
    client_max_body_size 25M;

    # Проксирование API и SSE
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;    # для длинных SSE/polling запросов
        proxy_send_timeout 300s;
    }

    # React SPA — всё остальное
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.2 Включить сайт
```bash
sudo ln -s /etc/nginx/sites-available/myepa /etc/nginx/sites-enabled/
sudo nginx -t          # проверить конфиг
sudo systemctl reload nginx
```

### 7.3 Проверить доступность
```bash
curl http://62.217.178.173/api/recording/admin/health
```
Должен вернуть JSON со статусом.

---

## Шаг 8: HTTPS через Let's Encrypt (если есть домен)

### 8.1 Установить Certbot
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### 8.2 Получить сертификат
```bash
sudo certbot --nginx -d myepa.ru -d www.myepa.ru
```
Certbot автоматически обновит конфиг Nginx для HTTPS.

### 8.3 Проверить автообновление
```bash
sudo certbot renew --dry-run
```

---

## Шаг 9: PulseAudio для записи звука

Recording Executor использует PulseAudio виртуальный sink для захвата аудио браузера.

### 9.1 Создать systemd-сервис для PulseAudio (daemon mode)
```bash
sudo nano /etc/systemd/system/pulseaudio-epa.service
```

Содержимое:
```ini
[Unit]
Description=PulseAudio virtual sink for EPA Recording
After=network.target

[Service]
Type=simple
User=epa
ExecStart=/usr/bin/pulseaudio --daemonize=no --system=no --realtime=no
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable pulseaudio-epa
sudo systemctl start pulseaudio-epa
```

### 9.2 Проверить
```bash
sudo -u epa pactl info
sudo -u epa pactl list sinks short
```

---

## Шаг 10: Скрипт обновления (деплой новой версии)

Создать скрипт `/home/epa/deploy.sh`:
```bash
#!/bin/bash
set -e

APP_DIR="/home/epa/myepa"
echo "=== EPA Deploy $(date) ==="

cd $APP_DIR
git pull origin main
npm install
npm run build
npm run db:push
pm2 reload myepa --update-env
pm2 logs myepa --lines 20 --nostream

echo "=== Deploy complete ==="
```

```bash
chmod +x /home/epa/deploy.sh
```

Для обновления достаточно:
```bash
/home/epa/deploy.sh
```

---

## Шаг 11: Мониторинг

### 11.1 Полезные команды PM2
```bash
pm2 list                      # список процессов
pm2 logs myepa                # логи в реальном времени
pm2 monit                     # CPU/RAM dashboard
pm2 reload myepa              # zero-downtime reload
pm2 restart myepa             # полный перезапуск
```

### 11.2 Проверка базы данных
```bash
psql -U tulubyev -d myepa_db -c "
  SELECT status, count(*) 
  FROM recording_tasks 
  GROUP BY status;"
```

### 11.3 Проверка воркера в БД
```bash
psql -U tulubyev -d myepa_db -c "
  SELECT worker_id, is_active, tasks_processed, last_seen_at 
  FROM recording_worker_status;"
```

---

## Чеклист перед запуском

- [ ] PostgreSQL доступен на localhost:5432
- [ ] `.env` файл заполнен и защищён (chmod 600)
- [ ] `npm run build` выполнен без ошибок
- [ ] `npm run db:push` прошёл без ошибок
- [ ] `pm2 start` — приложение запустилось
- [ ] В логах PM2: `serving on port 5000`
- [ ] В логах PM2: `Recording poller started`
- [ ] В логах PM2: `S3 connectivity: OK`
- [ ] Nginx запущен: `curl http://localhost/api/recording/admin/health` → 200
- [ ] (Опционально) HTTPS работает: `curl https://myepa.ru/api/recording/admin/health` → 200
- [ ] Тестовая задача записи создана и подхвачена воркером `epa-worker-vps-1`

---

## Известные особенности

| Особенность | Описание |
|---|---|
| Recording Executor | Встроен в основной процесс. `instances: 1` в PM2 обязателен — нельзя cluster mode. |
| YouTube/Twitch | Браузер открывает страницу, но VPN на VPS может понадобиться для российских блокировок. |
| PulseAudio | Если не запущен — запись будет без звука (graceful fallback). |
| `/tmp/epa-recordings` | Временные файлы. После загрузки в S3 удаляются автоматически. |
| S3 путь | Все записи идут в `myepa/recordings/YYYY/MM/` внутри бакета. |

---

*Документ создан: 16 апреля 2026*  
*Версия EPA: 2.0.0 (merged recording executor)*
