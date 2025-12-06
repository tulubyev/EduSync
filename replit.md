# Overview
My EPA (Агрегатор Онлайн Обучения) is an educational platform aggregator targeting the Russian market. It consolidates online courses from various global and regional platforms (e.g., Coursera, edX, Udemy, Stepik) into 9 specialized categories and 4 regional groups. The platform provides comprehensive features including user profile management, course aggregation, deadline tracking, progress analytics, and an extensive admin panel. It's developed with a desktop-first approach, ensuring mobile portability, and is backed by a PostgreSQL database integrating over 89 educational platforms.

# User Preferences
I want to develop this project iteratively. Please provide clear and detailed explanations for any proposed changes or new features. When suggesting code, aim for modern React practices and ensure type safety with TypeScript. I prefer that you ask for my confirmation before making any significant architectural changes or adding new external dependencies.

# System Architecture
The application is built using React and TypeScript, with Shadcn UI for a modern and responsive interface. State management utilizes React's `useState` and `useEffect` hooks. User authentication relies on an `accessToken` stored in `localStorage` for API requests.

**UI/UX Decisions:**
The design follows a clean, modern aesthetic using Shadcn UI components like `Card`, `Button`, and `Badge`. It emphasizes clear typography, accessible form elements, and intuitive feedback mechanisms. The layout is desktop-first with responsive mobile design.

**Technical Implementations & Features:**
- **User Profile Management**: Display and edit personal information, including first name, last name, email, and phone number.
- **Profile Picture Management**: Supports upload, preview, and update of profile images with drag-and-drop, client-side validation (size, type), and storage as base64 WebP in the database. Profile image persists after page reload.
- **Subscription Status**: Displays user plan types (Free, Premium, Pro) with visual badges.
- **Form Validation**: Client-side validation for all input fields.
- **Admin Panel**: Features user management (view, edit, delete unverified users), course management, platform management (with dynamic regional and category filters), and analytics. Access is role-based (Super Admin, Analytics Admin).
- **Platform Integration**: Manages 89+ educational platforms, categorized by region (Global, European, Asian, Russian) and subject (e.g., IT, Art & Design). Platform data includes `code`, `name`, `description`, `websiteUrl`, `category`, `region`, `languages`, `color`, `apiType`, and user `status`.
- **Library (Materials Management)**: Renamed from "Notes", now supports:
  - Web resource URLs with automatic content type detection (video 🎥, audio 🎵, images 🖼️, text 🔗)
  - File uploads from local storage (images, videos, audio, PDF, documents) with base64 encoding
  - **Optimized image compression** - auto-compress images to 1200px max (60-80% faster saves)
  - Platform and course linking with optional dropdown selectors
  - Category tags for materials
  - Material pinning for quick access
  - Tree-based navigation with hierarchical organization:
    - Закреплённые (Pinned materials)
    - Платформы (Platforms) - grouped by platform
    - Курсы (Courses) - grouped by course
    - Теги (Tags) - grouped by tags
    - Без категории (Uncategorized)
  - Three-column layout: Navigation tree | Material list | Detail view
  - Modal view for full material details on all screen sizes
  - **Resizable columns** - drag borders to adjust widths (min 150px, max 600px)
  - Loading indicator during file processing
- **Security**: Implements AES-256-GCM encryption for sensitive data (e.g., user credentials), Scrypt key derivation, rate limiting, and Helmet middleware.
- **API-first Architecture**: All frontend-backend communication is via REST API, ensuring compatibility across web and mobile.

**System Design Choices:**
- **Database**: PostgreSQL with Drizzle ORM for schema management.
- **Data Storage**: Profile images are stored as base64 WebP strings (400x400px) in the database. User credentials for external platforms are AES-256-GCM encrypted. Uploaded files are stored as base64 data URLs. `localStorage` is used only for compact data.
- **React Hooks Compliance**: Adherence to React Hooks rules, ensuring unconditional calls.
- **Library Component**: Uses hierarchical tree navigation for intuitive material organization with resizable columns and file upload support.

