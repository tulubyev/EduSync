# Overview
My EPA (Агрегатор Онлайн Обучения) is an educational platform aggregator for the Russian market. It consolidates online courses from various global and regional platforms into 9 specialized categories and 4 regional groups. The platform offers user profile management, course aggregation, deadline tracking, progress analytics, and an extensive admin panel. It features a desktop-first design with mobile portability and uses a PostgreSQL database to integrate over 89 educational platforms. The project aims to provide a comprehensive learning hub and has integrated payment solutions for subscription management.

# User Preferences
I want to develop this project iteratively. Please provide clear and detailed explanations for any proposed changes or new features. When suggesting code, aim for modern React practices and ensure type safety with TypeScript. I prefer that you ask for my confirmation before making any significant architectural changes or adding new external dependencies.

# System Architecture
The application is built with React and TypeScript, leveraging Shadcn UI for a modern and responsive interface. State management is handled with React hooks. User authentication uses an `accessToken` stored in `localStorage`.

**UI/UX Decisions:**
The design emphasizes a clean, modern aesthetic with Shadcn UI components, clear typography, accessible forms, and intuitive feedback. It follows a desktop-first approach with responsive mobile design.

**Technical Implementations & Features:**
- **User Management**: Includes profile editing, secure profile picture management (base64 WebP), and subscription status display.
- **Admin Panel**: Provides role-based access for managing users, courses, platforms (with regional/category filters), and analytics.
- **Platform Integration**: Manages over 89 educational platforms, categorized by region and subject. Platform data includes `code`, `name`, `description`, `websiteUrl`, `category`, `region`, `languages`, `color`, `apiType`, and user `status`.
- **Library (Materials Management)**: Supports web resource URLs (with auto content type detection) and local file uploads (images, videos, audio, PDF, documents) with base64 encoding. Features optimized image compression (max 1200px), platform/course linking, category tags, material pinning, and hierarchical tree-based navigation. The UI includes a three-column layout (Navigation | Material list | Detail view) with resizable columns and a modal view for material details.
- **Security**: Implements AES-256-GCM encryption for sensitive data, Scrypt key derivation, rate limiting, and Helmet middleware.
- **API-first Architecture**: All communication between frontend and backend is via REST API.
- **Subscription Management**: Integrated YooKassa for payment processing, supporting Free, Standard, and Premium plans with monthly/yearly billing. Includes plan comparison, payment history, and admin tools for plan management. Supports recurring payments with daily auto-renewal processing and saved payment methods. **See [docs/payments.md](docs/payments.md) for complete payment system documentation including integration guides for additional payment gateways like Альфа-Банк.**
- **External Platform Sync**: Implements OAuth 2.0 (e.g., for Stepik) to sync external courses and deadlines, using encrypted tokens and refresh mechanisms.

**System Design Choices:**
- **Database**: PostgreSQL with Drizzle ORM.
- **Data Storage**: Profile images and uploaded files are stored as base64 strings. User credentials for external platforms are AES-256-GCM encrypted. `localStorage` is used for compact data like access tokens.
- **React Hooks Compliance**: Adherence to React Hooks rules.
- **Library Component**: Utilizes hierarchical tree navigation for material organization with resizable columns and comprehensive file upload capabilities.

# External Dependencies
- **Shadcn UI**: UI component library.
- **Lucide React**: Icon library.
- **Internal REST API Endpoints**:
    - `/api/users/profile` (GET, POST)
    - `/api/users/profile/photo` (POST)
    - `/api/users/admin/:userId` (GET, PUT, DELETE)
    - `/api/platforms` (POST)
    - `/api/platforms/by-region` (GET)
    - `/api/platforms/categories` (GET)
    - `/api/platforms/authorize` (POST)
    - `/api/platforms/:platformId/credentials` (GET)
    - `/api/admin/users/detailed/all` (GET)
    - `/api/library` (GET, POST)
    - `/api/library/:id` (GET, PUT, DELETE)
    - `/api/stepik/auth-url` (GET)
    - `/api/stepik/callback` (GET)
    - `/api/stepik/sync` (POST)
    - `/api/stepik/courses` (GET)
    - `/api/stepik/status` (GET)
    - `/api/stepik/disconnect` (POST)
    - `/api/subscriptions/plans` (GET)
    - `/api/subscriptions/current` (GET)
    - `/api/subscriptions/create-payment` (POST)
    - `/api/subscriptions/webhook` (POST)
    - `/api/subscriptions/cancel` (POST)
    - `/api/subscriptions/history` (GET)
    - `/api/subscriptions/status` (GET)
    - `/api/subscriptions/admin/plans` (POST, PUT, DELETE)
- **YooKassa**: Payment gateway for subscriptions.
- **Stepik API**: External learning platform API for course and deadline synchronization.
---

## Stepik Integration - Phase 3: UI Components - COMPLETE (Dec 6, 2025)

### Components Created:
- **`StepikConnectionPage.tsx`** - Main UI for Stepik connection management
  - OAuth authorization button with redirect to Stepik
  - Connection status display (connected/disconnected)
  - Manual sync button with loading state
  - Synced courses list with progress tracking
  - Disconnect button with confirmation dialog
  - Error alerts and last sync timestamp
  - Responsive design using Shadcn UI

- **`OAuthCallbackHandler.tsx`** - OAuth callback URL handler
  - Processes authorization code from Stepik
  - Exchanges code for tokens (via backend)
  - Handles errors gracefully
  - Redirects to settings on success

