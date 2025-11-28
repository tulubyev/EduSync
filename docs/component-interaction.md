# Component Interaction Diagram

This document outlines how different components in the application interact with each other, focusing on data flow and state management.

## Authentication Flow Components

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                 │     │                  │     │                  │
│   AuthProvider  │◄────┤   AuthContext    │◄────┤    useAuth()     │
│                 │     │                  │     │                  │
└────────┬────────┘     └──────────────────┘     └──────────────────┘
         │                                                 ▲
         │                                                 │
         ▼                                                 │
┌─────────────────┐                               ┌────────┴─────────┐
│  loginMutation  │                               │                  │
│ registerMutation│                               │   AuthPage.tsx   │
│ logoutMutation  │                               │                  │
└─────────────────┘                               └──────────────────┘
```

## Adaptive UI Components

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│ AdaptiveThemeProvider◄────┤   ThemeContext      │◄────┤  useAdaptiveTheme() │
│                     │     │                     │     │                     │
└──────────┬──────────┘     └─────────────────────┘     └─────────────────────┘
           │                                                      ▲
           │                                                      │
           ▼                                                      │
┌─────────────────────┐                              ┌────────────┴────────────┐
│  updateTheme()      │                              │                         │
│  updateMood()       │                              │      Settings.tsx       │
│  (Theme functions)  │                              │    (Appearance Tab)     │
└──────────┬──────────┘                              └─────────────────────────┘
           │
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  localStorage       │     │                     │
│  (Client storage)   │     │  /api/users/theme   │
│                     │     │  (Server storage)   │
└─────────────────────┘     └─────────────────────┘
```

## Navigation Components

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│      App.tsx        │◄────┤     Router          │◄────┤  Protected Routes   │
│                     │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
                                                                  ▲
                                                                  │
                                                                  ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│    Header Nav       │     │    SideBar Nav      │     │   Auth Redirects    │
│                     │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

## Data Flow in Settings Page

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Tab Selection │────►│ Form Management │────►│  Form Submission│
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                ┌─────────────────────┐
                                                │                     │
                                                │  API Request        │
                                                │                     │
                                                └─────────┬───────────┘
                                                          │
                                                          ▼
┌─────────────────────┐                         ┌─────────────────────┐
│                     │                         │                     │
│  Update UI State    │◄────────────────────────┤  Toast Notification │
│                     │                         │                     │
└─────────────────────┘                         └─────────────────────┘
```

## Notification System

```
┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │
│  Push Notification  │     │  Email Notification │
│    (Browser API)    │     │   (Server-side)     │
└──────────┬──────────┘     └──────────┬──────────┘
           │                            │
           │                            │
           ▼                            ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│ Notification Service│────►│ Notification Panel  │────►│ Notification Actions│
│                     │     │   (Header UI)       │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

## Global State Management

```
┌─────────────────────┐
│                     │
│  React Context API  │
│                     │
└──────────┬──────────┘
           │
           │
           ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Auth State    │     │  Theme State    │     │  Offline State  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
           │                    │                       │
           │                    │                       │
           ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    Component Tree                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## API Interaction Pattern

```
┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │
│ React Query Hooks   │────►│ API Request Handler │
│                     │     │                     │
└─────────────────────┘     └──────────┬──────────┘
                                        │
                                        │
                                        ▼
┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │
│    Cache Updates    │◄────┤   Server Response   │
│                     │     │                     │
└─────────────────────┘     └─────────────────────┘
           │
           │
           ▼
┌─────────────────────┐
│                     │
│    UI Updates       │
│                     │
└─────────────────────┘
```

## Form Handling

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│  useForm() Hook     │────►│ Form State/Fields   │────►│    Form Validation  │
│                     │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └──────────┬──────────┘
                                                                   │
                                                                   │
                                                                   ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│ Form Error Handling │◄────┤  Form Submission    │◄────┤ Submit Handler      │
│                     │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

This document provides a high-level overview of component interactions and data flow patterns in the application. It serves as a reference for understanding how different parts of the application communicate with each other.