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
- **Profile Picture Management**: Supports upload, preview, and update of profile images with drag-and-drop, client-side validation (size, type), and storage as base64 WebP in the database.
- **Subscription Status**: Displays user plan types (Free, Premium, Pro) with visual badges.
- **Form Validation**: Client-side validation for all input fields.
- **Admin Panel**: Features user management (view, edit, delete unverified users), course management, platform management (with dynamic regional and category filters), and analytics. Access is role-based (Super Admin, Analytics Admin).
- **Platform Integration**: Manages 89+ educational platforms, categorized by region (Global, European, Asian, Russian) and subject (e.g., IT, Art & Design). Platform data includes `code`, `name`, `description`, `websiteUrl`, `category`, `region`, `languages`, `color`, `apiType`, and user `status`.
- **Security**: Implements AES-256-GCM encryption for sensitive data (e.g., user credentials), Scrypt key derivation, rate limiting, and Helmet middleware.
- **API-first Architecture**: All frontend-backend communication is via REST API, ensuring compatibility across web and mobile.

**System Design Choices:**
- **Database**: PostgreSQL with Drizzle ORM for schema management.
- **Data Storage**: Profile images are stored as base64 WebP strings (400x400px) in the database. User credentials for external platforms are AES-256-GCM encrypted. `localStorage` is used only for compact data.
- **React Hooks Compliance**: Adherence to React Hooks rules, ensuring unconditional calls.

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