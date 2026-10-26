-- #18: секретная ссылка на ленту .ics для подписки в Google, Яндекс, Apple и Outlook (docs/CALENDAR-FEED.md).
-- Выполнить ДО выкладки версии с этим изменением (новый код читает и пишет users.calendar_token).
-- Совместимо с текущей версией: колонка добавляется пустой — ссылки нет, пока ученик её не создаст.
-- Повторный запуск безопасен.

ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_token varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS users_calendar_token_uniq ON users (calendar_token);
