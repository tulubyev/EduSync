# Navigation Schema for Educational Course Platform

This document outlines all navigation paths, transitions between pages, and interaction points within the application. Use this as a reference for understanding the application's user flow and navigation structure.

## User Authentication Flows

### Authentication Entry Points
- **Initial Entry**: Unauthenticated users are redirected to `/auth`
- **Login/Registration**: `/auth` page with togglable tabs
- **Logout Flow**: User → Logout button → Confirmation → `/goodbye` page → Redirect to `/auth` after 3 seconds

### Authentication State Transitions
```
Unauthenticated → Login/Register Form → Authentication Success → Home Dashboard
Authentication Success → Toast notification (3 seconds) → Redirect to Home
Authentication Failure → Error toast → Stay on Auth page
```

## Main Navigation Structure

### Primary Navigation (Sidebar)
- **Dashboard** (`/home`, `/`): Main landing page after authentication
- **Courses** (`/courses`): Course listing and management
- **Deadlines** (`/deadlines`): Calendar view and deadline management
- **Notes** (`/notes`): Course notes management
- **Analytics** (`/analytics`): Progress visualization
- **Settings** (`/settings`): User preferences and account management
- **Admin Panel** (`/admin-panel`): Admin-only section for system management

### Header Navigation
- **User Profile**: Opens account settings dropdown
- **Notifications**: Opens notifications panel
- **Search**: Global search functionality
- **Help**: Opens help documentation

## Page-to-Page Transitions

### Dashboard (`/home`)
- **Course Cards** → Individual course detail page (`/courses/:id`)
- **Upcoming Deadlines** → Deadlines section (`/deadlines`)
- **Recent Activities** → Relevant course or note page
- **Quick Stats** → Analytics page (`/analytics`)

### Courses Section (`/courses`)
- **Course Listing** → Individual course (`/courses/:id`)
- **Course Detail** → Back to course listing
- **Add New Course** → Course creation form
- **Course Card Actions**:
  - View → Course detail
  - Edit → Course edit form
  - Progress → Progress tracking interface
  - Delete → Confirmation dialog → Courses listing

### Settings Page (`/settings`)
- **Tab Navigation**:
  - Account: User profile information
  - Notifications: Notification preferences
  - Appearance: Theme and display settings
    - Theme selection (Light/Dark/System)
    - Color scheme selection
    - Mood-based UI adaptation (Neutral/Calm/Focused/Energetic)
  - Privacy: Privacy settings
  - Integrations: Platform connections
  - Help & Support: Documentation and support

### Admin Panel (`/admin-panel`)
- **Tab Navigation**:
  - Users: User management
  - Messages: System message management
  - Payments: Payment and subscription oversight
  - Logs: System logs and activity

## UI Component Interaction Flows

### Mood Selection (Appearance Tab)
```
Settings → Appearance Tab → Mood Theme Section → Select Mood Option → 
Apply Changes → Update Theme Context → Update UI Colors → Save Preferences
```

### Platform Integration
```
Settings → Integrations Tab → Add Platform → Select Platform → 
Authorization Flow → Connection Confirmation → Sync Courses
```

### Course Management
```
Dashboard → Courses → Add Course → Fill Form → Save → 
Course Listing → Course Detail View
```

### Push Notifications
```
Header → Notification Bell → Notification Panel → 
Notification Item → Relevant Page (Course/Deadline/Note)
```

## Protected Routes
All routes except `/auth`, `/logout`, `/goodbye`, and error pages require authentication.
Protection logic:
```
Page Request → Check Authentication → 
If Authenticated → Render Page
If Not Authenticated → Redirect to /auth
```

## Error and Edge Cases
- **Not Found (404)**: Invalid routes → Not Found page with return home option
- **Unauthorized (401)**: Protected content → Redirect to Auth
- **Session Expiry**: Auth check fails → Redirect to Auth with message
- **Form Validation**: Form submission → Validation error → Display inline errors

## Responsive Behavior
- **Desktop**: Full sidebar navigation, expanded view
- **Tablet**: Collapsible sidebar, slightly condensed view
- **Mobile**: Bottom navigation bar, vertical stacking for forms/content

## Time-Based UI Adaptation
The system automatically suggests mood themes based on time of day:
- **Morning (5am-9am)**: Energetic theme
- **Daytime (9am-5pm)**: Focused theme
- **Evening (5pm-10pm)**: Calm theme
- **Night (10pm-5am)**: Neutral theme

This navigation schema serves as a comprehensive reference for all user journeys and interaction points within the application. It should be updated as new features are added or existing navigation patterns are modified.