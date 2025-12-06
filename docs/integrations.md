# Стратегия интеграции образовательных платформ

## Обзор

Данный документ описывает подходы к интеграции внешних образовательных платформ с EPA для получения:
- Списка курсов пользователя
- Прогресса прохождения
- Дедлайнов и расписания занятий
- Оценок и сертификатов

---

## Часть 1: Общие стратегии интеграции

### 1.1 Типы API платформ

| Тип API | Описание | Примеры платформ |
|---------|----------|------------------|
| **REST API + OAuth 2.0** | Полнофункциональный API с авторизацией | Stepik, Coursera, edX |
| **GraphQL API** | Гибкие запросы данных | Некоторые современные LMS |
| **LTI 1.3 Protocol** | Стандарт для интеграции обучающих инструментов | Canvas, Moodle, Blackboard |
| **Закрытый API** | Только партнёрский доступ | Udemy (Affiliate API) |
| **Web Scraping** | Парсинг (не рекомендуется) | Платформы без API |

### 1.2 Протоколы авторизации

#### OAuth 2.0 (Рекомендуемый)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Клиент    │────>│     EPA     │────>│  Платформа  │
│  (Браузер)  │     │   (Сервер)  │     │   (API)     │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                   │
      │ 1. Клик "Подключить"                   │
      │────────────────────>                   │
      │                    │ 2. Redirect к OAuth│
      │                    │──────────────────>│
      │                    │                   │
      │ 3. Пользователь авторизуется           │
      │<───────────────────────────────────────│
      │                    │                   │
      │ 4. Callback с authorization_code       │
      │────────────────────>                   │
      │                    │ 5. Обмен на tokens│
      │                    │──────────────────>│
      │                    │ 6. access_token   │
      │                    │<──────────────────│
      │                    │                   │
      │ 7. Сохранение токенов (зашифровано)    │
      │                    │                   │
```

#### Хранение учётных данных
- **Access Token**: Краткосрочный (1-24 часа)
- **Refresh Token**: Долгосрочный (30-90 дней)
- **Шифрование**: AES-256-GCM с Scrypt key derivation
- **Ротация**: Автоматическое обновление при истечении

### 1.3 Какие данные можно получить

| Категория | Данные | Использование |
|-----------|--------|---------------|
| **Курсы** | ID, название, описание, изображение | Каталог курсов |
| **Прогресс** | % завершения, пройденные уроки | Аналитика |
| **Дедлайны** | Сроки заданий, экзаменов | Календарь |
| **Оценки** | Баллы за задания, итоговые оценки | Статистика |
| **Сертификаты** | Статус, URL сертификата | Портфолио |

---

## Часть 2: Детальный план интеграции Stepik

### 2.1 Обзор Stepik API

Stepik предоставляет открытый REST API с полной документацией:
- **Документация**: https://stepik.org/api/docs
- **Авторизация**: OAuth 2.0
- **Формат данных**: JSON
- **Rate Limits**: ~100 запросов/минута

### 2.2 Регистрация OAuth приложения

1. Перейти на https://stepik.org/oauth2/applications/
2. Создать новое приложение:
   - **Name**: EPA Educational Aggregator
   - **Client type**: Confidential
   - **Authorization grant type**: Authorization code
   - **Redirect URI**: `https://{domain}/api/platforms/stepik/callback`

3. Сохранить:
   - `STEPIK_CLIENT_ID`
   - `STEPIK_CLIENT_SECRET`

### 2.3 Endpoints Stepik API

#### Авторизация (Authorization Code Flow)
```
# Шаг 1: Перенаправление пользователя на Stepik
GET https://stepik.org/oauth2/authorize/
    ?client_id={client_id}
    &response_type=code
    &redirect_uri={redirect_uri}
    &scope=read write
    &state={random_state}             # CSRF protection

# Шаг 2: Обмен authorization_code на токены
POST https://stepik.org/oauth2/token/
Content-Type: application/x-www-form-urlencoded

    client_id={client_id}
    client_secret={client_secret}
    code={authorization_code}
    grant_type=authorization_code
    redirect_uri={redirect_uri}

# Ответ:
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,                 # 1 час
  "refresh_token": "...",
  "scope": "read write"
}
```

#### Обновление токена (Refresh Token Flow)
```
# Когда access_token истёк (expires_in секунд)
POST https://stepik.org/oauth2/token/
Content-Type: application/x-www-form-urlencoded

    client_id={client_id}
    client_secret={client_secret}
    refresh_token={refresh_token}
    grant_type=refresh_token

# Ответ:
{
  "access_token": "new_access_token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "new_refresh_token",   # Может быть новый!
  "scope": "read write"
}

# Важно: Всегда сохраняйте новый refresh_token, если он возвращён
```

