# Overview
This project is a web application providing user profile management capabilities. It allows users to view and edit their personal information, including name, email, phone number, and profile picture. The application also displays subscription status and basic account information. The core purpose is to offer a user-friendly interface for managing personal account details within a larger system.

# User Preferences
I want to develop this project iteratively. Please provide clear and detailed explanations for any proposed changes or new features. When suggesting code, aim for modern React practices and ensure type safety with TypeScript. I prefer that you ask for my confirmation before making any significant architectural changes or adding new external dependencies.

# System Architecture
The application is built using React and TypeScript, leveraging Shadcn UI components for a modern and responsive user interface. State management is handled with React's `useState` and `useEffect` hooks. Form validation is implemented client-side. User authentication is managed via an `accessToken` stored in `localStorage`, which is sent with API requests.

Key features include:
- **User Profile Display and Editing**: Users can update their first name, last name, email, and phone number.
- **Profile Picture Management**: Supports uploading, previewing, and updating profile images with drag-and-drop functionality and client-side validation for file size and type.
- **Subscription Status Display**: Shows the user's current plan type (e.g., Free, Premium, Pro) with corresponding visual badges.
- **Account Information**: Displays user ID and account creation date.
- **Form Validation**: Client-side validation for email, phone number, and required fields.
- **Error and Success Handling**: Provides visual feedback for form submissions and errors.

The UI/UX adheres to a clean, modern aesthetic provided by Shadcn UI, utilizing `Card`, `Button`, and `Badge` components. The design incorporates clear typography, accessible form elements, and intuitive feedback mechanisms.

# External Dependencies
- **Shadcn UI**: Utilized for various UI components (`Card`, `Button`, `Badge`).
- **Lucide React**: Used for iconography (`User`, `Upload`, `Mail`, `Phone`).
- **Internal REST API Endpoints**:
    - `/api/users/profile`: For fetching and updating user profile data.
    - `/api/users/profile/photo`: For uploading and updating the user's profile picture.
## Implemented UI Components (Dec 1, 2025)
- **SettingsPage**: Two-column photo layout (current photo left 1/3, upload zone right 2/3)
- **Sidebar Avatar**: Profile photo display (or initials fallback) with user info
- **Analytics Responsive Grid**: Mobile-first (1 col) → Tablet (2-3 cols) → Desktop (5 cols)
- **Platform Authorization Modal**: Username/password + API key support with encryption

## Data Storage Strategy (Dec 1, 2025 - Final)
- **Profile Photos**: Saved as base64 WebP in DB (`profileImage` column), 400x400px, 80% quality
- **Photo Display**: Two sizes generated dynamically:
  - `profileImageUrl`: 400x400 for Settings page display
  - `profileImageAvatar`: 48x48 optimized for sidebar avatar
- **Format**: data:image/webp;base64,... sent directly from API
- **User Credentials**: AES-256-GCM encrypted, stored in platformConnections table
- **localStorage**: Only stores compact data (URLs, text), not large binary data
- **Database**: PostgreSQL with Drizzle ORM, migrations via `npm run db:push`
- **DB Migration**: `npm run db:push` successfully added `profileImage` text column to users table
- **Avatar Generation**: Sharp library generates optimized 48x48 avatar on-the-fly from 400x400 stored image

## API Endpoints Summary
- `POST /api/users/profile` - Update profile (email, phone, name)
- `POST /api/users/profile/photo` - Upload and process photo
- `GET /api/users/profile` - Get user profile
- `POST /api/platforms/authorize` - Save encrypted platform credentials
- `GET /api/platforms/:platformId/credentials` - Retrieve decrypted credentials
- `GET /api/admin/users/detailed/all` - Get users list with courses/platforms/subscription data

## Admin Panel (Dec 1, 2025 - My EPA Edition)
**Адаптирована с FinTrack на My EPA** - полностью переработана для платформы

**Разделы для Super Admin & Analytics Admin:**
- 👥 **Пользователи** - просмотр всех пользователей с данными о курсах, платформах и подписке
- 📖 **Курсы** - управление 111 курсами в 9 категориях
- 🌐 **Платформы** - управление 8+ интегрированными платформами
- 📊 **Аналитика** - статистика использования и отчеты
- 🔧 **Системный мониторинг** - для DevOps
- 🔗 **Управление API** - для API администраторов

