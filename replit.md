# My EPA — Агрегатор Образовательных Программ

## Overview
**My EPA** is an educational program aggregator platform designed for the Russian market. It helps users manage online courses from various platforms (e.g., Coursera, edX, Udemy, Stepik) within a single, centralized interface. The project evolved from a financial application (FinTrack) and is currently being developed Desktop-first (web) with a full architectural design for mobile portability (Web + iOS/Android applications sharing a common backend and business logic). The business vision is to provide a secure and user-friendly experience for managing online education.

## User Preferences
- **Язык интерфейса**: Русский
- **Целевая аудитория**: Пользователи России
- **Фокус**: Безопасность и простота использования
- **Стратегия разработки**: Desktop-first с мобильной готовностью
- **Цель портативности**: React Native приложения (iOS/Android) используют общий бэкенд
- **⚠️ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО**: Менять DATABASE_URL без явного разрешения
- **⚠️ ВАЖНО**: Только пользователь управляет секретами и параметрами БД
- **💳 ПЛАТЕЖИ**: Stripe не работает в России — используются YuKassa, CloudPayments, Sberbank Acquiring
- **Communication**: Русский для интерфейса, English для комментариев в коде
- **Code style**: TypeScript + ESLint + Prettier
- **Git commits**: Descriptive messages in English
- **PR reviews**: Check mobile portability before merge

## System Architecture

### Core Principles for Mobile Portability
The system is built with mobile portability in mind, adhering to the following principles:
-   **Shared Backend**: All business logic resides in the `/server` (Express.js), serving both web and mobile clients via API.
-   **Shared Schema**: Unified data models are defined in `/shared/schema.ts`, used by web, mobile, and API.
-   **API-First**: Frontends communicate with the server exclusively via RESTful APIs; no direct database access from the frontend.
-   **Responsive Design**: The web UI is adaptive, ensuring functionality across all screen sizes, including mobile viewports.
-   **No Browser APIs**: Avoids browser-specific code; for example, `localStorage` is abstracted.

### Frontend Architecture
-   **Web (Desktop - React)**:
    -   **Framework**: React 18 + TypeScript
    -   **Build Tool**: Vite
    -   **Routing**: wouter
    -   **UI**: Radix UI + shadcn/ui design system
    -   **Styling**: TailwindCSS + custom theme
    -   **State Management**: React Context API + TanStack React Query
    -   **Forms**: React Hook Form + Zod validation
    -   **Key Components**: `LandingPage.tsx` (hero, features, footer), `FooterPages.tsx` (12 informational pages), `AuthForm.tsx` (responsive authentication), `App.tsx` (main application).
-   **Mobile (iOS/Android - React Native)**:
    -   **Framework**: React Native (cross-platform)
    -   **Navigation**: React Navigation
    -   **Configuration**: Platform-specific configurations (`/mobile/shared/config/`) and unified base config (`config.base.ts`).
    -   **Status**: Architecture is ready for implementation following web development.
    -   **Screens**: AuthScreen, DashboardScreen, CourseListScreen, DeadlinesScreen, NotesScreen, SettingsScreen.

### Backend (Express.js)
-   **Runtime**: Node.js + TypeScript
-   **Framework**: Express.js
-   **Database**: PostgreSQL
-   **ORM**: Drizzle ORM (type-safe)
-   **Authentication**: Session-based (Passport.js + local strategy) for web, JWT tokens for mobile, Scrypt hashing for passwords.
-   **Middleware**: CSRF protection, rate limiting, security headers (Helmet).
-   **File Upload**: Multer.
-   **API**: RESTful endpoints for both web and mobile clients.
-   **Services**: Modular architecture in `/server/services/`.

### Database (PostgreSQL)
-   **Host**: Beget.com (`quoquuquosijo.beget.app:5432/myepa_db`)
-   **Core Tables**: `users`, `courses`, `platforms`, `deadlines`, `notes`, `sessions`.

### UI/UX Decisions
-   **Branding**: EduSync-inspired design with a purple/blue gradient (`#667eea` → `#764ba2`) for the landing page.
-   **Information Architecture**: Landing page with hero section, feature cards, and a comprehensive footer linking to 12 informational pages (Features, Support, Legal).