#### Получение данных текущего пользователя
```
# Сначала получаем user_id из /api/stepics (с токеном)
# Метод 1: Декодировать JWT access_token для получения user_id
# Метод 2: Использовать /api/stepics с фильтром

GET /api/stepics/1                    # ⚠️ НЕ ИСПОЛЬЗОВАТЬ - это ID=1, не текущий user!

# Правильный способ:
GET /api/stepics?user=current         # Получить данные текущего пользователя
Authorization: Bearer {access_token}

# Или получить user_id из enrollments и использовать:
GET /api/users/{user_id}              # Профиль пользователя
GET /api/user-courses?user={user_id}  # Курсы пользователя
```

#### Курсы и прогресс пользователя
```
GET /api/enrollments?user={user_id}   # Записи на курсы
GET /api/progresses?ids={prog1,prog2} # Прогресс по UUID из enrollment
GET /api/course-grades?user={user_id} # Оценки
GET /api/certificates?user={user_id}  # Сертификаты
```

#### Структура курса
```
GET /api/courses/{id}                 # Информация о курсе
GET /api/sections?course={id}         # Секции курса
GET /api/units?section={id}           # Уроки секции
GET /api/lessons/{id}                 # Урок
GET /api/steps?lesson={id}            # Шаги урока
GET /api/assignments?step={id}        # Задания
```

### 2.4 Структуры данных Stepik

#### Курс (Course)
```typescript
interface StepikCourse {
  id: number;
  title: string;
  slug: string;
  summary: string;
  description: string;
  cover: string;                      // URL изображения
  workload: string;                   // "2-3 часа в неделю"
  intro_video: string | null;
  language: string;                   // "ru", "en"
  is_paid: boolean;
  price: number | null;
  
  // Прогресс (если есть enrollment)
  progress: string | null;            // UUID прогресса
  
  // Расписание
  begin_date: string | null;          // ISO дата начала
  end_date: string | null;            // ISO дата окончания
  soft_deadline: string | null;       // Мягкий дедлайн
  hard_deadline: string | null;       // Жёсткий дедлайн
  
  // Структура
  sections: number[];                 // ID секций
  total_units: number;
  
  // Статистика
  learners_count: number;
  certificate_regular_threshold: number;
  certificate_distinction_threshold: number;
}
```

#### Прогресс (Progress)
```typescript
interface StepikProgress {
  id: string;                         // UUID
  is_passed: boolean;
  score: number;                      // Набранные баллы
  cost: number;                       // Максимальные баллы
  n_steps: number;                    // Всего шагов
  n_steps_passed: number;             // Пройдено шагов
  last_viewed: string;                // ISO дата
}
```

#### Enrollment (Запись на курс)
```typescript
interface StepikEnrollment {
  id: number;
  course: number;                     // ID курса
  user: number;                       // ID пользователя
  is_active: boolean;
  create_date: string;                // Дата записи
}
```

#### Дедлайны и расписание
```typescript
interface StepikDeadline {
  course_id: number;
  section_id: number;
  
  // Типы дедлайнов
  begin_date: string | null;          // Когда открывается
  soft_deadline: string | null;       // Рекомендуемый срок
  hard_deadline: string | null;       // Жёсткий срок (после - 0 баллов)
  
  // Для assignments
  deadline: string | null;            
}
```

### 2.5 Маппинг данных Stepik → EPA