# External Dependencies
- **Shadcn UI**: UI component library.
- **Lucide React**: Icon library.
- **Internal REST API Endpoints**:
    - `/api/users/profile` (GET, POST) - User profile data.
    - `/api/users/profile/photo` (POST) - Profile picture upload.
    - `/api/users/admin/:userId` (GET, PUT, DELETE) - Admin user management.
    - `/api/platforms` (POST) - Add new platforms.
    - `/api/platforms/by-region` (GET) - Fetch platforms categorized by region.
    - `/api/platforms/categories` (GET) - Fetch platform categories.
    - `/api/platforms/authorize` (POST) - Save encrypted platform credentials.
    - `/api/platforms/:platformId/credentials` (GET) - Retrieve decrypted credentials.
    - `/api/admin/users/detailed/all` (GET) - Get detailed list of all users.
    - `/api/library` (GET, POST) - Fetch and create library materials.
    - `/api/library/:id` (GET, PUT, DELETE) - Material CRUD operations.

# Recent Changes (December 2, 2025)

## Resource Preview Optimization - COMPLETE
- ✅ Added `getResourcePreview()` function for compact resource display in middle column
- ✅ Extracts file type from base64 data URL (e.g., "PNG", "MP4", "WAV")
- ✅ Shows icon + file type in list view (e.g., 📸 PNG)
- ✅ Middle column now displays resource type instead of full base64 data
- ✅ Right panel displays full rendered content using `renderResource()`
- ✅ Improved information density and scrolling performance

## Library UI Improvements
- ✅ Added view mode toggle: List (📋) and Grid (🔲)
- ✅ List mode: horizontal rows - compact and readable (default)
- ✅ Grid mode: 3-column layout (original card view)
- ✅ Better information density with title, preview, badges
- ✅ User can switch between modes with buttons in header
- ✅ Improved scrolling through large lists

## Base64 Image Display
- ✅ Added `renderResource()` function to display base64 files correctly
- ✅ Images show as `<img>` instead of broken links
- ✅ Video files display with controls
- ✅ Audio files show player
- ✅ External URLs still work as links
- ✅ Updated icon detection for base64 types (`data:image/`, `data:video/`, `data:audio/`)
- ✅ Works in both card view and detail panel

## File Upload Optimization
- ✅ Fixed slow file saving by implementing image compression
- ✅ Added `isConverting` state with loading indicator ("⏳ Обработка файла...")
- ✅ Images automatically compressed to max 1200px before base64 conversion (60-80% size reduction)
- ✅ Disabled file input during conversion to prevent multiple uploads
- ✅ JPEG compression at 0.8 quality for optimal size/quality balance
- ✅ Error handling for failed file conversions

## Profile Image Fix
- ✅ Fixed profile image disappearing on page reload
- ✅ Added AvatarImage component to Header with profileImage/profileImageUrl fallback
- ✅ Profile image now loads from server on `/api/auth/verify` and persists in localStorage
- ✅ Displays base64 image or URL image based on what's available
- ✅ Falls back to user initials if image unavailable

## Library (Materials) Implementation - COMPLETE
- ✅ Renamed "Notes" section to "Library" across application
- ✅ Added platform and course linking with optional dropdown selectors
- ✅ Implemented URL resource attachment with content type detection
- ✅ Fixed Radix UI Select validation (using "none" value instead of empty string)
- ✅ Backend schema updated to handle nullable platformId and courseId
- ✅ Created modal view for material details (desktop and mobile)
- ✅ Resource URLs displayed in modals and detail panels with icons and external links

## Tree Navigation System - COMPLETE
- ✅ Created `LibraryTreeNav.tsx` component for hierarchical material organization
- ✅ Automatic grouping by: Platforms | Courses | Tags | Pinned status
- ✅ Expandable/collapsible nodes with chevron indicators
- ✅ Material counters for each category
- ✅ Click handlers for tree nodes and individual materials
- ✅ Integrated 3-column layout: Navigation | List | Details
- ✅ Material selection from tree displays in detail panel
- ✅ Responsive design (tree hidden on mobile/tablet, visible on desktop)

## Resizable Columns - COMPLETE
- ✅ Created `ResizeHandle.tsx` component for draggable column borders
- ✅ Left tree column: 150px - 400px (default 224px)
- ✅ Right detail column: 250px - 600px (default 384px)
- ✅ Smooth drag-and-drop with visual feedback
- ✅ Cursor changes to col-resize on hover
- ✅ Real-time width adjustment while dragging

