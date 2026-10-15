#!/bin/sh
# Поднимает PulseAudio (виртуальный sink для захвата звука вебинара) и запускает воркер.
# Если PulseAudio не стартует — воркер сам перейдёт в режим «только видео»
# (AudioSetup.initialize), поэтому ошибка здесь не фатальна.
set -u

mkdir -p "${XDG_RUNTIME_DIR:-/tmp/runtime}"
chmod 700 "${XDG_RUNTIME_DIR:-/tmp/runtime}" 2>/dev/null || true

if ! pactl info >/dev/null 2>&1; then
  pulseaudio --start --exit-idle-time=-1 --disallow-exit --log-target=stderr 2>&1 \
    || echo "[entrypoint] PulseAudio не запустился — запись пойдёт без звука" >&2
fi

exec "$@"
