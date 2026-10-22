# Запись через Help Recorder

My EPA ставит записи в [Help Recorder](https://recorder.help) — отдельный сервис записи вебинаров (репозиторий `tulubyev/help-recorder`).
Help Recorder записывает, хранит файлы, склеивает части и сообщает итог. My EPA — интерфейс: форма, список записей, плеер, письмо.
Код — `server/services/helpRecorder/`, вебхук — `server/routes/helpRecorderWebhook.ts`.

## Как устроено

- My EPA ходит в партнёрский API Help Recorder (`/partner/v1`) **со своего сервера** с ключом `HR_PARTNER_KEY`.
  У каждого пользователя My EPA в Help Recorder своя учётная запись (заголовок `X-HR-User` = id пользователя My EPA):
  лимиты тарифа `myepa`, «только свои записи», удаление — по отдельности. Пароля и входа там у неё нет.
- В `recording_tasks` остаётся **зеркало** записи: `save_target = 'help_recorder'`, `metadata.hrTaskId` — номер в Help Recorder.
  Кабинет показывает зеркало, как раньше. Зеркало обновляют:
  - вебхук `task.finished` (`POST /api/hr/webhook`, подпись HMAC `HR_WEBHOOK_SECRET`) — сразу по окончании записи;
  - цикл веб-процесса раз в 30 с — идущие и скоро начинающиеся записи, склейки в очереди.
- Свой воркер, планировщик, сторож и очередь склейки My EPA записи Help Recorder **не трогают** (`NOT_HR_TASK`).
- **Пароль страницы события** хранится только в Help Recorder (зашифрованным), в зеркало и в браузер не попадает.
  При правке пустое поле пароля и данных входа — «не менять».
- **Файлы** не копируются: в зеркале метки `hr:<номер части>`, настоящая временная ссылка запрашивается при открытии плеера,
  скачивании и в письме. В библиотеку сохраняется ссылка на страницу записей (временная ссылка устареет).
- **Право на запись:** в форме — обязательная галочка «Я вправе записывать это событие»; без неё Help Recorder запись не примет.
- **Письмо** «Запись выполнена / прервана / не выполнена» отправляет My EPA, как раньше (Help Recorder пользователям My EPA
  писем не шлёт).
- **Удаление пользователя** My EPA (`deleteUserRecordings`, `server/services/helpRecorder/users.ts`) сначала удаляет его в Help Recorder
  (`DELETE /partner/v1/users/:id` — учётная запись, записи и файлы сразу), потом зеркала записей и журнал записи у себя.
  Если у него ещё идёт запись — удаление откладывается (ответ 409), Help Recorder сам закончит его в течение часа.

| В кабинете | В Help Recorder |
|---|---|
| Запланировать | `POST /partner/v1/tasks` (`Idempotency-Key` = id зеркала: повтор после сбоя сети не создаст вторую) |
| Изменить | `PATCH /tasks/:id` — только пока запись не началась |
| Перепроверить ссылку | `POST /tasks/:id/recheck` |
| Отменить | `POST /tasks/:id/cancel` — только пока не началась |
| Повторить | `POST /tasks/:id/retry`; у прерванной записи с частями — новая запись на оставшееся время (новое зеркало) |
| Смотреть / скачать | `GET /tasks/:id/files` |
| Склеить / отменить склейку | `GET …/merge-options`, `POST …/merge`, `POST …/merge/cancel` |
| Удалить, очистить очередь | `DELETE /tasks/:id` (файлы удаляются сразу) |

Что изменилось для пользователя:
- длительность — по тарифу `myepa` в Help Recorder (не больше 720 минут);
- запись, которая уже началась или закончилась, не редактируется — её можно повторить или создать новую;
- идущую запись нельзя отменить из кабинета (Help Recorder отменяет только не начавшиеся);
- «Где сохранить запись» не действует: файлы хранит Help Recorder.

Панель администратора My EPA показывает зеркала; менять их статус и поля нельзя (только удалить — вместе с файлами в Help Recorder).
Управление записью — в панели Help Recorder.

## Включение

1. В Help Recorder (на сервере): тариф `myepa` (**активный**: у неактивного тарифа лимиты и срок хранения не действуют)
   и партнёр — `docs/PARTNERS.md` в help-recorder:
   ```bash
   docker compose -f docker-compose.api.yml run --rm api node dist/api.js partner create myepa "My EPA" \
     --plan myepa --webhook https://myepa.ru/api/hr/webhook --max-day 2000 --max-active 300
   ```
2. В `.env` My EPA (права 600):
   ```
   HR_API_URL=https://api.recorder.help
   HR_PARTNER_KEY=hrp_…
   HR_WEBHOOK_SECRET=whsec_…
   ```
3. Обновить My EPA (`bash deploy.sh`). В журнале веб-контейнера: «Help Recorder: новые записи идут через партнёрский API».
4. Проверка: запланировать запись на 2 минуты по прямой ссылке на поток → «Запланирована» → «Идёт запись» → «Готово»,
   письмо, «Смотреть / скачать». В панели Help Recorder запись видна у пользователя `myepa.<хэш>@partner.invalid`.
5. Старый воркер My EPA дописывает записи, запланированные до включения. Когда их не осталось
   (`select count(*) from recording_tasks where status in ('scheduled','ready','in_progress','uploading') and coalesce(save_target,'') <> 'help_recorder'` — 0),
   его можно остановить: `docker compose -f docker-compose.prod.yml --profile worker stop worker`.

**Откат:** убрать `HR_API_URL` и `HR_PARTNER_KEY` и перезапустить — новые записи снова пишет свой воркер (его нужно запустить).
Записи, уже поставленные в Help Recorder, без ключа не обновляются и не открываются: откатывайтесь, когда идущих записей
Help Recorder нет, или верните ключ.

## Проверки

`npm test` — подпись вебхука, перевод карточки Help Recorder в зеркало, тела запросов, тексты ошибок
(`server/services/helpRecorder/helpRecorder.test.ts`).
