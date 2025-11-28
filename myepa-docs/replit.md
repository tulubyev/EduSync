# Educational Course Aggregator Platform

## Overview

This is a comprehensive educational course aggregator platform built with React/TypeScript frontend and Node.js/Express backend. The platform helps users consolidate and manage online courses from multiple platforms in one centralized dashboard, designed for working professionals, students, and lifelong learners.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**November 26, 2025:**
- ✅ Improved security: Removed sensitive data logging (passwords, user data)
- ✅ Enhanced SEO: Added meta tags, Open Graph tags, and canonical URLs
- ✅ Fixed footer visibility across all pages
- ✅ Using Beget PostgreSQL database exclusively
- ✅ Database contains: 11 users, 6 courses, 16 platforms, 4 deadlines, 1 note

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Routing**: wouter for lightweight client-side routing
- **UI Components**: Radix UI with shadcn/ui design system
- **Styling**: TailwindCSS with custom theme support
- **State Management**: React Context API and TanStack React Query
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with middleware-based architecture
- **Authentication**: Session-based auth using Passport.js with local strategy
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: Multer for file uploads
- **Email Service**: SendGrid integration
- **Payment Processing**: Stripe integration

### Mobile Support
- **React Native**: Cross-platform mobile app with shared business logic
- **Platform Support**: iOS and Android configurations
- **Architecture**: Service-based architecture with offline capability

## Key Components

### Authentication System
- Session-based authentication with secure password hashing (scrypt)
- User registration and login with validation
- Protected routes with middleware
- Demo accounts for testing (demo/password, admin/admin123)
- Password visibility toggle functionality in all authentication forms

### Adaptive UI System
- Time-based theme suggestions (energetic morning, focused day, calm evening)
- User-selectable mood themes (neutral, calm, focused, energetic)
- Persistent theme preferences stored client and server-side
- HSL color system with dynamic theme switching

### Course Management
- Course aggregation from multiple platforms
- Progress tracking with visual analytics
- Deadline management with calendar view
- Note-taking system linked to courses
- Course recommendations based on learning patterns

### Platform Integration
- API-based connections to educational platforms
- OAuth and API key authentication support
- Automatic course synchronization
- Platform status monitoring

### Admin Panel
- User management interface
- System monitoring and logs
- Platform integration management
- Analytics and reporting tools

### Legal and Documentation Pages
- API Documentation (/api-docs) - Complete API reference with authentication examples
- General Documentation (/docs) - User guide with quick start and feature explanations
- Privacy Policy (/privacy) - Comprehensive data protection and user rights information
- Terms of Service (/terms) - Legal terms, user responsibilities, and service agreements
- Cookie Policy (/cookies) - Interactive cookie preference management with detailed explanations

## Data Flow

### Authentication Flow
1. User submits credentials → Server validates → Session created
2. Protected routes check session middleware → Allow/deny access
3. Logout destroys session → Redirect to goodbye page

### Course Data Flow
1. Platform APIs → Course sync service → Database storage
2. User interactions → Real-time updates → Progress tracking
3. Analytics service → Data aggregation → Visual dashboards

### Notification Flow
1. Deadline monitoring → Notification service → Push/email delivery
2. Platform updates → Real-time sync → User notifications
3. Admin alerts → System monitoring → Alert dispatching

## External Dependencies

### Database
- **Beget PostgreSQL**: PostgreSQL database hosted on Beget
- **Drizzle ORM**: Type-safe database operations
- Connection pooling for performance optimization

### Third-party Services
- **SendGrid**: Transactional email delivery
- **Stripe**: Payment processing for premium features
- **Platform APIs**: Integration with educational platforms
- **Push Notification Services**: Browser and mobile notifications

### Development Tools
- **Replit**: Development environment with live collaboration
- **ESBuild**: Fast JavaScript bundling
- **TypeScript**: Type safety across the stack

## Deployment Strategy

### Development Environment
- Vite development server with HMR
- Express server with middleware logging
- Development-specific plugins and debugging tools

### Production Build
- Vite build optimization with code splitting
- ESBuild bundling for server-side code
- Static asset serving with proper caching headers

### Database Management
- Drizzle Kit for schema migrations
- Environment-based configuration
- Connection pooling for scalability

### Security Considerations
- HTTPS enforcement in production
- Secure session management with httpOnly cookies
- Input validation using Zod schemas
- CSRF protection and rate limiting
- Secure password hashing with scrypt + salt

### Performance Optimization
- React Query for efficient data fetching and caching
- Code splitting and lazy loading
- Optimized bundle sizes with tree shaking
- CDN integration for static assets

The application is designed to be scalable, maintainable, and user-friendly, with a focus on providing a seamless learning experience across multiple platforms and devices.