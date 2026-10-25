-- #17: региональные контуры хранения персональных данных (docs/DATA-REGIONS.md).
-- Выполнить ДО выкладки версии с этим изменением (новый код пишет users.home_region и users.data_region).
-- Совместимо с текущей версией: колонки добавляются, существующие ученики остаются в контуре РФ.
-- Повторный запуск безопасен.

ALTER TABLE users ADD COLUMN IF NOT EXISTS home_region varchar(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS data_region varchar(10) NOT NULL DEFAULT 'ru';

-- Регион по закону страны для уже зарегистрированных (тот же список, что в shared/dataRegions.ts)
UPDATE users SET home_region = CASE
    WHEN country IS NULL OR country = 'RU' THEN 'ru'
    WHEN country IN ('AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU',
                     'MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH') THEN 'eu'
    ELSE 'world'
  END
WHERE home_region IS NULL;