### Updates to Existing Files:
- **`SettingsPage.tsx`** - Added Tabs navigation
  - Profile tab - existing user profile management
  - Platforms tab - StepikConnectionPage integration

- **`App.tsx`** - Added OAuth callback route
  - Route `/auth/stepik/callback` → OAuthCallbackHandler

### Testing Instructions:
1. Navigate to Settings → Platforms tab
2. Click "Подключить к Stepik" button
3. You'll be redirected to Stepik OAuth
4. Authorize with Stepik account (test: alt@baikal-internet.ru / owerktoo)
5. Automatically returned to Settings with sync starting
6. View synced courses and manage connection (sync/disconnect)

---

## Documentation Update - Phase 4: Technical Documentation (Dec 6, 2025)

### docs/integrations.md - Enhanced Sections:

**Part 6: Authentication Data Storage Architecture**
- platform_connections table schema with all fields
- AES-256-GCM encryption process with JSON storage format (encrypted/iv/authTag)
- Scrypt key derivation with fixed 'salt'
- Token lifecycle diagrams (creation → usage → refresh → revocation)
- Connection status matrix (active, expired, reauth_required, revoked)

**Part 7: Synced Data Storage**
- ERD diagram showing users → platform_connections → external_courses → course_deadlines relationships
- external_courses table schema (progress, isCompleted, metadata, etc.)
- course_deadlines table schema (deadlineType, dueDate, metadata)
- Index definitions for optimal query performance
- API Endpoints section with correct /api/stepik/* paths

**Part 8: Subscription & Platform Integration (Planned)**
- Tier limitations table (Free/Standard/Premium)
- Planned subscription guard pseudocode (not yet implemented)
- Access control matrix

**Part 9: Data Flows & Synchronization**
- Complete sync flow diagram
- Sync triggers (OAuth callback, dashboard open, cron, manual)
- Error handling strategy with retry/reauth/skip/fail paths
- Query optimization techniques (batching, parallel requests)

---

## Recurring Payments System - Phase 5: Auto-renewal Implementation (Dec 6, 2025)

### Database Changes:
- Added `autoRenewalEnabled` (boolean, default false) - toggle automatic renewal
- Added `lastAutoPaymentAttemptAt` (timestamp) - track retry logic
- Fields `yoomoneyPaymentMethodId` already present to store payment token

### Backend Implementation:

**YooKassa Service Enhancements:**
- **`createPayment()`** - Now requests card saving with `payment_method_data.save: true`
- **`processWebhook()`** - Extracts and saves `payment_method.id` from YooKassa response
- **`createAutoPayment(subscriptionId)`** - New method for charging saved payment methods
- **`processAutoPayments()`** - New method that:
  - Runs hourly via cron-job in server/index.ts
  - Checks all subscriptions with autoRenewalEnabled=true
  - Initiates payment if currentPeriodEnd is within 24 hours
  - Handles retry tracking via lastAutoPaymentAttemptAt

**New API Endpoint:**
- `POST /api/subscriptions/toggle-auto-renewal` - Enable/disable auto-renewal
  - Validates payment method exists before enabling
  - Updates subscription.autoRenewalEnabled

### Frontend Updates:

**SubscriptionPage.tsx Enhancements:**
- Shows "Автоматическое продление" (Auto-renewal) checkbox when payment method exists
- Toggle enables/disables auto-renewal with loading state
- Displays active status with green "✓ АКТИВНА" badge
- Shows next payment date alongside expiry date
- Improved payment history with color-coded status (green=completed, yellow=pending, red=failed)

### How It Works:

**User Flow:**
1. User subscribes and YooKassa requests card save permission
2. Card is saved and `paymentMethodId` stored in subscriptions table
3. User enables "Автоматическое продление" toggle in Settings → Subscription
4. Hourly cron-job checks for upcoming renewals (within 24 hours)
5. Auto-payment is created using saved card (no user interaction needed)
6. Webhook confirms payment status and updates subscription period

**Error Handling:**
- If auto-payment fails, lastAutoPaymentAttemptAt is recorded for retry logic
- Failed payments are tracked in payment history with status 'failed'
- User can manually renew or disable auto-renewal anytime

### Testing Instructions:

1. **Enable auto-renewal:**
   - Go to Settings → Subscription
   - Complete a payment (card saving will be requested)
   - Toggle "Автоматическое продление" checkbox
   - Verify checkbox is enabled and saved

2. **Monitor auto-payments:**
   - Check server logs for "Running auto payment processor..." messages (every hour)
   - Look in Payment History for auto-renewal payments
   - Check subscription status for nextPaymentAt date

3. **Manual testing (development):**
   - Call `yookassaService.processAutoPayments()` directly
   - Set a subscription's currentPeriodEnd to tomorrow
   - Auto-payment should trigger immediately

### Scheduled Tasks:
- Auto-renewal processor runs **once per day at 00:00 (midnight)**
- Checks `nextPaymentAt` field in subscriptions table instead of current date ± 24 hours
- Optimized: Instead of running hourly (3,600 checks/day), now runs 1 check/day
- Can be adjusted in server/index.ts `scheduleAutoPaymentProcessor()` function

### How nextPaymentAt Works:
1. When subscription is activated (line 386, 409 in yookassaService.ts):
   - `nextPaymentAt` is set to `currentPeriodEnd` (payment date)
2. When auto-payment is processed successfully:
   - Subscription period extends by 1 month/year
   - `nextPaymentAt` automatically updates to new `currentPeriodEnd`
3. Daily processor at midnight:
   - Queries only subscriptions where `nextPaymentAt <= today`
   - Much more efficient than hourly checks

---
