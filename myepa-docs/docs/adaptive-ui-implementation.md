# Adaptive UI Implementation Guide

This document describes the implementation of the Adaptive UI color scheme feature, which changes the application's color theme based on user's mood selection or time of day.

## Overview

The Adaptive UI feature allows users to:
1. Select a mood-based theme (Neutral, Calm, Focused, Energetic)
2. Have the UI automatically suggest theme based on time of day
3. Save preferences persistently

## Components

### 1. AdaptiveThemeProvider (`use-adaptive-theme.tsx`)

A React context provider that:
- Manages theme state
- Provides theme change functions
- Handles time-based theme suggestions
- Persists theme preferences to localStorage and server

```tsx
// Key functionality:
const moodColors = {
  neutral: "hsl(210, 100%, 50%)",  // Default blue
  calm: "hsl(190, 90%, 50%)",      // Calming teal/blue
  focused: "hsl(263, 70%, 50%)",   // Deep purple for focus
  energetic: "hsl(33, 100%, 50%)"  // Vibrant orange for energy
};

// Get time-suggested mood
function getSuggestedMoodByTime() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return 'energetic';  // Morning
  else if (hour >= 9 && hour < 17) return 'focused'; // Work hours
  else if (hour >= 17 && hour < 22) return 'calm';  // Evening
  else return 'neutral';  // Night
}
```

### 2. Settings Page Integration (`settings.tsx`)

The settings page allows users to:
- Select a mood theme visually
- Preview colors
- Save preferences
- Reset to time-based suggestions

```tsx
// The mood selection UI
<div>
  <Label htmlFor="moodTheme" className="font-medium">Mood Theme</Label>
  <p className="text-sm text-gray-500 mb-2">
    Select a mood to adapt the UI color scheme
  </p>
  <div className="grid grid-cols-2 gap-3">
    {/* Neutral option */}
    <div 
      className={`mood-option ${mood === "neutral" ? "selected" : ""}`}
      onClick={() => updateMood("neutral")}
    >
      <Smile className="icon" />
      <span>Neutral</span>
      <span className="description">Default blue theme</span>
    </div>
    
    {/* Other mood options... */}
  </div>
</div>
```

### 3. Server-Side Persistence (`/api/users/theme`)

Endpoint for saving user theme preferences:
- Accepts PATCH requests with themePreferences object
- Merges with existing preferences
- Updates user record
- Returns updated theme

```typescript
app.patch("/api/users/theme", authenticateSession, async (req, res) => {
  try {
    // Get user and theme preferences
    const { themePreferences } = req.body;
    
    // Merge with existing preferences
    const mergedPreferences = {
      ...(existingUser.themePreferences || {}),
      ...themePreferences,
    };
    
    // Update and respond
    const updatedUser = await storage.updateUserThemePreferences(
      req.user.id, 
      mergedPreferences
    );
    
    res.json({ 
      success: true, 
      themePreferences: mergedPreferences 
    });
  } catch (error) {
    // Error handling
  }
});
```

## Implementation Flow

### Initial Loading:
1. `AdaptiveThemeProvider` initializes on app startup
2. Checks localStorage for saved preferences
3. If none exist, suggests mood based on time of day
4. Applies theme to CSS variables
5. When user authenticates, loads server-stored preferences

### Theme Updates:
1. User selects mood in settings
2. Selection triggers `updateMood` from theme context
3. Context updates CSS variables immediately
4. Changes saved to localStorage
5. PATCH request sent to `/api/users/theme`
6. Server updates user record

### Time-Based Updates:
1. On first load, check time of day
2. Suggest appropriate mood
3. Apply only if user has no saved preference

## CSS Implementation

Theme colors are applied via CSS variables:

```css
:root {
  --primary: hsl(210, 100%, 50%);  /* Default blue */
  --primary-dark: hsl(210, 100%, 40%);
  --primary-light: hsl(210, 100%, 60%);
}

/* Applied via JavaScript when theme changes */
document.documentElement.style.setProperty('--primary', themeColor);
```

## Debugging

Common issues and solutions:

1. **Theme not persisting**: Check localStorage and server storage
2. **Colors not updating**: Verify CSS variable application
3. **Time-based suggestions not working**: Check time calculation logic

## Future Enhancements

Potential improvements:

1. Add more mood options
2. Implement AI-based mood suggestions based on user activity
3. Allow custom color selection within mood themes
4. Add theme transitions/animations

## References

- Theme.json structure
- CSS Variables documentation
- React Context API