**Test Admin Accounts:**
- **Super Admin**: `admin@myepa.ru` / `admin123` → Full access to all admin sections
- **Analytics Admin**: `analytics@myepa.ru` / `admin123` → Users, Courses, Platforms, Analytics
- Both accounts pre-verified with full profile completion

**Компоненты (Dec 1, 2025):**
- `UsersSection.tsx` - таблица пользователей с фильтрами и статистикой
- `CoursesManagement.tsx` - управление курсами (исправлены React hooks violations)
- `PlatformsManagement.tsx` - управление платформами с регион-фильтрами и модальным окном добавления
- `AnalyticsSection.tsx` - аналитика и статистика (заглушка)

## Последние обновления (Dec 1, 2025 - Final Session)

### ✅ Исправления React Hooks
- **CoursesManagement & PlatformsManagement**: Перемещены `if (!isVisible) return null;` ПОСЛЕ `useEffect` для соблюдения правила hooks (нельзя вызывать hooks после условного return)
- Это исправило ошибку "Rendered more hooks than during the previous render"

### ✅ Полная переработка секции Платформы в админ-панели (Dec 1, 2025)
**PlatformsManagement.tsx** теперь включает:

1. **Загрузка всех платформ** (не ограничено)
   - Используется API endpoint `/api/platforms/by-region`
   - Платформы автоматически разбиваются по регионам на backend
   - Исправлена проблема "20 платформ"

2. **Динамические фильтры по регионам**
   - Регионы загружаются из структуры API (ключи объекта)
   - Отображаются все найденные регионы (Глобальные, Российские, СНГ, Азиатские)
   - Счётчик платформ для каждого региона
   - Визуальные индикаторы активного фильтра (цвет)

3. **Переиспользование AddPlatformModal** (для super_admin)
   - Кнопка "➕ Добавить" в заголовке использует компонент со страницы `/platforms`
   - Те же поля: Название, Код, Веб-сайт, Категория, Тип авторизации
   - Callback обновляет список после добавления
   - Модальное окно автоматически закрывается после успешного добавления

4. **API интеграция**
   - `/api/platforms/by-region` - загрузка всех платформ с разноской по регионам
   - POST `/api/platforms` - добавление новой платформы
   - Автоматический refresh после добавления

5. **UX улучшения**:
   - Счётчик общего количества платформ
   - Счётчик региональных групп
   - Сообщение при отсутствии данных
   - Синхронизация платформ через перезагрузку страницы

### ✅ Добавлены фильтры в админ-панель PlatformsManagement (Dec 1, 2025 - Latest)
**Новые фильтры:**
1. **"Все регионы" кнопка** - показывает все 37 платформ из всех регионов сразу
   - Регионы: Северная Америка, Европа, Россия и СНГ, Азия
   - Каждый регион показывает количество платформ
   
2. **Фильтры по категориям**
   - Загружаются динамически с API `/api/platforms/categories`
   - 9 категорий: IT General, IT Programming, IT Data Science, QA Testing, Art & Design, Music, Kids Education, Language Learning, Professional
   - Каждая категория отображается с собственным цветом

3. **Статистика в картах**
   - Всего платформ: 37 (не 111)
   - Количество региональных групп
   - Количество категорий

**Важно: Проблема с 111 платформами:**
- На странице PlatformsPage.tsx это **mock-данные** (111 платформ жестко закодированы в коде)
- В API/БД всего **37 платформ** (GLOBAL_PLATFORMS в server/routes/platforms.ts)
- Для добавления остальных 74 платформ нужно расширить GLOBAL_PLATFORMS в backend
- Mock-данные используются только для демонстрации UI, реальные платформы загружаются из API

## Architecture Notes
- Desktop-first with responsive mobile design
- API-first architecture for web + mobile compatibility
- No direct database access from frontend (all via REST API)
- Security: AES-256-GCM encryption, Scrypt key derivation, rate limiting, Helmet middleware
- React Hooks compliance: All hooks called unconditionally before any early returns
- Component structure: Stateful components with proper hook ordering
