# Authentication System Documentation

This document outlines the authentication system implemented in the educational course platform, including login, registration, session management, and security considerations.

## Overview

The application uses a secure session-based authentication system that:
- Stores user credentials securely with password hashing
- Maintains user sessions for persistent login
- Provides protected routes with access control
- Handles authentication errors gracefully

## Authentication Endpoints

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/register` | POST | Create new user account | `{username, email, password}` | User object |
| `/api/login` | POST | Authenticate existing user | `{username, password}` | User object |
| `/api/logout` | POST | End user session | None | Success message |
| `/api/user` | GET | Get current user data | None | User object or 401 |

## Authentication Flow

### Registration Process
1. User enters registration details (username, email, password)
2. Client validates inputs and submits to `/api/register`
3. Server validates data using Zod schema
4. Server checks if username or email already exists
5. If unique, password is hashed with scrypt + salt
6. User record created in database
7. Session is created automatically
8. User object returned (excluding password)

### Login Process
1. User enters credentials (username, password)
2. Client validates inputs and submits to `/api/login`
3. Server retrieves user by username
4. Server compares password hash using timing-safe comparison
5. If match, session is created with user ID
6. User object returned (excluding password)

### Session Management
- Sessions are stored server-side (database for production, memory for development)
- Client receives session cookie (httpOnly, secure in production)
- Session expiry set to 14 days by default
- Sessions can be invalidated on password change

### Logout Process
1. Client sends request to `/api/logout`
2. Server destroys the session
3. Success confirmation returned
4. Client redirects to login page

## Password Security

- Passwords are never stored in plaintext
- Passwords are hashed using scrypt with unique salt per user
- Hash comparison uses timing-safe equality check to prevent timing attacks
- Password requirements:
  - Minimum 8 characters
  - Recommend mix of letters, numbers, symbols

## Protected Routes

- All API routes except authentication endpoints require an authenticated session
- Client-side routes use ProtectedRoute component to redirect unauthenticated users
- Admin routes have additional authorization checks

## Error Handling

| Error Scenario | Response | UI Behavior |
|----------------|----------|-------------|
| Invalid credentials | 401 Unauthorized | Error toast with "Invalid username or password" |
| Username taken | 400 Bad Request | Error toast with "Username already exists" |
| Session expired | 401 Unauthorized | Redirect to login with "Session expired" message |
| Missing fields | 400 Bad Request | Form validation errors |

## Demo Credentials

For testing purposes, the following demo accounts are available:

| Username | Email | Password | Role |
|----------|-------|----------|------|
| demo | demo@example.com | password | Regular user |
| admin | admin@example.com | admin123 | Administrator |
| test2 | test2@example.com | password123 | Regular user |
| alt | alt@yachtdeck.ru | owerktoo | Regular user |

## Security Considerations

- CSRF protection implemented via same-site cookies
- Rate limiting on authentication endpoints prevents brute force attacks
- Sessions invalidated on suspicious activity
- Failed login attempts are logged

## Implementation Details

The authentication system is implemented using:

- Passport.js for authentication middleware
- express-session for session management
- crypto module for password hashing
- connect-pg-simple for PostgreSQL session storage
- React Context for client-side auth state management

## Troubleshooting

Common authentication issues:

1. **Can't login with correct credentials**
   - Check case sensitivity on username
   - Verify database connection
   - Check for cookie blocking in browser

2. **Session expires too quickly**
   - Verify session configuration
   - Check for browser cookie clearing
   - Ensure proper HTTPS configuration

3. **Redirect loops**
   - Check ProtectedRoute implementation
   - Verify authentication state synchronization
   - Clear browser cookies and try again