```typescript
// shared/types/platform-data.ts

interface EPACourse {
  id: string;
  platformId: string;                 // "stepik"
  externalId: string;                 // Stepik course ID
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  
  // Прогресс
  progress: number;                   // 0-100%
  isCompleted: boolean;
  
  // Расписание
  startDate: Date | null;
  endDate: Date | null;
  
  // Дедлайны
  deadlines: EPADeadline[];
  
  // Метаданные
  language: string;
  workload: string;
  certificateAvailable: boolean;
}

interface EPADeadline {
  id: string;
  courseId: string;
  title: string;
  type: 'soft' | 'hard' | 'assignment';
  dueDate: Date;
  sectionName: string | null;
  isCompleted: boolean;
}

// Функция маппинга
function mapStepikCourse(
  course: StepikCourse, 
  enrollment: StepikEnrollment,
  progress: StepikProgress | null
): EPACourse {
  return {
    id: `stepik_${course.id}`,
    platformId: 'stepik',
    externalId: String(course.id),
    title: course.title,
    description: course.summary || course.description,
    imageUrl: course.cover || '/images/default-course.png',
    url: `https://stepik.org/course/${course.id}`,
    
    progress: progress 
      ? Math.round((progress.n_steps_passed / progress.n_steps) * 100)
      : 0,
    isCompleted: progress?.is_passed ?? false,
    
    startDate: course.begin_date ? new Date(course.begin_date) : null,
    endDate: course.end_date ? new Date(course.end_date) : null,
    
    deadlines: [],  // Заполняется отдельно
    
    language: course.language,
    workload: course.workload,
    certificateAvailable: course.certificate_regular_threshold > 0,
  };
}
```

### 2.6 Алгоритм синхронизации данных

```
┌────────────────────────────────────────────────────────────────┐
│                    СИНХРОНИЗАЦИЯ КУРСОВ                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Проверка и обновление токена                               │
│     ├─ Загрузить токены из БД (зашифрованные)                  │
│     ├─ Расшифровать access_token, refresh_token                │
│     ├─ Проверить token_expires_at < now()                      │
│     │                                                          │
│     │  Если access_token истёк:                                │
│     │    POST /oauth2/token/                                   │
│     │      grant_type=refresh_token                            │
│     │      refresh_token={refresh_token}                       │
│     │      client_id, client_secret                            │
│     │                                                          │
│     │    ├─ Успех: сохранить новые токены (зашифрованно)       │
│     │    │         ВАЖНО: обновить refresh_token если вернулся │
│     │    └─ Ошибка 401: refresh истёк → статус "требует        │
│     │                    повторной авторизации"                │
│     │                                                          │
│     └─ Продолжить с валидным access_token                      │
│                                                                │
│  2. Получение user_id текущего пользователя                    │
│     GET /api/stepics?user=current                              │
│     Authorization: Bearer {access_token}                       │
│     └─ Извлечь stepiks[0].id как stepikUserId                  │
│        (Сохранить в platform_connections.external_user_id)     │
│                                                                │
│  3. Получение enrollments                                      │
│     GET /api/enrollments?user={stepikUserId}                   │
│     └─ Список course_id, на которые записан пользователь       │
│                                                                │
│  4. Получение курсов (batch запрос)                            │
│     GET /api/courses?ids={id1,id2,id3...}                      │
│     └─ Детали всех курсов одним запросом (до 100)              │
│                                                                │
│  5. Получение прогресса                                        │
│     GET /api/progresses?ids={progress_id1,progress_id2...}     │
│     └─ Прогресс по каждому курсу (UUID из course.progress)     │
│                                                                │
│  6. Получение дедлайнов                                        │
│     Для каждого курса:                                         │
│       GET /api/sections?course={courseId}                      │
│       └─ Извлечь soft_deadline, hard_deadline из секций        │
│                                                                │
│  7. Маппинг и сохранение в БД                                  │
│     ├─ Трансформировать Stepik → EPA формат                    │
│     ├─ Upsert external_courses                                 │
│     ├─ Upsert course_deadlines                                 │
│     └─ Обновить platform_connections.last_sync_at              │
│                                                                │
│  8. Возврат результата                                         │
│     { courses: 12, deadlines: 34, lastSyncAt: "2025-12-06" }   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Обработка ошибок Refresh Token
```typescript
async function refreshAccessTokenSafe(
  connection: PlatformConnection
): Promise<TokenPair | 'reauth_required'> {
  try {
    const newTokens = await adapter.refreshAccessToken(
      decrypt(connection.refreshTokenEncrypted)
    );
    
    // Сохранить новые токены
    await db.update(platformConnections)
      .set({
        accessTokenEncrypted: encrypt(newTokens.accessToken),
        refreshTokenEncrypted: encrypt(newTokens.refreshToken),
        tokenExpiresAt: newTokens.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(platformConnections.id, connection.id));
    
    return newTokens;
  } catch (error) {
    if (error.status === 401 || error.code === 'invalid_grant') {
      // Refresh token истёк или отозван
      await db.update(platformConnections)
        .set({ syncStatus: 'reauth_required' })
        .where(eq(platformConnections.id, connection.id));
      return 'reauth_required';
    }
    throw error;
  }
}
```

### 2.7 Расписание синхронизации

| Событие | Триггер | Действие |
|---------|---------|----------|
| Первое подключение | OAuth callback | Полная синхронизация |
| Открытие дашборда | Visibility change | Инкрементальная синхронизация |
| Фоновая синхронизация | Каждые 6 часов | Полная синхронизация |
| Ручная синхронизация | Кнопка "Обновить" | Полная синхронизация |

---

## Часть 3: Архитектура адаптера платформ

