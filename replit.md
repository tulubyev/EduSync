# Overview
My EPA (Агрегатор Онлайн Обучения) is an educational platform aggregator for the Russian market. It consolidates online courses from various global and regional platforms into specialized categories, offering a comprehensive learning hub. Key capabilities include user profile management, course aggregation from over 89 platforms, deadline tracking, progress analytics, and an extensive admin panel. The project features a desktop-first design with mobile portability and integrated payment solutions for subscription management, aiming to provide a central point for online education.

# User Preferences
I want to develop this project iteratively. Please provide clear and detailed explanations for any proposed changes or new features. When suggesting code, aim for modern React practices and ensure type safety with TypeScript. I prefer that you ask for my confirmation before making any significant architectural changes or adding new external dependencies.

# System Architecture
The application is built with React and TypeScript, using Shadcn UI for a modern and responsive interface. State management is handled with React hooks, and user authentication uses an `accessToken` stored in `localStorage`.

**UI/UX Decisions:**
The design emphasizes a clean, modern aesthetic with Shadcn UI components, clear typography, accessible forms, and intuitive feedback. It follows a desktop-first approach with responsive mobile design, ensuring all interactive elements meet a minimum touch target size of 44px.

**Technical Implementations & Features:**
- **User Management**: Includes profile editing, secure profile picture management, and subscription status display.
- **Admin Panel**: Provides role-based access for managing users, courses, platforms, payments, and analytics with real-time data.
- **Platform Integration**: Manages over 89 educational platforms, categorized by region and subject, with dynamic loading and filtering.
- **Library (Materials Management)**: Supports web resource URLs and local file uploads (images, videos, audio, PDF, documents) with base64 encoding and optimized image compression. Features platform/course linking, category tags, material pinning, and hierarchical tree-based navigation.
- **Autonomous Recording System**: Utilizes headless Playwright and FFmpeg with CDP screencasting for scheduled video and audio recording of online lectures. Recordings are chunked (20-min) to avoid timeouts, streamed directly, and uploaded to Yandex.Disk with HLS playlist generation. Includes a robust logging system for all recording events.
- **Course Discovery System**: Automates course population from all integrated educational platforms with duplicate prevention.
- **Security**: Implements AES-256-GCM encryption for sensitive data, Scrypt key derivation, rate limiting, and Helmet middleware.
- **API-first Architecture**: All communication between frontend and backend is via REST API.
- **Subscription Management**: Integrated YooKassa and Alfabank for payment processing, supporting Free, Standard, and Premium plans with monthly/yearly billing, recurring payments, and saved payment methods via a Payment Gateway Pattern.
- **External Platform Sync**: Implements OAuth 2.0 (e.g., for Stepik) to sync external courses and deadlines using encrypted tokens.

**System Design Choices:**
- **Database**: PostgreSQL with Drizzle ORM.
- **Data Storage**: Profile images and uploaded files are stored as base64 strings. User credentials for external platforms are AES-256-GCM encrypted. `localStorage` is used for compact data like access tokens.
- **Build & Deployment**: Optimized for Cloud Run with production dependencies and non-blocking background schedulers, enabling quick startup times.
- **React Hooks Compliance**: Adherence to React Hooks rules throughout the application.

# External Dependencies
- **Shadcn UI**: UI component library.
- **Lucide React**: Icon library.
- **Internal REST API Endpoints**: Comprehensive set of endpoints for all application functionalities.
- **YooKassa**: Payment gateway for subscriptions.
- **Alfabank API**: Payment gateway for subscriptions.
- **Stepik API**: External learning platform API for course and deadline synchronization.
- **Yandex.Disk API**: Cloud storage for recorded video chunks.
- **FFmpeg**: For video and audio processing, encoding, and muxing within the recording system.
- **Playwright**: Headless browser automation for the recording system.