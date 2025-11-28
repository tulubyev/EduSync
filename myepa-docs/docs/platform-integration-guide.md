# Platform Integration Guide

This guide explains how to connect external learning platforms to your account, sync courses, and manage platform integrations.

## Introduction

The platform integration feature allows you to:
- Connect to external learning platforms like Coursera, Udemy, edX, and others
- Automatically import course information
- Sync deadlines and schedules
- Track progress across all your platforms in one place

## Supported Platforms

Currently, the following platforms are supported:

| Platform | Available Data | Authentication Method |
|----------|---------------|----------------------|
| Coursera | Courses, deadlines, progress | OAuth |
| Udemy | Courses, progress | API key |
| edX | Courses, deadlines | OAuth |
| Khan Academy | Courses, progress | OAuth |
| LinkedIn Learning | Courses | API key + OAuth |
| Pluralsight | Courses, paths, progress | API key |
| Codecademy | Courses, paths | OAuth |
| YouTube Learning | Playlists | OAuth |

## Connection Process

### Connecting a New Platform

1. **Access Integrations**
   - Log in to your account
   - Navigate to Settings (⚙️)
   - Select the "Integrations" tab

2. **Add Platform**
   - Click the "Connect New Platform" button
   - Select your platform from the dropdown menu

3. **Authentication**
   - For OAuth platforms:
     - Click "Connect"
     - You'll be redirected to the platform login page
     - Authorize our application
     - You'll be redirected back with success message
   
   - For API key platforms:
     - Enter your API key
     - Click "Verify & Connect"

4. **Initial Sync**
   - Once connected, an initial sync will start automatically
   - This may take a few minutes depending on how many courses you have

### Connection Status Indicators

| Status | Meaning |
|--------|---------|
| 🟢 Connected | Platform is connected and syncing properly |
| 🟠 Syncing | Sync in progress |
| 🔴 Error | Connection issue detected |
| ⚪ Disconnected | Platform is disconnected |

## Managing Platform Integrations

### Viewing Connected Platforms

The Integrations tab shows all your connected platforms with:
- Connection status
- Last sync time
- Course count
- Quick actions

### Manual Sync

To manually trigger a sync for a platform:
1. Go to Settings → Integrations
2. Find the platform card
3. Click the "Sync Now" button
4. Wait for the sync to complete

### Sync Frequency

By default, platforms sync automatically according to this schedule:
- Active platforms: Every 12 hours
- Recently used platforms: Every 24 hours
- Rarely used platforms: Every 3 days

You can adjust this for each platform in the advanced settings.

### Disconnecting a Platform

To disconnect a platform:
1. Go to Settings → Integrations
2. Find the platform card
3. Click the "Disconnect" button
4. Confirm the disconnection

Note: Disconnecting will not delete any imported courses or data, but they will no longer update automatically.

## Platform-Specific Instructions

### Coursera

**Authentication Type**: OAuth

**Required Permissions**:
- View basic profile
- View course enrollments
- View course progress

**Step-by-Step**:
1. Click "Connect" for Coursera
2. Log in to your Coursera account
3. Approve the permissions request
4. You'll be redirected back to the application

### Udemy

**Authentication Type**: API Key

**Required Information**:
- Udemy API Client ID
- Udemy API Client Secret

**Where to Find Your API Key**:
1. Log in to [Udemy Developer Portal](https://www.udemy.com/instructor/api/)
2. Create a new API client
3. Copy the Client ID and Client Secret
4. Enter these in the connection form

### LinkedIn Learning

**Authentication Type**: API Key + OAuth

**Required Information**:
- LinkedIn Learning API Key
- Organization ID (for enterprise accounts)

**Step-by-Step**:
1. Enter your API Key
2. Click "Next"
3. Complete LinkedIn OAuth flow
4. Confirm permissions

## Troubleshooting Connection Issues

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "Authentication failed" | Check your API key or login credentials and try again |
| "Connection timeout" | The platform may be experiencing high load, try again later |
| "Invalid permissions" | Make sure you've granted all required permissions |
| "API limit reached" | Wait for rate limits to reset, typically within an hour |
| "Sync stuck at X%" | Cancel and restart the sync |

### Refreshing OAuth Tokens

If your OAuth connection shows errors:
1. Go to the platform card
2. Click "Reconnect"
3. Complete the OAuth flow again

### Platform Connection Logs

To view detailed connection logs:
1. Go to Settings → Integrations
2. Find the platform card
3. Click "View Logs"
4. Check the error details

## Best Practices

- **Connect active platforms first**: Focus on platforms you're currently using
- **Schedule syncs during off-hours**: Set custom sync times for better performance
- **Review permissions carefully**: Only grant the permissions you're comfortable with
- **Periodically verify connections**: Check your integrations page monthly
- **Update credentials when changed**: If you change your platform password, reconnect the integration

## Data Privacy

- Platform credentials are encrypted and stored securely
- We only access the minimum data required to sync your courses
- Personal information is never shared with third parties
- You can request data deletion at any time

## Getting Help

If you encounter any issues with platform connections:
1. Check this guide for common solutions
2. Review the connection logs
3. Contact support via help@eduplatform.com with details of the issue

This guide will be updated as new platforms are added and features are enhanced.