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
- **Subscription Management**: Integrated YooKassa for payment processing, supporting Free, Standard, and Premium plans with monthly/yearly billing. Includes plan comparison, payment history, and admin tools for plan management.
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