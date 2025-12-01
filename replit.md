# My EPA — Агрегатор Образовательных Программ

## Recent Changes (Dec 1, 2025) ✅
- **SettingsPage fully implemented**: User profile management with photo upload, email/phone editing, form validation
- **Users API endpoints**: GET/POST profile, photo upload with WebP optimization via sharp
- **localStorage quota fix**: Now stores only URL strings, not base64 images - prevents "quota exceeded" errors
- **Analytics responsive grid**: sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 - 5 metric cards on desktop without wraps
- **Encryption system**: AES-256-GCM for platform credentials with secure key derivation
- **Platform authorization API**: POST /api/platforms/authorize and GET /api/platforms/:platformId/credentials

## Overview
**My EPA** is an educational program aggregator platform for the Russian market. It centralizes online course management from various platforms (e.g., Coursera, edX, Udemy, Stepik). Evolving from a financial application, it's developed Desktop-first (web) with a full architectural design for mobile portability (Web + iOS/Android apps sharing backend and business logic). The vision is to provide a secure, user-friendly online education management experience.

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
The system is designed for mobile portability with:
-   **Shared Backend**: All business logic in `/server` (Express.js) serves both web and mobile clients via API.
-   **Shared Schema**: Unified data models in `/shared/schema.ts` for web, mobile, and API.
-   **API-First**: Frontends use RESTful APIs exclusively; no direct database access.
-   **Responsive Design**: Web UI adapts to all screen sizes.
-   **No Browser APIs**: Avoids browser-specific code.

### Frontend Architecture
-   **Web (Desktop - React)**:
    -   **Framework**: React 18 + TypeScript
    -   **Build Tool**: Vite
    -   **Routing**: wouter
    -   **UI**: Radix UI + shadcn/ui design system
    -   **Styling**: TailwindCSS + custom theme
    -   **State Management**: React Context API + TanStack React Query
    -   **Forms**: React Hook Form + Zod validation
-   **Mobile (iOS/Android - React Native)**:
    -   **Framework**: React Native
    -   **Navigation**: React Navigation
    -   **Configuration**: Platform-specific (`/mobile/shared/config/`) and unified base config.
    -   **Status**: Architecture ready for implementation following web development.

### Backend (Express.js)
-   **Runtime**: Node.js + TypeScript
-   **Framework**: Express.js
-   **Database**: PostgreSQL
-   **ORM**: Drizzle ORM
-   **Authentication**: Session-based (Passport.js) for web, JWT for mobile, Scrypt for passwords.
-   **Middleware**: CSRF protection, rate limiting, security headers (Helmet).
-   **File Upload**: Multer.
-   **API**: RESTful endpoints.

### Database (PostgreSQL)
-   **Host**: Beget.com
-   **Core Tables**: `users`, `courses`, `platforms`, `deadlines`, `notes`, `sessions`, `platform_categories`, `platform_regions`.
-   **Scalability Tables**: `platform_categories` (9 categories: IT-General, IT-Programming, IT-Data Science, QA-Testing, Art-Design, Music, Kids-Education, Language-Learning, Professional) and `platform_regions` (4 regions: Global, European, Asian, Russian).

### UI/UX Decisions
-   **Branding**: EduSync-inspired design with a purple/blue gradient.
-   **Information Architecture**: Landing page with hero, feature cards, and a comprehensive footer with 12 informational pages.

### Feature Specifications
-   **Core Functionality (IMPLEMENTED)**:
    -   Course Management: Create/edit courses, platform selection, cost tracking, "Similar Courses" modal.
    -   Analytics Dashboard: Metrics (total, completed, in-progress, hours, spent), charts, time range filtering.
    -   Deadline Management: Calendar and list view with Russian locale.
    -   Notes Management: Pinning, search, course filtering.
    -   Platforms Catalog: 111 educational platforms, 9 categories with color coding (database-driven), 4 regional groups.
    -   User Management: Login/Registration, settings, profile page (photo upload, profile updates).
    -   Navigation: Sidebar with routing.
-   **Planned Features**: AI assistant, Notifications, Course recommendations.

### Navigation Structure
Unified navigation for web and mobile: `/`, `/auth`, `/home`, `/courses`, `/deadlines`, `/notes`, `/analytics`, `/settings`, `/admin-panel`.

## External Dependencies
-   **PostgreSQL (Beget)**: Primary database.
-   **Express.js**: Backend framework.
-   **React + Vite**: Web frontend.
-   **React Native**: Mobile application development.
-   **YuKassa/CloudPayments**: Planned payment gateways for Russia.
-   **Sberbank Acquiring**: Planned payment gateway for Russia.
-   **OpenAI API**: Planned for AI assistant.
-   **Firebase**: Planned for mobile analytics and crash reporting.
-   **Educational Platform APIs**: Planned integrations for Coursera, Udemy, edX, Khan Academy, LinkedIn Learning, Pluralsight, Codecademy, Stepik, YouTube Learning.