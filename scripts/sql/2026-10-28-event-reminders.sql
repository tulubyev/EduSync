-- #18: напоминания о занятиях и сроках по почте (docs/REMINDERS.md).
-- Выполнить ДО выкладки версии с этим изменением. Повторный запуск безопасен.

CREATE TABLE IF NOT EXISTS event_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES learning_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind varchar(20) NOT NULL,
  starts_at timestamp NOT NULL,
  channel varchar(20) NOT NULL DEFAULT 'email',
  sent_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS event_reminders_uniq ON event_reminders (event_id, kind, starts_at, channel);

-- настройки напоминаний были в схеме с самого начала; IF NOT EXISTS — на случай старой базы
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS deadline_reminders boolean DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS reminder_advance integer DEFAULT 24;

-- таблицу создаёт postgres — отдаём её владельцу остальных таблиц приложения, иначе приложение получит «permission denied»
DO $$
DECLARE app_owner text;
BEGIN
  SELECT tableowner INTO app_owner FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users';
  EXECUTE format('ALTER TABLE public.event_reminders OWNER TO %I', app_owner);
END $$;
