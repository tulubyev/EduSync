# Educational Course Aggregator Platform

An advanced educational course aggregator platform that delivers personalized and intelligent learning experiences across mobile and web platforms, with enhanced platform integration and user engagement technologies.

## Overview

This platform helps users consolidate and manage online courses from multiple platforms in one centralized dashboard. It's designed for working professionals, students, and lifelong learners who want to organize their educational journey across various learning platforms.

## Key Features

- **Unified Dashboard**: Central hub for viewing all courses and learning activities
- **Platform Integration**: Connect with multiple educational platforms via API
- **Progress Tracking**: Visual analytics showing learning progress over time
- **Deadline Management**: Calendar view for course deadlines and assignments
- **Note Taking**: Attach notes to specific courses and learning materials
- **Push Notifications**: Browser and mobile notifications for deadlines and updates
- **Adaptive UI**: Color scheme adapts based on user mood and time of day
- **Course Recommendations**: Personalized suggestions based on learning patterns
- **Admin Panel**: Complete control for administrators to manage users and content

## Getting Started

### Prerequisites
- Node.js
- PostgreSQL database

### Installation
1. Clone this repository
2. Install dependencies with `npm install`
3. Configure environment variables
4. Start the development server with `npm run dev`

### Demo Accounts
For testing purposes, the following accounts are available:

| Username | Email | Password | Role |
|----------|-------|----------|------|
| demo | demo@example.com | password | Regular user |
| admin | admin@example.com | admin123 | Administrator |
| test2 | test2@example.com | password123 | Regular user |
| alt | alt@yachtdeck.ru | owerktoo | Regular user |

## Technical Documentation

Comprehensive documentation is available in the [docs](./docs) folder:

### User Documentation
- [Navigation Schema](./docs/navigation-schema.md) - Complete map of page transitions
- [Authentication Guide](./docs/authentication-flow.md) - Login, registration, and security
- [Menu Interaction](./docs/menu-interaction.md) - Menu structure and click paths
- [Testing Guide](./docs/testing-guide.md) - Authentication testing procedures
- [Platform Integration Guide](./docs/platform-integration-guide.md) - Connecting learning platforms

### Developer Documentation
- [Component Interaction](./docs/component-interaction.md) - Component communication diagrams
- [Adaptive UI Implementation](./docs/adaptive-ui-implementation.md) - Technical overview
- [Adaptive UI User Guide](./docs/adaptive-ui-user-guide.md) - Feature explanation for users

## Navigation Structure

### Main Pages
- **Login/Register** (`/auth`): Authentication page with registration option
- **Dashboard** (`/`): Main landing page after login
- **Courses** (`/courses`): Course listing and management
- **Deadlines** (`/deadlines`): Calendar view and deadline management
- **Notes** (`/notes`): Course notes management
- **Analytics** (`/analytics`): Progress visualization
- **Settings** (`/settings`): User preferences and account management
- **Admin Panel** (`/admin-panel`): Admin-only section

### Settings Tabs
- **Account**: Profile management
- **Notifications**: Notification preferences
- **Appearance**: Theme settings and mood-based UI options
- **Privacy**: Privacy controls
- **Integrations**: Platform connections
- **Help & Support**: Documentation and support resources

### Admin Panel Tabs
- **Users**: User management
- **Messages**: System message management
- **Payments**: Payment and subscription oversight
- **Logs**: System logs and activity tracking

## Authentication Flow

The application implements a secure authentication flow with:
- Username/email & password login
- Session-based authentication
- Password hashing with secure algorithms
- Registration with email validation
- Protected routes for authenticated users only

## Platform Integration

Connect with various educational platforms:
1. Go to Settings → Integrations
2. Select platform provider
3. Authenticate with platform credentials
4. Sync courses and deadlines

## UI Adaptation

The Adaptive UI color scheme changes based on:
- User's current mood selection
- Time of day (automatic suggestions)
- Personal preferences

Available mood themes:
- **Neutral** (Blue): Default balanced theme
- **Calm** (Teal): Soothing for evening study
- **Focused** (Purple): Enhanced concentration
- **Energetic** (Orange): Creative morning sessions

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: React Context API, TanStack Query
- **Authentication**: Passport.js, session cookies
- **UI Components**: shadcn/ui, Lucide icons
- **Analytics**: Recharts for data visualization

## Mobile Support

A companion mobile application is available for iOS and Android:
- Cross-platform using React Native
- Shares backend API with web version
- Offline support with AsyncStorage
- Push notifications for mobile devices

## License

This project is licensed under the MIT License - see the LICENSE file for details.