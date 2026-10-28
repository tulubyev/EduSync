-- #20: план недели — минут на учёбу в день, дни учёбы и любимое время суток (docs/WEEK-PLAN.md).
-- Выполнить ДО выкладки версии с этим изменением (новый код читает и пишет эти колонки user_settings).
-- Совместимо с текущей версией: колонки добавляются со значениями по умолчанию. Повторный запуск безопасен.
-- study_goal_minutes и preferred_study_time были в схеме с самого начала; IF NOT EXISTS — на случай старой базы.

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS study_goal_minutes integer DEFAULT 60;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferred_study_time varchar(20);
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS study_days integer[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}';
