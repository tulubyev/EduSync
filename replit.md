# Overview
My EPA (Агрегатор Онлайн Обучения) is an educational platform aggregator for the Russian market. It consolidates online courses from various global and regional platforms into specialized categories. The platform offers user profile management, course aggregation, deadline tracking, progress analytics, and an extensive admin panel. It features a desktop-first design with mobile portability and uses a PostgreSQL database to integrate over 89 educational platforms. The project aims to provide a comprehensive learning hub and has integrated payment solutions for subscription management.

# Recent Changes (December 12, 2025)
- **Recording Event Logging System** (COMPLETED):
  - New database table `recording_logs` tracks every recording event with timestamps
  - Event types: task_started, recording_started, recording_completed, upload_started, upload_completed, upload_failed, navigation_error, browser_error, task_failed, browser_cleanup
  - Service: `RecordingLogger` in `server/services/recording/logger.ts`
  - API Endpoints:
    - `GET /api/library/recording/tasks/:taskId/logs` - View all events for a recording
    - `GET /api/library/recording/logs/timeline/:taskId` - Chronological event timeline
  - Each log entry includes: event type, part number, file size, duration, error details, metadata
  - Fully integrated with recording task manager - logs all stages of recording pipeline

- **Deployment Configuration Fixed** (COMPLETED):
  - **Build Dependencies Issue**: vite, esbuild, tailwindcss, postcss, @vitejs/plugin-react, @tailwindcss/vite, drizzle-kit, typescript moved from devDependencies to dependencies
  - **Why**: Cloud Run (Autoscale) doesn't install devDependencies during build, causing build failures
  - **Solution**: npm install --save for all build-time packages
  - **Build Process**: `npm run build` creates dist/index.js (676.9kb) - verified working
  - **Deployment Command**: `npm run build` -> `npm start` (NODE_ENV=production)
  - Application fully ready for publishing on Replit

# Recent Changes (December 10, 2025)
- **Autonomous Stream/Lecture Recording System** (FULL IMPLEMENTATION):
  - **Recording Architecture**:
    - `RecorderService`: Headless Playwright + CDP screencast for video capture
    - `TaskManager`: Queue management with 20-minute chunking (avoids Replit 30-min timeout)
    - `RecordingScheduler`: Checks for scheduled tasks every minute
    - `PlaylistGenerator`: Creates HLS .m3u8 playlists for multi-chunk recordings
    - Database table `recording_tasks` for task persistence and status tracking
  - **Workflow**:
    1. User schedules recording via RecordingModal (URL, password, time, duration)
    2. Task saved to database with status "scheduled"
    3. Scheduler picks up task at scheduled time, changes status to "recording"
    4. Playwright opens page, CDP screencast captures frames
    5. FFmpeg encodes frames to webm chunks (20-min each)
    6. Chunks auto-upload to Yandex.Disk immediately after capture
    7. HLS playlist generated for seamless playback
    8. Status updated to "completed" with public URLs
  - **API Endpoints**:
    - `POST /api/recordings/schedule` - Schedule new recording task
    - `GET /api/recordings/tasks` - List user's recording tasks with status
    - `GET /api/recordings/tasks/:id` - Get specific task details
    - `DELETE /api/recordings/tasks/:id` - Cancel scheduled task
    - `POST /api/recordings/trigger` - External trigger endpoint for cron-job.org
    - `GET /api/library/recording/yandex-disk/status` - Check Yandex.Disk quota
  - **System Dependencies**: ffmpeg, chromium, playwright, mesa, nss, libgbm, libxshmfence
  - **Environment Variables**: `YANDEX_DISK_TOKEN`, `YANDEX_DISK_FOLDER_ID`
  - **v2.0 Streaming Implementation** (CURRENT):
    - Real-time streaming: CDP frames piped directly to FFmpeg stdin (no memory buffering)
    - Audio capture via PulseAudio virtual sink (recording_sink.monitor)
    - Supports recordings of any duration with automatic 20-min chunk rotation
    - Audio + Video muxing with libvpx-vp9 + libopus codecs
  - **Technical Details**:
    - `audioSetup.ts`: PulseAudio daemon bootstrap + virtual sink creation
    - `streamingRecorder.ts`: Real-time frame streaming with backpressure handling
    - Chromium flags for audio routing: --alsa-output-device=pulse, --autoplay-policy=no-user-gesture-required
    - FFmpeg args: -f mjpeg -i pipe:0 -f pulse -i recording_sink.monitor
    - Graceful chunk rotation via rotateChunk() method
  - **Remaining Limitations**:
    - Headless-only capture (no Xvfb on Replit)
    - Audio capture requires PulseAudio availability (may not work in all environments)

- **Recording Tasks Management (December 10)**:
  - **DELETE Endpoint**: `DELETE /api/library/recording/tasks/:taskId` - full deletion support
  - **Scheduler Optimization**: Changed from 1-minute polling to **database-triggered alerts** system
    - Checks database every 10 seconds instead of 60 seconds
    - Queries only tasks scheduled within ±5 minute window (via `getScheduledTasks()`)
    - Executes only when scheduled time arrives (±1 minute window)
    - Prevents duplicate execution via `lastExecutedTaskIds` Set tracking
    - More responsive and efficient for upcoming recordings
  - **API Routes** (server/routes/recording.ts):
    - `DELETE /api/library/recording/tasks/:taskId` - Delete any scheduled/failed/completed recording
    - Ownership verification ensures users can only delete their own recordings
    - Full CRUD support: POST schedule, GET list, PUT update, DELETE remove

- **Phase 1 & 2 Responsive Implementation COMPLETED** (December 10, 2025):
  - **Phase 1 - Critical Layout Fixes**:
    - App.tsx: Mobile Sheet drawer, MobileSidebarContent, explicit ml-0 for mobile
    - LibraryPage.tsx: Responsive widths (w-full lg:w-56/96), bottom panel positioning
    - RecordingTasksList.tsx: Responsive grid (grid-cols-1 sm:grid-cols-3)
    - AdminPanel.tsx: Full Tailwind migration, responsive buttons (grid-cols-2 sm:grid-cols-3 lg:grid-cols-4)
  - **Phase 2 - Touch Targets & Modal Scrolling**:
    - All buttons/controls ≥ 44px (min-h-11, min-w-11)
    - Modal scroll containers: RecordingModal, AddCourseModal, UserEditModal (max-h-[90vh] overflow-y-auto)
    - UserEditModal: Converted inline styles to Tailwind, responsive form fields
    - Form responsiveness: flex-col sm:flex-row for multi-column layouts
  - Key patterns: Mobile-first (sm:/md:/lg:/xl:), 44px touch targets, sticky headers/footers
  - Phase 3 (remaining): Typography scaling, spacing consistency - documented in adaptive.md

- **UI Components**:
  - `RecordingModal.tsx`: Form for scheduling with validation, save target selection (Yandex.Disk default)
  - Integration with Library page - "+ Записать трансляцию" button
  - Yandex.Disk as default save location (more reliable for long recordings)

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
