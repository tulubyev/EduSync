# My EPA — Агрегатор Образовательных Программ

## Overview
My EPA is an educational platform aggregator for the Russian market, designed for managing online courses from multiple platforms (Coursera, edX, Udemy, Stepik, and others). The project transitioned from a financial application (FinTrack) to an educational course management system. Features include user authentication, course aggregation, progress tracking, deadline management, and administrative controls.

## User Preferences
- Language of interface: Russian.
- Target audience: Users in Russia.
- Focus on security and ease of use.
- **CATEGORICALLY FORBIDDEN**: To change database parameters in the Secret window without explicit user permission.
- **IMPORTANT**: Only the user manages the DATABASE_URL settings and other secret parameters.
- **PAYMENTS**: Stripe does not work in Russia - Russian systems are used (YuKassa, CloudPayments, Sberbank Acquiring).

## Recent Changes

**Project Rebrand (Nov 28, 2025)**: Successfully transitioned from FinTrack (financial aggregator) to My EPA (educational platform aggregator). Implemented EduSync-inspired landing page with purple/blue gradient theme, 6 feature cards, and comprehensive footer with 12 informational pages.

**Footer Pages Implementation (Nov 28, 2025)**: Created FooterPages.tsx component with 12 content pages based on documentation:
- Features: Course Management, Progress Tracking, Deadline Management, Schedule Planning
- Support: Documentation, API Reference, System Status, Contact
- Legal: Privacy Policy, Terms of Service, Cookie Policy, Security
All pages accessible via clickable links in the footer with "Back to Home" navigation.

**Documentation Structure**: Uploaded documentation to myepa-docs/docs/ folder containing:
- platform-integration-guide.md (supported platforms, connection process)
- authentication-flow.md (login/registration flow)
- navigation-schema.md (page structure and transitions)
- testing-guide.md (test accounts and procedures)
- adaptive-ui-implementation.md (mood-based UI adaptation)

## System Architecture

### Frontend
- **Technology Stack**: React with TypeScript, modular component architecture with direct state management and inline styling.
- **Component Architecture**: 
  - LandingPage.tsx - Main landing page with hero section, features, and footer navigation
  - FooterPages.tsx - 12 informational pages for features, support, and legal sections
  - AuthForm.tsx - Authentication component (login/registration)
- **Design Theme**: Purple/blue gradient (#667eea to #764ba2), professional and clean interface.

### Backend
- **Technology Stack**: Express.js server with session-based authentication.
- **Database**: PostgreSQL hosted on Beget.com (quoquuquosijo.beget.app:5432/myepa_db).
- **Security**: Password hashing with scrypt, session management, CSRF protection.

### Navigation Structure
- **Landing Page** (`/`): Default page for unauthenticated users
- **Authentication** (`/auth`): Login/registration accessible via "Войти" button
- **Dashboard** (`/home`): Main page after authentication
- **Footer Pages**: Clickable links open informational pages within landing page context

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
- **PostgreSQL**: Database solution hosted on Beget.com.
- **Russian Payment Systems**: YuKassa, CloudPayments, Sberbank Acquiring (for payment processing in Russia).
- **OpenAI API**: For AI educational assistant (planned).

## Key Files
- `client/src/components/LandingPage.tsx` - Landing page component
- `client/src/components/FooterPages.tsx` - Footer page content component
- `client/src/components/AuthForm.tsx` - Authentication form
- `client/src/App.tsx` - Main application component
- `myepa-docs/docs/` - Documentation folder
- `shared/schema.ts` - Database schema
- `server/index.ts` - Backend server
