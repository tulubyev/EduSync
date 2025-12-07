# Overview
My EPA (Агрегатор Онлайн Обучения) is an educational platform aggregator for the Russian market. It consolidates online courses from various global and regional platforms into specialized categories. The platform offers user profile management, course aggregation, deadline tracking, progress analytics, and an extensive admin panel. It features a desktop-first design with mobile portability and uses a PostgreSQL database to integrate over 89 educational platforms. The project aims to provide a comprehensive learning hub and has integrated payment solutions for subscription management.

# Recent Changes (December 07, 2025)
- **Stream/Lecture Recording Feature**:
  - New UI component `RecordingModal.tsx` for scheduling broadcast recordings with parameters (URL, password, time, duration)
  - Backend API endpoints:
    - `/api/library/recording/schedule` - Schedule recording to Library or Yandex.Disk
    - `/api/library/recording/yandex-disk/status` - Check Yandex.Disk connection and quota
    - `/api/library/recording/yandex-disk/files` - List files on Yandex.Disk
  - Yandex.Disk integration with `YandexDiskService`:
    - OAuth token authentication
    - Automatic folder creation for recordings
    - File upload with mime type support
    - Public link generation
    - File deletion and listing
  - Recordings saved to Library (as materials with 📹 emoji) or Yandex.Disk
  - Integration with existing Library system - recordings appear as tagged materials
  - New button "+ Записать трансляцию" in Library page next to "+ Новый материал"
  - Full form validation for stream URLs, scheduled times, and duration (1-1440 minutes)
  - Environment variables: `YANDEX_DISK_TOKEN`, `YANDEX_DISK_FOLDER_ID`
  - Ready for user-provided TypeScript implementation files for actual broadcast recording capture

- **Admin Panel Expansion with Real Data**:
  - **Payment Systems Management**: New dashboard for YooKassa/Alfabank monitoring with real connection status from environment variables, transaction history, revenue statistics from actual payment records
  - **Server-side RBAC**: Payment endpoints (/payment-systems, /payment-transactions, /payment-stats) restricted to super_admin and finance_admin roles
  - **Analytics with Real Data**: Removed all mock data - fetches real metrics from database (user growth by month, course counts by category, platform statistics)
  - **New API endpoints**: `/api/admin/stats` for analytics data, enhanced payment endpoints with real database queries
  - **New storage methods**: `getUserGrowthByMonth`, `getSuccessfulPaymentCount` for real database aggregations
  - **PlatformsManagement**: API connections now reflect actual `apiEnabled` status instead of random values
  
- **Course Discovery System Complete**: Fully automated course population from all 111 educational platforms
  - Built API endpoint `/api/admin/course-discovery` for manual triggering (requires admin role)
  - Automatic scheduler runs every Sunday at 02:00 (processes 5 platforms per run)
  - Service-based architecture: `courseDiscoveryService.ts` handles course discovery logic
  - Flexible course data structure with support for title, description, URL, language, cost, difficulty, duration
  - CLI script available: `tsx server/scripts/fetchCourses.ts [limit]` for one-time discovery runs
  - Extensible design: easy to add course data for new platforms in `PLATFORM_COURSE_DATA` object
  - **Database fully populated**: 302+ courses across 90+ platforms covering major global and regional platforms
  - **Comprehensive platform coverage**:
    - International: Coursera, edX, Udemy, Khan Academy, MIT OCW, FutureLearn, Brilliant, Pluralsight, Harvard Online, Stanford Online
    - Russian: Яндекс.Практикум, GeekBrains, Skillbox, Нетология, Stepik, Hexlet, Фоксфорд, ВШЭ Online, OpenCourses
    - Languages: Duolingo, Babbel, Busuu, Memrise, Rosetta Stone, Lingoda, Preply, Mondly, Rosetta Stone
    - Creative: Skillshare, MasterClass, Domestika, CreativeLive, Noiselab, Splice Learn, Lavush
    - Tech: freeCodeCamp, Codecademy, DataCamp, SoloLearn, Treehouse, AWS Skill Builder, Microsoft Learn, Google Career Certs, Pluralsight, Treehouse
    - Testing: LambdaTest, BrowserStack, TestPro.io
    - Music: Berklee Online, Noiselab, Splice Learn
    - Children: Khan Academy Kids, JetLearn
    - Regional: Udemy JP (日本), Udemy IN (हिन्दी), Thai MOOC (ไทย), Kickstart.id (Indonesia), Edukasyon.ph (Philippines), Zhihu (中文), Netease (中文), Tencent (中文)
    - European: Coursera EU/FR/SG, Open Education EU, Learning Hub Netherlands, Lecturio DE, Akademy.net, Poland Moodle
    - Professional: LinkedIn Learning, LinkedIn Ads Academy, MasterClass, Duolingo Plus
  - **Robust duplicate prevention**: 
    - Primary check: platformId + externalCourseId combination
    - Fallback check: platformId + case-insensitive normalized title (trim + lowercase)
    - Ensures idempotent reruns with "⏭️ Skipped (exists)" logging
  - **Architect-approved implementation**: Verified safety for concurrent execution and data integrity

