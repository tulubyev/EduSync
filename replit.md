# Overview
My EPA (Агрегатор Онлайн Обучения) is an educational platform aggregator for the Russian market. It consolidates online courses from various global and regional platforms into specialized categories. The platform offers user profile management, course aggregation, deadline tracking, progress analytics, and an extensive admin panel. It features a desktop-first design with mobile portability and uses a PostgreSQL database to integrate over 89 educational platforms. The project aims to provide a comprehensive learning hub and has integrated payment solutions for subscription management.

# Recent Changes (December 06, 2025)
- **Platform Selector Enhancement**: Added category and region filtering to platform selector modal when adding courses
  - Dynamic category extraction from platform data
  - Global/Russian region filtering (based on platform.isGlobal property)
  - Scrollable filter buttons for better UX with large number of platforms
  - Same filtering logic as Platforms page for consistency

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
