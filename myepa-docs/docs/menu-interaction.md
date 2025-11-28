# Menu Interaction Flow Documentation

This document provides a comprehensive overview of how menu interactions work in the educational course platform, including the sidebar navigation, header menu, and detailed click paths for essential user flows.

## Primary Navigation Components

### Sidebar Navigation
The sidebar provides the main navigation structure for the application, consisting of:

```
┌────────────────────────────┐
│ Logo & App Name            │
├────────────────────────────┤
│ 🏠 Dashboard               │ → /
├────────────────────────────┤
│ 📚 Courses                 │ → /courses
├────────────────────────────┤
│ ⏰ Deadlines               │ → /deadlines
├────────────────────────────┤
│ 📝 Notes                   │ → /notes
├────────────────────────────┤
│ 📊 Analytics               │ → /analytics
├────────────────────────────┤
│ ⚙️ Settings                │ → /settings
├────────────────────────────┤
│ 👨‍💼 Admin Panel           │ → /admin-panel
│ (Admin users only)         │
└────────────────────────────┘
```

### Header Navigation
The top header bar provides secondary navigation and user-specific actions:

```
┌───────────────────────────────────────────────────────────────────────┐
│ 🔍 Search | 🔔 Notifications | 👤 User Menu (Profile, Settings, Logout) │
└───────────────────────────────────────────────────────────────────────┘
```

## Complete Click Paths for Common User Flows

### 1. Logging In
```
1. Start at: /auth
2. Enter credentials in login form
3. Click "Login" button
4. System authenticates user
5. Toast notification confirms login
6. Redirect to: / (Dashboard)
```

### 2. Adding a New Course
```
1. Start at: / (Dashboard)
2. Navigate to: /courses (Sidebar → Courses)
3. Click "+ Add Course" button
4. Fill course details form
5. Click "Save" button
6. System creates course
7. Toast notification confirms creation
8. Redirect to: /courses/:id (New course detail page)
```

### 3. Setting a Deadline
```
1. Start at: / (Dashboard)
2. Navigate to: /deadlines (Sidebar → Deadlines)
3. Click "+ Add Deadline" button
4. Fill deadline details (date, time, name, associated course)
5. Click "Save" button
6. System creates deadline
7. Toast notification confirms creation
8. Calendar view updates with new deadline
```

### 4. Changing Theme Preferences
```
1. Start at: Any page
2. Navigate to: /settings (Sidebar → Settings)
3. Click "Appearance" tab
4. Select mood option (Neutral, Calm, Focused, Energetic)
5. Click "Save Preferences" button
6. System updates theme
7. Toast notification confirms change
8. UI updates with new color scheme
```

### 5. Connecting a Learning Platform
```
1. Start at: Any page
2. Navigate to: /settings (Sidebar → Settings)
3. Click "Integrations" tab
4. Click "Connect New Platform" button
5. Select platform from dropdown
6. Enter platform credentials
7. Click "Connect" button
8. System creates connection
9. Toast notification confirms connection
10. Platform appears in "Connected Platforms" list
```

### 6. Admin User Management
```
1. Start at: Any page
2. Navigate to: /admin-panel (Sidebar → Admin Panel)
3. Click "Users" tab
4. View user list
5. Click on specific user row
6. View user details sidebar
7. Make changes to user status or permissions
8. Click "Save Changes" button
9. System updates user
10. Toast notification confirms changes
```

## Responsive Menu Behavior

The application adapts its menu structure based on screen size:

### Desktop (1024px+)
- Full expanded sidebar with labels
- Horizontal header with all items visible

### Tablet (768px - 1023px)
- Collapsible sidebar (initially collapsed to icons only)
- Click hamburger icon to expand
- Header remains horizontal but may condense some items

### Mobile (< 768px)
- Sidebar transforms to bottom navigation bar
- Only essential icons shown
- Header simplifies to hamburger menu
- User menu becomes a full-screen overlay

## Menu State Management

The menu state is managed through:

```
┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │
│ useMenuState Hook   │────►│  MenuContext        │
│                     │     │                     │
└─────────────────────┘     └─────────────────────┘
           │                           │
           │                           │
           ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ SidebarComponent    │     │ HeaderComponent     │
│                     │     │                     │
└─────────────────────┘     └─────────────────────┘
```

Key menu state variables:
- `isSidebarExpanded`: Controls sidebar expanded/collapsed state
- `activeMenuItem`: Tracks currently selected menu item
- `isUserMenuOpen`: Controls user dropdown menu visibility
- `isNotificationsOpen`: Controls notification panel visibility

## Route Protection and Menu Access Control

Menu items visibility is controlled based on:
- Authentication status (logged in vs. logged out)
- User role (regular user vs. admin)
- Subscription status (free vs. premium features)

Example protection logic for Admin Panel:
```jsx
{user && user.isAdmin && (
  <SidebarItem
    icon={<UserCog />}
    label="Admin Panel"
    to="/admin-panel"
    isActive={pathname === '/admin-panel'}
  />
)}
```

## Keyboard Navigation

The application supports keyboard navigation throughout menus:
- Tab: Navigate between menu items
- Enter/Space: Select current menu item
- Esc: Close open menus/dropdowns
- Arrow keys: Navigate within dropdown menus

## Menu-related Events and Callbacks

Common menu interaction events:
- `onMenuItemClick`: Handles menu item selection
- `onMenuToggle`: Toggles sidebar expanded/collapsed state
- `onUserMenuToggle`: Opens/closes user dropdown menu
- `onNotificationsToggle`: Opens/closes notifications panel

## Menu Animation and Transitions

Transitions used for menu interactions:
- Sidebar expand/collapse: 300ms transition with easing
- Dropdown menus: 200ms fade + transform animation
- Mobile menu overlay: 350ms slide-in transition

This document serves as a comprehensive reference for all menu interactions within the application. It should be updated as menu structures or interaction patterns change.