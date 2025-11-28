# Testing and Authentication Guide

This document provides guidelines for testing the educational course platform, including authentication procedures, test accounts, and common troubleshooting steps.

## Authentication Testing

### Available Test Accounts

The following test accounts are available for immediate use:

| Username | Email | Password | Role |
|----------|-------|----------|------|
| demo | demo@example.com | password | Regular user |
| admin | admin@example.com | admin123 | Administrator |
| test2 | test2@example.com | password123 | Regular user |
| alt | alt@yachtdeck.ru | owerktoo | Regular user |

### Login Process

1. Navigate to `/auth` or go to the application root if not authenticated
2. Enter a username from the table above in the "Email or Username" field
3. Enter the corresponding password in the "Password" field
4. Click the "Login" button
5. After successful authentication, you will be redirected to the dashboard

### Checking Authentication Status

You can check your current authentication status by:

1. Looking for your username in the top-right user menu
2. Inspecting browser console logs (look for authentication-related messages)
3. Attempting to access a protected route - if redirected to `/auth`, you are not authenticated

### Common Authentication Issues

| Issue | Potential Cause | Solution |
|-------|----------------|----------|
| Login button doesn't respond | JavaScript error | Check browser console for errors |
| "Invalid credentials" error | Incorrect username or password | Verify credentials against the test account table |
| Session expired message | Inactive for too long | Re-login with your credentials |
| Redirect loops | Authentication state mismatch | Clear browser cookies and cache, then try again |
| Server error on login | Backend issue | Check server logs and restart the application |

## Testing Features by Role

### Regular User Testing

Regular user accounts can test:

- Course viewing and management
- Deadline tracking
- Note taking
- Analytics and progress visualization
- Platform integration
- Theme and appearance settings

### Administrator Testing

Administrator accounts can additionally test:

- User management (view all users)
- System message sending
- Payment tracking
- System log viewing
- User activity monitoring

## Testing Environment Differences

### Development Environment

- Authentication sessions may expire more quickly
- Debug messages in console provide additional information
- Performance may be slower than production

### Production Environment

- Longer session duration
- Stricter security measures
- Optimized performance

## Automated Tests

The application includes several automated tests that can be run to verify functionality:

```bash
# Run all tests
npm test

# Run authentication-specific tests
npm test -- --testPathPattern=auth

# Run with coverage report
npm test -- --coverage
```

## Manual Testing Checklist

### Authentication

- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should show error)
- [ ] Register new account
- [ ] Log out
- [ ] Access protected page while logged out (should redirect)

### Course Management

- [ ] View course list
- [ ] Add new course
- [ ] Edit existing course
- [ ] Delete course
- [ ] Track progress on course

### Settings

- [ ] Change theme preferences
- [ ] Update notification settings
- [ ] Connect platform integration
- [ ] Update profile information

## Troubleshooting Authentication

### Reset User Session

If you encounter persistent authentication issues, try:

1. Log out if possible
2. Clear browser cookies for the application domain
3. Restart the browser
4. Try logging in again

### Server-Side Session Reset

For development environments, you can reset sessions by:

1. Stopping the server
2. Restarting the server with `npm run dev`
3. Attempting login again

### Browser Console Debugging

The application logs authentication information to the browser console. To view:

1. Open browser developer tools (F12 or right-click → Inspect)
2. Go to the Console tab
3. Look for messages prefixed with `[useAuth]` or `Authentication`
4. Green success messages indicate proper authentication
5. Red error messages indicate authentication problems

## Security Notes

- For security reasons, passwords are never logged in plain text
- Failed login attempts are logged for security monitoring
- In a production environment, multiple failed attempts may result in temporary lockout