### 3.1 Интерфейс адаптера

```typescript
// server/services/platform-adapters/types.ts

interface PlatformAdapter {
  // Метаданные
  platformId: string;
  platformName: string;
  
  // OAuth
  getAuthorizationUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<TokenPair>;
  refreshAccessToken(refreshToken: string): Promise<TokenPair>;
  
  // Данные пользователя
  getUserInfo(accessToken: string): Promise<PlatformUser>;
  getUserCourses(accessToken: string): Promise<EPACourse[]>;
  getCourseProgress(accessToken: string, courseId: string): Promise<number>;
  getDeadlines(accessToken: string): Promise<EPADeadline[]>;
  getCertificates(accessToken: string): Promise<EPACertificate[]>;
  
  // Синхронизация
  syncAll(accessToken: string): Promise<SyncResult>;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface SyncResult {
  courses: number;
  deadlines: number;
  certificates: number;
  lastSyncAt: Date;
  errors: string[];
}
```

### 3.2 Реализация Stepik адаптера

```typescript
// server/services/platform-adapters/stepik-adapter.ts

export class StepikAdapter implements PlatformAdapter {
  platformId = 'stepik';
  platformName = 'Stepik';
  
  private baseUrl = 'https://stepik.org';
  private apiUrl = 'https://stepik.org/api';
  
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}
  
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'read',
      state: state,
    });
    return `${this.baseUrl}/oauth2/authorize/?${params}`;
  }
  
  async exchangeCodeForTokens(code: string): Promise<TokenPair> {
    const response = await fetch(`${this.baseUrl}/oauth2/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }
  
  async getUserCourses(accessToken: string): Promise<EPACourse[]> {
    // 1. Получить enrollments
    const enrollments = await this.fetchEnrollments(accessToken);
    
    // 2. Получить детали курсов (batch)
    const courseIds = enrollments.map(e => e.course);
    const courses = await this.fetchCourses(accessToken, courseIds);
    
    // 3. Получить прогресс
    const progressIds = courses
      .map(c => c.progress)
      .filter(Boolean);
    const progresses = await this.fetchProgresses(accessToken, progressIds);
    
    // 4. Маппинг
    return courses.map(course => {
      const enrollment = enrollments.find(e => e.course === course.id)!;
      const progress = progresses.find(p => p.id === course.progress);
      return mapStepikCourse(course, enrollment, progress);
    });
  }
  
  // ... остальные методы
}
```

### 3.3 Фабрика адаптеров

```typescript
// server/services/platform-adapters/factory.ts

const adapters: Map<string, PlatformAdapter> = new Map();

export function getAdapter(platformId: string): PlatformAdapter {
  if (!adapters.has(platformId)) {
    switch (platformId) {
      case 'stepik':
        adapters.set(platformId, new StepikAdapter(
          process.env.STEPIK_CLIENT_ID!,
          process.env.STEPIK_CLIENT_SECRET!,
          `${process.env.APP_URL}/api/platforms/stepik/callback`
        ));
        break;
      case 'coursera':
        adapters.set(platformId, new CourseraAdapter(/* ... */));
        break;
      // Другие платформы...
      default:
        throw new Error(`Unknown platform: ${platformId}`);
    }
  }
  return adapters.get(platformId)!;
}
```

---

## Часть 4: База данных для интеграций

### 4.1 Схема таблиц

```typescript
// shared/schema.ts (дополнение)

