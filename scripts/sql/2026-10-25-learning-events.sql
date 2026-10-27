-- #17: одна таблица событий обучения — уроки, вебинары, задания, экзамены, дедлайны.
-- Выполнить ДО выкладки версии с этим изменением (новый код читает и пишет learning_events):
--   sudo -u postgres psql -d myepa_db -f scripts/sql/2026-10-25-learning-events.sql
-- Совместимо с текущей версией: старые таблицы не меняются и не удаляются, дедлайны копируются.
-- Повторный запуск безопасен.

CREATE TABLE IF NOT EXISTS learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL CONSTRAINT learning_events_user_id_users_id_fk REFERENCES users(id) ON DELETE CASCADE,
  type varchar(20) NOT NULL DEFAULT 'deadline',          -- lesson, webinar, assignment, exam, deadline
  title varchar(500) NOT NULL,
  description text,
  starts_at timestamp NOT NULL,                          -- UTC; у дедлайна — срок сдачи
  duration_minutes integer,
  time_zone varchar(50),                                 -- пояс, в котором событие задано площадкой или учеником
  program_title varchar(500),                            -- программа или курс
  module_title varchar(500),                             -- модуль или раздел
  course_id uuid CONSTRAINT learning_events_course_id_courses_id_fk REFERENCES courses(id) ON DELETE SET NULL,
  platform_id uuid CONSTRAINT learning_events_platform_id_platforms_id_fk REFERENCES platforms(id) ON DELETE SET NULL,
  lesson_url varchar(1000),
  materials_url varchar(1000),
  join_url varchar(1000),                                -- вход на вебинар
  source varchar(50) NOT NULL DEFAULT 'manual',          -- manual или код площадки (stepik, …), ical
  external_id varchar(255),                              -- id события у источника
  status varchar(20) NOT NULL DEFAULT 'pending',         -- pending, completed, cancelled
  priority varchar(20) NOT NULL DEFAULT 'medium',        -- low, medium, high, urgent
  completed_at timestamp,
  reminder_at timestamp,
  recording_task_id uuid CONSTRAINT learning_events_recording_task_id_recording_tasks_id_fk REFERENCES recording_tasks(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_events_user_starts_idx ON learning_events (user_id, starts_at);
CREATE INDEX IF NOT EXISTS learning_events_course_idx ON learning_events (course_id);
-- одно событие источника — одна строка (у ручных external_id пустой, NULL не конфликтует)
CREATE UNIQUE INDEX IF NOT EXISTS learning_events_source_uniq ON learning_events (user_id, source, external_id);

-- Курсы площадок: синхронизация делает upsert по (external_course_id, user_id), без уникального индекса он падал
CREATE UNIQUE INDEX IF NOT EXISTS external_courses_user_external_uniq ON external_courses (external_course_id, user_id);

-- Ручные дедлайны переносятся с теми же id
INSERT INTO learning_events (id, user_id, type, title, description, starts_at, course_id, source, status, priority,
                             completed_at, reminder_at, metadata, created_at, updated_at)
SELECT d.id, d.user_id, 'deadline', d.title, d.description, d.due_date, d.course_id, 'manual',
       CASE WHEN d.status IN ('completed', 'cancelled') THEN d.status ELSE 'pending' END,
       COALESCE(d.priority, 'medium'), d.completed_at, d.reminder_date,
       CASE WHEN d.is_recurring THEN jsonb_build_object('recurringPattern', d.recurring_pattern) END,
       d.created_at, d.updated_at
FROM deadlines d
ON CONFLICT (id) DO NOTHING;

-- Таблицу создаёт тот, кто запускает этот файл (часто postgres). Приложению она должна принадлежать так же,
-- как остальные таблицы, иначе «permission denied for table learning_events». Владелец — как у users.
DO $$
DECLARE app_owner text;
BEGIN
  SELECT tableowner INTO app_owner FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users';
  IF app_owner IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.learning_events OWNER TO %I', app_owner);
  END IF;
END $$;