### Feature Specifications
-   **Core Functionality (IMPLEMENTED)**:
    - Course Management: CoursesPage, CourseCard, AddCourseModal (create/edit with useEffect sync)
      - **NEW**: Platform selection when adding courses (first step in AddCourseModal)
      - **NEW**: Platform info displayed on course cards (platform name as badge)
      - **NEW**: Cost field for courses (free or specified price in ₽)
      - **NEW**: "Similar Courses" modal for comparing courses across platforms by category/difficulty
    - Analytics Dashboard: Full course and study metrics with charts
      - Total courses, completed, in-progress counters
      - Study time tracking (hours)
      - Cost analysis (total spent in ₽)
      - Daily/weekly/monthly progress visualization
      - Course status breakdown (pie/bar charts)
      - Time range filtering (week/month/all time)
    - Deadline Management: DeadlinesPage with calendar and list view, date-fns with Russian locale
    - Notes Management: NotesPage with pinning, search, course filtering
    - Platforms Catalog: PlatformsPage with 111 educational platforms (including TestPro.io, GeekBrains)
      - **NEW**: 9 categories with color coding (IT-General, IT-Programming, IT-Data Science, QA Testing, Art & Design, Music, Kids Education, Language Learning, Professional)
      - **NEW**: 3 regional groups (European, Asian, Russian-specific)
      - **NEW**: Database table `platform_categories` with 9 categories populated
      - Foreign key `categoryId` in platforms table for database-driven categorization
    - Navigation: Sidebar with wouter routing, Dashboard with stats and quick actions
-   **User Management**: Login/Registration, User settings, Profile page.
-   **Admin Panel**: Basic structure for administrative tasks.
-   **Planned Features**: Analytics dashboard, AI assistant (OpenAI), Notifications, Course recommendations.

### Navigation Structure
A unified navigation structure is planned for both web and mobile platforms, including routes for `/`, `/auth`, `/home`, `/courses`, `/deadlines`, `/notes`, `/analytics`, `/settings`, and `/admin-panel`.

## Platform Categories & Regions

### 9 Main Categories with Color Coding:
- 🔵 **IT - General** (Coursera, edX, Udemy, Pluralsight, Udacity)
- 🔵 **IT - Programming** (Codecademy, freeCodeCamp, SoloLearn, Treehouse, GeekBrains, Яндекс.Практикум, Lavush)
- 🔵 **IT - Data Science** (DataCamp)
- 🔴 **QA Testing** (LambdaTest, BrowserStack, Edureka, Test Automation University)
- 🩷 **Art & Design** (Skillshare, Domestika, MasterClass, LinkedIn Learning, CreativeLive)
- 🟣 **Music** (Berklee, Coursera Music, Noiselab, Splice Learning)
- 🟢 **Kids Education** (Khan Academy, SplashLearn, IXL, Code.org, Prodigy, JetLearn, CodaKid, Фоксфорд, Максимум)
- 🟡 **Language Learning** (Duolingo, Babbel, Busuu, italki, Preply, Memrise, Mondly, Lingoda, Rosetta Stone)
- 🟣 **Professional** (Stepik, Skillbox, Нетология, MIT OCW, FutureLearn, YouTube Learning, Brilliant, Alison, OpenUNED)

### 3 Regional Groups:
1. **European Platforms** (10 platforms)
   - Germany: Lecturio, iversity, Akademy.net
   - France: Coursera France, France Education Platform
   - Poland: Polska Moodle
   - Netherlands: Learning Hub Netherlands
   - UK: EdAssist
   - Multi-EU: Open Education EU

2. **Asian Platforms** (16 platforms)
   - India: BYJU'S, Upgrad, Vedantu
   - China: Zhihu Learning, Netease Cloud Classroom, Tencent Classroom
   - Japan: Udemy Japan, Schoo, CodeCamp
   - South Korea: Inflearn, FastCampus
   - Southeast Asia: Coursera Singapore, Kickstart.id, Edukasyon.ph, Thai MOOC

3. **Russian-Specific Platforms** (13 platforms)
   - Schools: Фоксфорд, Максимум, Tutor Online
   - Universities: ВШЭ Online, МФТИ Онлайн, LMS МГУ
   - Tech: Яндекс.Практикум, Lavush, SkillBranch
   - General: Skillbox, Нетология, Stepik, Лекториум, Универсариум, OpenCourses

### Total Platform Statistics:
- **Global Platforms**: 90+
- **Regional Platforms**: 20+
- **Russian-Specific Platforms**: 13
- **Total Platforms**: 110+
- **Supported Languages**: 50+ including English, Russian, Chinese, Japanese, Korean, German, French, Spanish, and more

## External Dependencies
-   **PostgreSQL (Beget)**: Primary database.
-   **Express.js**: Backend framework.
-   **React + Vite**: Web frontend development.
-   **React Native**: Mobile application development.
-   **YuKassa/CloudPayments**: Planned payment gateways for the Russian market.
-   **Sberbank Acquiring**: Planned payment gateway for the Russian market.
-   **OpenAI API**: Planned integration for an AI assistant.
-   **Firebase**: Planned for mobile analytics and crash reporting.
-   **Educational Platform APIs**: Planned integrations for Coursera (OAuth), Udemy (API Key), edX (OAuth), Khan Academy (OAuth), LinkedIn Learning (API Key + OAuth), Pluralsight (API Key), Codecademy (OAuth), Stepik (OAuth), YouTube Learning (OAuth).