export const platformConnections = pgTable('platform_connections', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  platformId: varchar('platform_id', { length: 50 }).notNull(),
  
  // Токены (зашифрованы)
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  tokenExpiresAt: timestamp('token_expires_at'),
  
  // Метаданные
  externalUserId: varchar('external_user_id', { length: 100 }),
  externalUsername: varchar('external_username', { length: 255 }),
  
  // Синхронизация
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: varchar('sync_status', { length: 20 }).default('pending'),
  syncError: text('sync_error'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const externalCourses = pgTable('external_courses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  platformId: varchar('platform_id', { length: 50 }).notNull(),
  externalId: varchar('external_id', { length: 100 }).notNull(),
  
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  courseUrl: text('course_url').notNull(),
  
  // Прогресс
  progressPercent: integer('progress_percent').default(0),
  isCompleted: boolean('is_completed').default(false),
  lastAccessedAt: timestamp('last_accessed_at'),
  
  // Расписание
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  
  // Метаданные
  language: varchar('language', { length: 10 }),
  workload: varchar('workload', { length: 100 }),
  certificateUrl: text('certificate_url'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const courseDeadlines = pgTable('course_deadlines', {
  id: varchar('id', { length: 36 }).primaryKey(),
  externalCourseId: varchar('external_course_id', { length: 36 })
    .notNull()
    .references(() => externalCourses.id),
  
  title: varchar('title', { length: 500 }).notNull(),
  deadlineType: varchar('deadline_type', { length: 20 }).notNull(), // soft, hard, assignment
  dueDate: timestamp('due_date').notNull(),
  
  sectionName: varchar('section_name', { length: 255 }),
  isCompleted: boolean('is_completed').default(false),
  
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## Часть 5: API Endpoints

### 5.1 Маршруты подключения платформ

```typescript
// server/routes/platform-connections.ts

// Инициировать OAuth подключение
GET /api/platforms/:platformId/connect
→ Redirect на OAuth провайдер

// OAuth callback
GET /api/platforms/:platformId/callback
→ Обмен code на токены, сохранение, редирект в приложение

// Список подключений пользователя
GET /api/platforms/connections
→ [{ platformId, externalUsername, lastSyncAt, syncStatus }]

// Отключить платформу
DELETE /api/platforms/:platformId/disconnect
→ Удаление токенов и данных

// Синхронизировать данные
POST /api/platforms/:platformId/sync
→ { courses: 12, deadlines: 34, lastSyncAt: "..." }
```

### 5.2 Маршруты данных курсов

```typescript
// Все курсы пользователя (со всех платформ)
GET /api/courses/external
→ [{ id, platformId, title, progress, deadlines }]

// Курсы конкретной платформы
GET /api/courses/external?platform=stepik
→ Фильтрация по платформе

// Дедлайны пользователя
GET /api/deadlines
→ [{ courseTitle, deadlineTitle, dueDate, type }]

// Дедлайны на неделю
GET /api/deadlines?range=week
→ Фильтрация по дате

// Прогресс по всем курсам
GET /api/analytics/progress
→ { totalCourses, completed, inProgress, avgProgress }
```

---

## Часть 6: Реализация (пошаговый план)

### Этап 1: Подготовка инфраструктуры
1. [ ] Создать таблицы в БД (platform_connections, external_courses, course_deadlines)
2. [ ] Добавить переменные окружения для Stepik OAuth
3. [ ] Создать сервис шифрования токенов

### Этап 2: OAuth интеграция
4. [ ] Реализовать StepikAdapter.getAuthorizationUrl()
5. [ ] Создать endpoint GET /api/platforms/stepik/connect
6. [ ] Создать endpoint GET /api/platforms/stepik/callback
7. [ ] Реализовать StepikAdapter.exchangeCodeForTokens()
8. [ ] Сохранение токенов в БД (зашифрованные)

### Этап 3: Синхронизация данных
9. [ ] Реализовать StepikAdapter.getUserCourses()
10. [ ] Реализовать StepikAdapter.getDeadlines()
11. [ ] Создать endpoint POST /api/platforms/stepik/sync
12. [ ] Сохранение курсов и дедлайнов в БД

### Этап 4: API для фронтенда
13. [ ] Создать endpoint GET /api/courses/external
14. [ ] Создать endpoint GET /api/deadlines
15. [ ] Реализовать фильтрацию и пагинацию

### Этап 5: Фоновая синхронизация
16. [ ] Создать cron job для периодической синхронизации
17. [ ] Реализовать автообновление токенов
18. [ ] Логирование и обработка ошибок

### Этап 6: UI компоненты
19. [ ] Страница "Подключённые платформы"
20. [ ] Кнопки подключения/отключения
21. [ ] Индикатор статуса синхронизации
22. [ ] Виджет дедлайнов на дашборде

---

## Приложение A: Другие платформы

### Coursera
- API: Partner API (ограниченный доступ)
- OAuth: Да
- Альтернатива: LTI интеграция

### edX
- API: Open edX REST API
- OAuth: Да
- Документация: https://docs.openedx.org/

### Udemy
- API: Affiliate API (только каталог курсов)
- Прогресс пользователя: Недоступен
- Альтернатива: Ручной ввод

### Открытое образование
- API: Ограниченный
- Альтернатива: LTI

---

## Приложение B: Требуемые секреты

```env
# Stepik OAuth
STEPIK_CLIENT_ID=your_client_id
STEPIK_CLIENT_SECRET=your_client_secret

# Coursera (если будет партнёрский доступ)
COURSERA_CLIENT_ID=
COURSERA_CLIENT_SECRET=

# Encryption key для токенов
PLATFORM_TOKENS_ENCRYPTION_KEY=random_32_byte_key
```

---

*Документ создан: 6 декабря 2025*
*Версия: 1.0*
