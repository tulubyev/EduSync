# Прокси для записи вебинаров

Воркер записи (`myepa-worker`) открывает страницу трансляции в Chromium. Если источник недоступен с IP
сервера (YouTube и другие заблокированные из РФ ресурсы), браузеру можно задать прокси.

- Прокси применяется **только к Chromium**. База данных и S3 (код на Node) ходят напрямую.
- По умолчанию напрямую идут российские зоны (`.ru`, `.su`, `.рф`) и localhost, всё остальное — через прокси.
  Российские сервисы иногда блокируют иностранные IP, поэтому их через прокси лучше не пускать.
- Предварительная проверка адреса при создании записи идёт напрямую; для доменов, которые пойдут через прокси,
  её неудача не срывает задачу (реальная проверка — при открытии страницы).

## Настройка

В `/var/www/myepa/.env`:

```
RECORDING_PROXY_URL=http://user:password@proxy.example.com:3128
# необязательно: что идёт напрямую (по умолчанию .ru,.su,.xn--p1ai,localhost,127.0.0.1)
# RECORDING_PROXY_BYPASS=.ru,.su,.xn--p1ai,localhost,127.0.0.1
```

Поддерживаются `http://`, `https://` и `socks5://`. Chromium не умеет SOCKS5 с логином и паролем: для прокси
с аутентификацией берите HTTP(S)-прокси, а SOCKS5 используйте только без пароля (например, внутри docker-сети).
Спецсимволы в логине и пароле кодируйте (`@` → `%40`, `:` → `%3A`, `/` → `%2F`).

Применить: `cd /var/www/myepa && WITH_WORKER=1 bash deploy.sh`. В логах воркера при старте записи будет строка
`[BROWSER] Proxy: http://proxy.example.com:3128 (напрямую: ...)`.

Проверка самого прокси с сервера до запуска записи:

```bash
curl -sI -x "http://user:password@proxy.example.com:3128" https://www.youtube.com | head -3   # ожидается HTTP/2 200
```

## Где взять прокси

1. **Платный HTTP(S)-прокси или VPN-сервис с HTTP-прокси** (самый простой путь). Выбирайте IP не из РФ и с
   поддержкой потокового видео; нужен адрес, порт, логин и пароль.
2. **Свой сервер за рубежом** с прокси (tinyproxy, Squid, 3proxy). Обязательно: аутентификация и/или разрешение
   подключений только с IP вашего VPS (`90.156.168.149`), иначе это открытый прокси для всего интернета.
3. **VPN-туннель только для воркера** (WireGuard/OpenVPN через контейнер-«шлюз», например gluetun, с
   включённым HTTP-прокси; воркер указывает его адрес в `RECORDING_PROXY_URL`). VPN на весь сервер **не включайте**:
   он перенаправит трафик всех остальных проектов, Traefik и PostgreSQL.

Пример для варианта 3 как отправная точка (не проверялся на этом сервере; имена переменных сверяйте с документацией
gluetun, ключи WireGuard берутся у вашего VPN-сервера/провайдера и хранятся только в `.env`):

```yaml
  # в docker-compose.prod.yml, рядом с worker
  vpn:
    image: qmcgaw/gluetun
    container_name: myepa-vpn
    profiles: ["worker"]
    restart: always
    cap_add: [NET_ADMIN]
    devices: ["/dev/net/tun:/dev/net/tun"]
    environment:
      VPN_SERVICE_PROVIDER: custom
      VPN_TYPE: wireguard
      VPN_ENDPOINT_IP: ${VPN_ENDPOINT_IP}
      VPN_ENDPOINT_PORT: ${VPN_ENDPOINT_PORT:-51820}
      WIREGUARD_PUBLIC_KEY: ${WIREGUARD_PUBLIC_KEY}
      WIREGUARD_PRIVATE_KEY: ${WIREGUARD_PRIVATE_KEY}
      WIREGUARD_ADDRESSES: ${WIREGUARD_ADDRESSES}
      HTTPPROXY: "on"
      FIREWALL_INPUT_PORTS: "8888"
    networks: [traefik-public]
```
и в `.env`: `RECORDING_PROXY_URL=http://myepa-vpn:8888`.

## Если прокси не нужен
Оставьте `RECORDING_PROXY_URL` пустым или закомментированным: поведение воркера не меняется.
