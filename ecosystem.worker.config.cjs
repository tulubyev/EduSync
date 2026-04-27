/**
 * PM2 ecosystem config — EPA Recording Worker (VPS)
 *
 * Шаг 1 — Заполните секреты в env_production (DATABASE_URL, BEGET_S3_*).
 *          Либо не трогайте env_production и загружайте .env.worker сами:
 *            source /opt/epa/.env.worker && pm2 start ecosystem.worker.config.cjs --env production
 *
 * Шаг 2 — Запуск (флаг --env production обязателен, иначе env_production не применится):
 *            pm2 start ecosystem.worker.config.cjs --env production
 *            pm2 save
 *            pm2 startup   # <- следуйте инструкции из вывода
 *
 * Полезные команды:
 *   pm2 status
 *   pm2 logs epa-recording-worker
 *   pm2 restart epa-recording-worker
 */

module.exports = {
  apps: [
    {
      name: 'epa-recording-worker',
      script: 'dist/recording-worker.js',

      interpreter: 'node',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,
      max_restarts: 20,
      min_uptime: '10s',
      restart_delay: 5000,

      /**
       * env_production — применяется только при запуске с --env production.
       * Заполните DATABASE_URL и BEGET_S3_* перед первым стартом.
       * Не коммитьте файл с реальными секретами в git.
       */
      env_production: {
        NODE_ENV: 'production',

        DATABASE_URL: '',

        WORKER_ID: 'vps-worker-1',
        MAX_WORKERS: '1',
        POLL_INTERVAL_MS: '5000',
        HEARTBEAT_INTERVAL_MS: '30000',
        HEARTBEAT_TIMEOUT_MS: '600000',

        BEGET_S3_ENDPOINT: 'https://s3.ru1.storage.beget.cloud',
        BEGET_S3_ACCESS_KEY: '',
        BEGET_S3_SECRET_KEY: '',
        BEGET_S3_BUCKET: '',
        BEGET_S3_REGION: 'ru-1',

        PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: '/usr/bin/chromium-browser',

        RECORDINGS_DIR: '/tmp/recordings',
        CHROMIUM_HEADLESS: 'true',
        SCHEDULED_TIME_TZ_OFFSET_H: '3',
      },

      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/epa-worker/error.log',
      out_file:   '/var/log/epa-worker/out.log',
      merge_logs: true,
    },
  ],
};
