-- #48: удобные и рабочие часы ученика — для подсказки записать вебинар в неудобное время (docs/RECORDING-HINTS.md).
-- Выполнить ДО выкладки версии с этим изменением (новый код читает и пишет эти колонки user_settings).
-- Совместимо с текущей версией: колонки добавляются со значениями по умолчанию. Повторный запуск безопасен.

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS comfort_from integer NOT NULL DEFAULT 480;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS comfort_to integer NOT NULL DEFAULT 1320;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS work_from integer;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS work_to integer;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS work_days integer[] NOT NULL DEFAULT '{1,2,3,4,5}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS recording_hints boolean NOT NULL DEFAULT true;
