-- #29: регистрация без российского телефона.
-- Выполнить ДО выкладки версии с этим изменением (новый код читает колонку country):
--   psql "$DATABASE_URL" -f scripts/sql/2026-10-24-users-country-optional-phone.sql
-- Совместимо с текущей версией: колонка добавляется пустой, телефон перестаёт быть обязательным.
-- Повторный запуск безопасен.

ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country varchar(2);
