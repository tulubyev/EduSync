# My EPA - Educational Platform Aggregator

## Overview

My EPA (Мой ЕПА) is a Russian-market educational platform aggregator that consolidates online courses from multiple platforms (Coursera, Stepik, Udemy, edX, etc.) into a unified dashboard. It provides progress tracking, deadline management, note-taking, course discovery, adaptive UI themes, subscription management, and an autonomous video recording system for webinars and streams.

The app targets working professionals and students who want to manage their learning across many external platforms from one place. It is designed for Russian-speaking users with plans for iOS/Android mobile portability via React Native.

Key feature areas:
- **Unified course dashboard** across 89+ integrated platforms
- **Recording system** (integrated: EPA manages tasks AND executes recordings via Playwright + FFmpeg + PulseAudio, all within the same process)
- **Subscription management** with YooKassa and Alfabank payment gateways
- **OAuth 2.0 integration** with external platforms (e.g., Stepik) for course/deadline sync
- **Admin panel** with role-based access
- **Adaptive UI** with mood/time-based color themes

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: `wouter` (lightweight client-side routing)
- **UI Components**: shadcn/ui (New York style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming; dark mode support
- **State Management**: React Query (TanStack Query v5) for server state; React hooks for local state
- **Forms**: React Hook Form with `@hookform/resolvers` for Zod validation
- **Icons**: Lucide React
- **Build Tool**: Vite with React plugin; output to `dist/public`
- **Path Aliases**: `@/` → `client/src/`, `@shared/` → `shared/`

The frontend is a SPA rooted at `client/index.html`, served by Vite in dev and by Express static serving in production.

**Adaptive Theme System**: A custom React context (`use-adaptive-theme.tsx`) manages mood-based color themes (Neutral/Calm/Focused/Energetic) that shift CSS variables. Theme preferences are stored in both `localStorage` and the server.

### Backend Architecture

- **Runtime**: Node.js 20 (ESM modules)
- **Framework**: Express.js with TypeScript (`tsx` for dev, `esbuild` for prod build)
- **Entry Point**: `server/index.ts` → `server/routes.ts` → modular routers in `server/routes/`
- **Modular Routing**: Routes are split into domain-specific modules (auth, admin, courses, deadlines, notes, platforms, recording, payments, settings, etc.) imported through `server/routes/index.ts`
- **Rate Limiting**: `express-rate-limit` on all `/api` routes (100 req/min default)
- **Request Size**: JSON/URL-encoded bodies up to 20MB (for base64 file uploads)
- **Dev Server Integration**: Vite middleware is attached to the Express server in development

**Security**:
- AES-256-GCM encryption for sensitive data (external platform credentials, tokens)
- Password hashing with Scrypt (Node.js `crypto`)
- Helmet middleware for security headers
- CORS configured per environment
- Token-based session authentication (custom JWT sessions stored in DB)

**Configuration**: Centralized in `config/environment.ts` with typed interfaces for rate limiting, logging, performance, and security settings. All values driven by environment variables.

### Data Storage

- **Database**: PostgreSQL 16 hosted on a dedicated VPS (`DATABASE_URL` env var)
- **ORM**: Drizzle ORM (`drizzle-orm/node-postgres`) with Drizzle Kit for migrations
- **Schema Location**: `shared/schema.ts` — shared between frontend type inference and backend
- **Connection**: `pg.Pool` with SSL (`rejectUnauthorized: false` for Beget compatibility)
- **Migration Command**: `npm run db:push` (drizzle-kit push)

**Key Tables**:
| Table | Purpose |
|---|---|
| `users` | Core user data (UUID PK, email, phone, passwordHash, role, planType, profileImage as base64) |
| `sessions` | Token-based auth sessions with expiry |
| `courses` | Aggregated courses from external platforms |
| `platforms` | Supported educational platforms (89+) |
| `deadlines` | Course deadlines and assignments |
| `notes` | User notes attached to courses |
| `recording_tasks` | Tasks for the Recording Executor (status: ready/in_progress/uploading/completed/failed/cancelled) |
| `subscriptions` | User subscription records |
| `payments` | Payment transaction records |
| `user_activities` | Activity log |
| `system_logs` / `system_messages` | Admin/system audit logs |

**File Storage**: Profile images and uploaded files are stored as base64 strings in the database (not on filesystem). Recorded videos are uploaded to Beget S3 by the integrated Recording Executor.

### Authentication

- **Mechanism**: Custom token-based sessions (JWT-style tokens stored in the `sessions` DB table)
- **Password Security**: Scrypt key derivation (Node.js crypto) + bcrypt also available
- **Session Cookie**: httpOnly, secure in production
- **Protected Routes**: Middleware checks token from cookie or Authorization header, verifies against DB
- **Admin Access**: Role-based (`role: admin`, `adminRole: super_admin | analytics_admin | devops_admin | finance_admin | api_admin | security_admin`)
- **External Platform Auth**: OAuth 2.0 (e.g., Stepik) with AES-256-GCM encrypted token storage

### Recording Executor (Integrated)

Recording execution is now fully integrated into the EPA backend (previously a separate Replit project). Code lives in `server/services/recording/executor/`:

- **`taskPoller.ts`** — polls `recording_tasks` every 5s for `status = 'ready'`; atomically claims tasks; heartbeat every 30s; PM2-cluster-safe (runs in primary worker only)
- **`streamingRecorder.ts`** — Playwright (headless Chromium) + CDPSession screencast → FFmpeg pipe → MP4
- **`audioSetup.ts`** — PulseAudio virtual null-sink for browser audio capture; graceful fallback to video-only
- **`begetStorage.ts`** — uploads finished MP4 to Beget S3; cleans up temp files
- **`urlValidator.ts`** — HTTP HEAD check + source type detection for 89+ platforms before recording starts
- **`config.ts`** — reads `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, `WORKER_ID`, `MAX_WORKERS`, `BEGET_S3_*`, poll/heartbeat intervals from env
- **`previewBus.ts`** — EventEmitter for live frame preview (admin dashboard)

**Multi-worker pool**: `PollerController` manages N `TaskPoller` instances (pool). `MAX_WORKERS` env var (default 1, max 8) controls pool size. Each worker gets its own Playwright browser + FFmpeg process + per-worker audio sink (`epa_sink_<workerId>`) + per-worker temp dir (`/tmp/recordings/<workerId>/`). DB-level atomic claiming ensures no race conditions. Admin dashboard has "＋ Воркер" button and per-worker "✕" stop buttons. RAM check (~600 MB/worker) logs warnings at startup.

System packages required: `chromium`, `ffmpeg`, `pulseaudio` (installed via Nix).

### Mobile Strategy

Documentation exists for a React Native mobile app (`docs/MOBILE_ARCHITECTURE.md`, `docs/MOBILE_FIRST_GUIDELINES.md`). The backend REST API is designed to serve web, mobile, and admin clients equally. Business logic is kept server-side; UI is platform-specific.

## External Dependencies

### Payment Gateways
- **YooKassa**: Russian payment gateway for subscription billing (monthly/yearly), recurring payments
- **Alfabank API**: Secondary Russian payment gateway

### Educational Platform APIs
- **Stepik API**: OAuth 2.0 integration for syncing external courses and deadlines
- Additional platforms planned via REST/OAuth/LTI protocols

### Storage
- **Beget S3 (Object Storage)**: Primary storage for recorded video chunks (used by Recording Executor via `@aws-sdk/client-s3`)
- **Yandex.Disk API**: Alternative storage option for video chunks

### Media Processing (Recording Executor — integrated into EPA backend)
- **Playwright**: Headless browser automation for capturing streams
- **FFmpeg** (`fluent-ffmpeg`): Video/audio encoding, muxing, HLS playlist generation
- **PulseAudio**: Virtual audio sink for capturing browser audio

### Infrastructure
- **PostgreSQL 16**: Primary database on dedicated VPS
- **Google Cloud Storage SDK**: Used in `server/objectStorage.ts` via Replit sidecar endpoint (for Replit Object Storage integration)
- **Drizzle ORM + Drizzle Kit**: Schema management and migrations
- **Nodemailer**: Email sending (SMTP via Beget)

### UI & Frontend Libraries
- **shadcn/ui**: Component library (Radix UI based)
- **TanStack React Query v5**: Server state management and caching
- **Lucide React**: Icon set
- **wouter**: Lightweight React router
- **React Hook Form + Zod**: Form validation

### Dev & Build
- **Vite**: Frontend bundler with HMR
- **esbuild**: Backend bundler for production
- **tsx**: TypeScript execution for development
- **@replit/vite-plugin-cartographer**: Replit-specific dev tool (dev only)

### Environment Variables Required
```
DATABASE_URL          # PostgreSQL connection string
JWT_SECRET            # JWT signing secret
ENCRYPTION_KEY        # 64-char hex key for AES-256-GCM
NODE_ENV              # development | production
BEGET_SMTP_HOST       # SMTP host for email
BEGET_SMTP_USER       # SMTP username
BEGET_SMTP_PASSWORD   # SMTP password

# Recording Executor (integrated into EPA backend)
BEGET_S3_ENDPOINT     # S3 endpoint URL (default: https://s3.ru1.storage.beget.cloud)
BEGET_S3_ACCESS_KEY   # S3 access key
BEGET_S3_SECRET_KEY   # S3 secret key
BEGET_S3_BUCKET       # Bucket name
BEGET_S3_REGION       # S3 region (default: ru-1)
WORKER_ID             # Unique worker identifier (default: epa-worker-1)
POLL_INTERVAL_MS      # Task poll interval in ms (default: 5000)
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH  # Path to Chromium binary (auto-detected from Nix)
```