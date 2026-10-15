# syntax=docker/dockerfile:1
#
# EduSync (My EPA). Два образа из одного Dockerfile:
#   --target web     — веб-приложение (Express + собранный React), порт 5000
#   --target worker  — воркер записи вебинаров (Chromium + ffmpeg + PulseAudio)
#
# Сборка тяжёлая — на VPS не собираем, образы делает GitHub Actions
# (.github/workflows/docker.yml) и публикует в GHCR; на сервере только pull.

ARG NODE_IMAGE=node:20-bookworm-slim

# ── Сборка: клиент (vite) + серверные бандлы (esbuild) ───────────────────────
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm run build:worker

# ── Только production-зависимости (esbuild собирает с --packages=external) ───
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# ── web ──────────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS web
ENV NODE_ENV=production PORT=5000
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Документы пользователей лежат в ./saveddata (DocumentStorageService) — монтировать том.
RUN mkdir -p /app/saveddata && chown node:node /app/saveddata
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/').then(r=>process.exit(r.status<500?0:1),()=>process.exit(1))"
CMD ["node", "dist/index.js"]

# ── worker ───────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS worker
ENV NODE_ENV=production \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
    RECORDINGS_DIR=/data/recordings \
    HOME=/home/node \
    XDG_RUNTIME_DIR=/tmp/runtime
# PulseAudio не стартует от root, поэтому работаем под пользователем node.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      chromium ffmpeg pulseaudio pulseaudio-utils \
      fonts-liberation fonts-noto-color-emoji ca-certificates dumb-init \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /data/recordings /tmp/runtime \
 && chown -R node:node /data /tmp/runtime \
 && chmod 700 /tmp/runtime
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY docker/worker-entrypoint.sh /usr/local/bin/worker-entrypoint.sh
RUN chmod +x /usr/local/bin/worker-entrypoint.sh
USER node
ENTRYPOINT ["dumb-init", "--", "worker-entrypoint.sh"]
CMD ["node", "dist/recording-worker.js"]
