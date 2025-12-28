# Recording Worker - Инструкция по деплою

## 1. Подготовка
Скопируйте содержимое этой папки на ваш VPS в директорию `/opt/recording-worker`.

## 2. Настройка сети Docker (для n8n)
Если n8n и воркер находятся на одном сервере, лучше всего использовать общую внутреннюю сеть Docker.
```bash
# Создайте сеть, если она еще не создана
docker network create epa-net
```

## 3. Настройка окружения
Создайте файл `.env` в директории с воркером:
```env
DATABASE_URL=ваш_url_бд_из_replit
BEGET_S3_ENDPOINT=https://s3.beget.com
BEGET_S3_ACCESS_KEY=ваш_ключ
BEGET_S3_SECRET_KEY=ваш_секрет
BEGET_S3_BUCKET=recordings
MAIN_APP_URL=https://ваш-проект.replit.app
WORKER_ID=vps-01
API_SECRET=ваш_сложный_пароль_для_n8n
PORT=3001
```

## 4. Запуск
```bash
docker-compose up -d --build
```

## 5. Использование в n8n
Если n8n подключен к сети `epa-net`, вы можете обращаться к воркеру по имени контейнера:
**URL**: `http://epa-recording-worker:3001/task/start`
**Headers**: `Authorization: Bearer ваш_API_SECRET`
**Body**: `{"taskId": "id_задачи_из_бд"}`

Воркер также продолжает автоматически опрашивать базу данных (polling) каждые 30 секунд.