## File Upload Support - COMPLETE
- ✅ Added `resourceUrl` field to notes schema in database
- ✅ Added `platformId` reference to notes for platform linking
- ✅ Created file upload input in MaterialModal with drag-compatible file picker
- ✅ Automatic base64 encoding of uploaded files (max 5 MB)
- ✅ Support for images, videos, audio, PDF, and documents
- ✅ Backend validation accepts both HTTP/HTTPS URLs and base64 data URLs
- ✅ File name display after upload (✅ Загружено: filename)
- ✅ Dual input method: URL OR file upload (not both simultaneously)

# Recent Changes (December 6, 2025)

## YooKassa Payment Integration - COMPLETE
- ✅ Implemented YooKassa payment system for subscription payments
- ✅ Created `yookassaService.ts` with direct HTTP API calls (Basic Auth, idempotence keys)
- ✅ Added subscription plans table with Free, Стандарт (Standard), Премиум (Premium) tiers
- ✅ Created subscriptions and payments tables in database
- ✅ Subscription routes: `/api/subscriptions/*`
  - GET `/plans` - Get available subscription plans
  - GET `/current` - Get current user subscription
  - POST `/create-payment` - Create payment link for subscription
  - POST `/webhook` - YooKassa payment notification webhook
  - POST `/cancel` - Cancel subscription
  - GET `/history` - Get payment history
  - GET `/status` - Check YooKassa configuration status
  - POST `/admin/plans` - Create new plan (admin)
  - PUT `/admin/plans/:id` - Update plan (admin)
  - DELETE `/admin/plans/:id` - Delete plan (admin)
- ✅ Created `SubscriptionPage.tsx` with:
  - Plan comparison cards (Free, Standard, Premium)
  - Monthly/yearly billing toggle with 20% discount (inline badge)
  - Current subscription status display
  - Payment history section
  - YooKassa payment opens in new tab
  - Auto-refresh when user returns from payment (visibility API)
  - Auto-refresh every 30 seconds to sync webhook updates
- ✅ Created `SubscriptionPlansManagement.tsx` for admin panel with CRUD operations
- ✅ Added subscription link in sidebar navigation
- ✅ Success page for completed payments
- ✅ Subscription limits: Free (5 courses), Standard (15 courses), Premium (unlimited)

**Required Environment Variables:**
- `YOOKASSA_SHOP_ID` - YooKassa Shop ID
- `YOOKASSA_SECRET_KEY` - YooKassa Secret Key

## Platform Integration Documentation - COMPLETE
- ✅ Created `docs/integrations.md` with comprehensive integration strategy
- ✅ Documented OAuth 2.0 flow with Authorization Code and Refresh Token flows
- ✅ Detailed Stepik API endpoints (authorization, user data, courses, progress)
- ✅ Defined data structures: StepikCourse, StepikProgress, StepikEnrollment
- ✅ Created EPACourse, EPADeadline mapping interfaces
- ✅ Designed PlatformAdapter interface for multi-platform support
- ✅ Database schema: platform_connections, external_courses, course_deadlines
- ✅ Sync algorithm with token refresh error handling
- ✅ API endpoints design for /api/platforms/* and /api/courses/external

**Required Environment Variables (for Stepik integration):**
- `STEPIK_CLIENT_ID` - Stepik OAuth Client ID
- `STEPIK_CLIENT_SECRET` - Stepik OAuth Client Secret
- `PLATFORM_TOKENS_ENCRYPTION_KEY` - Key for encrypting platform tokens

# File Structure
```
client/src/components/
├── layout/
│   └── Header.tsx                 # Header with profile avatar (FIXED - persists on reload)
├── library/
│   ├── LibraryPage.tsx            # Main library with 3-column resizable layout + file upload
│   ├── LibraryTreeNav.tsx         # Tree navigation component
│   └── ResizeHandle.tsx           # Draggable column border component
├── settings/
│   ├── SettingsPage.tsx           # User settings page
│   └── SubscriptionPage.tsx       # Subscription management with YooKassa payments
└── ...

shared/
└── schema.ts                      # Drizzle ORM schema (includes subscriptionPlans, subscriptions, payments)

server/
├── services/
│   └── yookassaService.ts         # YooKassa API integration (HTTP/Basic Auth)
├── routes/
│   ├── subscriptions.ts           # Subscription and payment endpoints
│   └── library.ts                 # Library API endpoints with file validation
└── ...

client/src/components/admin/
└── SubscriptionPlansManagement.tsx # Admin panel for managing subscription plans (CRUD)
```
