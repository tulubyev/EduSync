#!/usr/bin/env bash
# Деплой My EPA на VPS: pull образов + up -d + ожидание healthy.
# Запуск из /var/www/myepa:   bash deploy.sh
# Откат:                      IMAGE_TAG=<sha> bash deploy.sh
# Вместе с воркером:          WITH_WORKER=1 bash deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE=(docker compose -f docker-compose.prod.yml)
[ "${WITH_WORKER:-0}" = "1" ] && COMPOSE+=(--profile worker)

"${COMPOSE[@]}" pull
"${COMPOSE[@]}" up -d --remove-orphans

echo "Ожидание healthy для myepa-app..."
for _ in $(seq 1 30); do
  status=$(docker inspect -f '{{.State.Health.Status}}' myepa-app 2>/dev/null || echo starting)
  [ "$status" = "healthy" ] && { echo "OK: myepa-app healthy"; exit 0; }
  sleep 5
done
echo "ERROR: myepa-app не стал healthy за 150 с" >&2
docker logs --tail 50 myepa-app >&2
exit 1
