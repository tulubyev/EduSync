# My EPA — Агрегатор Образовательных Программ

## Overview
My EPA is an educational platform aggregator for the Russian market, designed for managing online courses from multiple platforms (Coursera, edX, Udemy, Stepik, and others). The project transitioned from a financial application (FinTrack) to an educational course management system. Features include user authentication, course aggregation, progress tracking, deadline management, and administrative controls.

**Strategic Direction:** Desktop version developed with mobile portability as a core principle. All business logic, services, and data models designed for cross-platform reuse.

## User Preferences
- Language of interface: Russian.
- Target audience: Users in Russia.
- Focus on security and ease of use.
- **Development Strategy:** Desktop-first with mobile-ready architecture
- **Portability Goal:** React Native mobile apps (iOS/Android) share backend and data models with web
- **CATEGORICALLY FORBIDDEN**: To change database parameters in the Secret window without explicit user permission.
- **IMPORTANT**: Only the user manages the DATABASE_URL settings and other secret parameters.
- **PAYMENTS**: Stripe does not work in Russia - Russian systems are used (YuKassa, CloudPayments, Sberbank Acquiring).

## Recent Changes

**Architecture Strategy (Nov 28, 2025)**: Established mobile-first architectural principles. All future desktop development follows cross-platform guidelines to ensure seamless portability to iOS/Android via React Native.

**Project Rebrand (Nov 28, 2025)**: Successfully transitioned from FinTrack (financial aggregator) to My EPA (educational platform aggregator). Implemented EduSync-inspired landing page with purple/blue gradient theme, 6 feature cards, and comprehensive footer with 12 informational pages.

**Footer Pages Implementation (Nov 28, 2025)**: Created FooterPages.tsx component with 12 content pages based on documentation:
- Features: Course Management, Progress Tracking, Deadline Management, Schedule Planning
- Support: Documentation, API Reference, System Status, Contact
- Legal: Privacy Policy, Terms of Service, Cookie Policy, Security
All pages accessible via clickable links in the footer with "Back to Home" navigation.

## System Architecture

### Core Principles for Mobile Portability
- **Shared Backend:** All business logic in `/server` serves both web and mobile clients
- **Shared Data Models:** `/shared/schema.ts` used by web, mobile, and API
- **Platform-Agnostic Services:** Services in `/shared` are importable by both web and mobile
- **API-First:** Frontend communicates via REST API (not direct DB access)
- **Responsive Design:** Web UI follows mobile-first responsive patterns

### Frontend Architecture

#### Web (Desktop)
- **Technology Stack**: React with TypeScript, modular component architecture
- **Component Architecture**: 
  - LandingPage.tsx - Main landing page with hero section, features, and footer
  - FooterPages.tsx - 12 informational pages
  - AuthForm.tsx - Authentication component
- **Design Theme**: Purple/blue gradient (#667eea to #764ba2), professional interface
- **Mobile Adaptation**: All components use responsive design (flex, grid with media queries)

#### Mobile (iOS/Android via React Native)
- **Framework**: React Native (shares state management and services with web)
- **Services**: Uses shared `/mobile/shared/services` directory
- **Configuration**: Platform-specific configs in `/mobile/shared/config`
- **Status**: Architecture designed, ready for development

### Backend
- **Technology Stack**: Express.js server with session-based authentication
- **Database**: PostgreSQL on Beget.com (quoquuquosijo.beget.app:5432/myepa_db)
- **API Design**: RESTful endpoints serve both web and mobile clients
- **Authentication**: JWT tokens + session management for web
- **Security**: Password hashing with bcrypt, CSRF protection, rate limiting

### Navigation Structure (Unified Across Platforms)
- **Landing Page** (`/`): Unauthenticated users - available on desktop and mobile
- **Authentication** (`/auth`): Login/registration - responsive design
- **Dashboard** (`/home`): Main page after authentication
- **Courses** (`/courses`): Course listing and management
- **Deadlines** (`/deadlines`): Calendar view and deadline management
- **Notes** (`/notes`): Course notes management
- **Analytics** (`/analytics`): Progress visualization
- **Settings** (`/settings`): User preferences and account management
- **Admin Panel** (`/admin-panel`): Admin-only section for system management

## Supported Educational Platforms (Planned Integrations)
- Coursera (OAuth)
- Udemy (API key)
- edX (OAuth)
- Khan Academy (OAuth)
- LinkedIn Learning (API key + OAuth)
- Pluralsight (API key)
- Codecademy (OAuth)
- Stepik (OAuth)
- YouTube Learning (OAuth)

## External Dependencies
- **PostgreSQL**: Database solution hosted on Beget.com
- **Russian Payment Systems**: YuKassa, CloudPayments, Sberbank Acquiring
- **OpenAI API**: For AI educational assistant (planned)
- **Firebase**: Analytics and crash reporting (mobile)
- **React Native**: iOS/Android framework

## Project Structure (Current & Planned)

```
project-root/
├── client/                    # Web (React + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   └── package.json
├── mobile/                    # React Native (iOS + Android)
│   ├── src/
│   ├── shared/services/       # Shared with web
│   └── package.json
├── server/                    # Express.js Backend
│   ├── services/
│   ├── routes/
│   └── index.ts
├── shared/                    # Shared (Web + Mobile + API)
│   ├── schema.ts             # Database models
│   ├── types.ts              # TypeScript types
│   └── constants.ts
└── package.json (monorepo)
```

## Key Files
- `client/src/components/LandingPage.tsx` - Web landing page
- `client/src/components/FooterPages.tsx` - Footer pages with routing
- `client/src/components/AuthForm.tsx` - Authentication form
- `client/src/App.tsx` - Main web application
- `mobile/shared/config/config.base.ts` - Unified mobile configuration
- `mobile/shared/config/config.platform.ts` - iOS/Android specific config
- `shared/schema.ts` - Shared database schema
- `server/index.ts` - Backend server
- `myepa-docs/docs/` - Documentation folder
- `MOBILE_ARCHITECTURE.md` - Mobile portability strategy and roadmap

## Development Guidelines for Mobile Portability

### When Building Desktop Features:

1. **Business Logic**
   - Keep in `/server/services/` (shared by web and mobile via API)
   - Do NOT put in React components
   
2. **Data Models**
   - Extend `/shared/schema.ts`
   - Use consistent naming across web and mobile
   
3. **API Endpoints**
   - RESTful design following mobile-friendly patterns
   - Include proper error handling and status codes
   
4. **UI Components**
   - Use responsive design (mobile-first approach)
   - Avoid web-specific libraries that can't be ported
   - Consider how component adapts to small screens
   
5. **State Management**
   - Consider using Redux/MobX for web (matches mobile architecture)
   - Keep state separate from UI logic

### Technologies to AVOID for Desktop (Not Mobile-Compatible)
- ❌ Angular
- ❌ jQuery
- ❌ Desktop-only APIs
- ❌ Non-standard HTTP patterns

### Technologies to PREFER (Mobile-Compatible)
- ✅ REST API (HTTP-based)
- ✅ TypeScript (shared types)
- ✅ React/React patterns
- ✅ Redux/MobX (state management)
- ✅ Standard Web APIs (fetch, localStorage alternatives)

## Testing for Mobile Portability

Before considering a feature complete:
- [ ] API endpoints tested via REST client (curl/Postman)
- [ ] Data models follow `/shared/schema.ts` pattern
- [ ] No desktop-specific browser APIs used
- [ ] Responsive design works on mobile viewport (< 480px)
- [ ] Business logic is server-side (not in React)
- [ ] Consider network latency (add loading states, error handling)
- [ ] Offline behavior thought through (for mobile sync)