# User Preferences
I want to develop this project iteratively. Please provide clear and detailed explanations for any proposed changes or new features. When suggesting code, aim for modern React practices and ensure type safety with TypeScript. I prefer that you ask for my confirmation before making any significant architectural changes or adding new external dependencies.

# System Architecture
The application is built with React and TypeScript, leveraging Shadcn UI for a modern and responsive interface. State management is handled with React hooks. User authentication uses an `accessToken` stored in `localStorage`.

**UI/UX Decisions:**
The design emphasizes a clean, modern aesthetic with Shadcn UI components, clear typography, accessible forms, and intuitive feedback. It follows a desktop-first approach with responsive mobile design.

**Technical Implementations & Features:**
- **User Management**: Includes profile editing, secure profile picture management, and subscription status display.
- **Admin Panel**: Provides role-based access for managing users, courses, platforms, and analytics.
- **Platform Integration**: Manages over 89 educational platforms, categorized by region and subject, with detailed platform data. Platform selector includes category and region filtering for structured search.
- **Library (Materials Management)**: Supports web resource URLs and local file uploads (images, videos, audio, PDF, documents) with base64 encoding and optimized image compression. Features platform/course linking, category tags, material pinning, and hierarchical tree-based navigation with simple alphabetical sorting.
- **Security**: Implements AES-256-GCM encryption for sensitive data, Scrypt key derivation, rate limiting, and Helmet middleware.
- **API-first Architecture**: All communication between frontend and backend is via REST API.
- **Subscription Management**: Integrated YooKassa and Alfabank for payment processing, supporting Free, Standard, and Premium plans with monthly/yearly billing. Includes plan comparison, payment history, and admin tools for plan management. Supports recurring payments with daily auto-renewal processing and saved payment methods via a Payment Gateway Pattern. Features aggressive polling (2-second intervals for 60 seconds) after payment creation to ensure subscription status updates immediately.
- **External Platform Sync**: Implements OAuth 2.0 (e.g., for Stepik) to sync external courses and deadlines, using encrypted tokens and refresh mechanisms.

**System Design Choices:**
- **Database**: PostgreSQL with Drizzle ORM.
- **Data Storage**: Profile images and uploaded files are stored as base64 strings. User credentials for external platforms are AES-256-GCM encrypted. `localStorage` is used for compact data like access tokens.
- **React Hooks Compliance**: Adherence to React Hooks rules.
- **Library Component**: Utilizes hierarchical tree navigation for material organization with resizable columns and comprehensive file upload capabilities.
- **Platform Selection**: Dynamic platform loading from database (89+ platforms) with category and region filtering in selector modal.

# External Dependencies
- **Shadcn UI**: UI component library.
- **Lucide React**: Icon library.
- **Internal REST API Endpoints**: A comprehensive set of endpoints for user, platform, library, subscription, and external platform (e.g., Stepik) management.
- **YooKassa**: Payment gateway for subscriptions.
- **Stepik API**: External learning platform API for course and deadline synchronization.
- **Alfabank API**: Payment gateway for subscriptions, integrated using a Payment Gateway Pattern.
