-- #17: курсы ученика — ручные и с площадок — в одной таблице courses («программы»).
-- Выполнить ДО выкладки версии с этим изменением (новый код читает courses.source):
--   вставить текст файла в sudo -u postgres psql -d myepa_db
-- Совместимо с текущей версией: колонки добавляются, external_courses не меняется и не удаляется.
-- Повторный запуск безопасен.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS source varchar(50) NOT NULL DEFAULT 'manual';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS last_synced_at timestamp;

-- id курса у площадки задаёт только синхронизация; у ручных курсов он не нужен
UPDATE courses SET external_course_id = NULL WHERE source = 'manual' AND external_course_id IS NOT NULL;

-- один курс площадки — одна строка у ученика (у ручных external_course_id пустой, NULL не конфликтует)
CREATE UNIQUE INDEX IF NOT EXISTS courses_user_source_external_uniq ON courses (user_id, source, external_course_id);

-- Курсы, уже синхронизированные с площадок, переносятся в courses
INSERT INTO courses (user_id, platform_id, external_course_id, title, description, image_url, course_url,
                     progress, status, started_at, completed_at, metadata, source, last_synced_at, created_at, updated_at)
SELECT e.user_id, e.platform_id, e.external_course_id, e.title, e.description, e.image_url, e.course_url,
       COALESCE(e.progress, 0),
       CASE WHEN e.is_completed THEN 'completed' WHEN COALESCE(e.progress, 0) > 0 THEN 'in_progress' ELSE 'not_started' END,
       e.start_date, CASE WHEN e.is_completed THEN e.last_synced_at END,
       e.metadata, p.code, e.last_synced_at, e.created_at, e.updated_at
FROM external_courses e
JOIN platforms p ON p.id = e.platform_id
ON CONFLICT (user_id, source, external_course_id) DO NOTHING;
