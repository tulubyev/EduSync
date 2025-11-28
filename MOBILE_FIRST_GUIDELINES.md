# Mobile-First Development Guidelines for My EPA

**Purpose:** Ensure all desktop (web) development is compatible with future iOS/Android portability via React Native.

**Last Updated:** November 28, 2025

---

## 1. ARCHITECTURE PRINCIPLES

### 1.1 Separation of Concerns

**Server-Side (Portable):**
- Business logic → `/server/services/`
- Data models → `/shared/schema.ts`
- API endpoints → `/server/routes/`
- Authentication → `/server/services/UserService.ts`

**Client-Side (Platform-Specific):**
- Web UI → `/client/src/components/`
- Mobile UI → `/mobile/src/screens/`
- Styling → Web (CSS/Tailwind) vs Mobile (React Native styles)

### 1.2 Data Flow Architecture

```
Mobile App (React Native) ──┐
                            │
Web Browser (React)    ─────┼──→  Express.js Backend  ──→  PostgreSQL
                            │
Web Admin Panel        ─────┘
```

**Key Rule:** All three clients communicate via REST API. Never share database connections between clients.

---

## 2. CODING GUIDELINES

### 2.1 API Endpoints

✅ **GOOD:** Create RESTful endpoints in `/server/routes/`

```typescript
// server/routes/courses.ts
router.get('/api/courses', requireAuth, async (req, res) => {
  const courses = await courseService.getUserCourses(req.user.id);
  res.json(courses); // Mobile and web both receive same data
});

router.post('/api/courses/:id/progress', requireAuth, async (req, res) => {
  const progress = await courseService.updateProgress(req.user.id, req.params.id, req.body);
  res.json(progress);
});
```

❌ **BAD:** Direct database queries in React components

```typescript
// DON'T DO THIS - Won't work on mobile
const courses = await db.query('SELECT * FROM courses WHERE user_id = ?');
```

### 2.2 Data Models

✅ **GOOD:** Define in shared schema

```typescript
// shared/schema.ts
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  title: varchar("title").notNull(),
  platform: varchar("platform").notNull(),
  progress: decimal("progress", { precision: 3, scale: 2 }).default("0"),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Both web and mobile import this
import { courses } from '@shared/schema';
```

### 2.3 State Management

✅ **GOOD:** Use Redux/MobX (works on both web and mobile)

```typescript
// store/slices/courses.slice.ts - Shared between web and mobile
import { createSlice } from '@reduxjs/toolkit';

const coursesSlice = createSlice({
  name: 'courses',
  initialState: { items: [], loading: false },
  reducers: {
    setCourses: (state, action) => { state.items = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; },
  }
});
```

❌ **BAD:** Using browser-specific APIs in shared code

```typescript
// DON'T - localStorage only works in browsers
localStorage.setItem('courses', JSON.stringify(courses));
// Mobile uses AsyncStorage or SQLite
```

### 2.4 Authentication

✅ **GOOD:** Server-side tokens + API auth

```typescript
// server/routes/auth.ts
router.post('/api/auth/login', async (req, res) => {
  const user = await authService.verifyCredentials(req.body);
  const token = jwt.sign({ userId: user.id }, SECRET);
  res.json({ token }); // Both web and mobile use this token
});

// Web stores in secure cookie / Mobile stores in Keychain
```

### 2.5 Error Handling

✅ **GOOD:** Consistent error responses

```typescript
// Server sends standardized errors
res.status(400).json({
  error: 'VALIDATION_ERROR',
  message: 'Invalid email format',
  details: { email: 'Must be valid email' }
});

// Both web and mobile parse consistently
const error = response.data.error; // 'VALIDATION_ERROR'
```

---

## 3. TECHNOLOGY CHOICES

### 3.1 DO Use (Mobile-Compatible)

| Technology | Web | Mobile | Notes |
|------------|-----|--------|-------|
| React | ✅ | ✅ | Core framework |
| TypeScript | ✅ | ✅ | Shared types |
| REST API | ✅ | ✅ | HTTP communication |
| Redux/MobX | ✅ | ✅ | State management |
| JWT Auth | ✅ | ✅ | Stateless auth |
| PostgreSQL | ✅ Backend only | ✅ Backend only | Shared database |
| HTTPS | ✅ | ✅ | Security |

### 3.2 DON'T Use (Not Mobile-Compatible)

| Technology | Reason |
|------------|--------|
| ❌ localStorage | Use secure storage service abstraction |
| ❌ window.* APIs | Use service layer |
| ❌ document.* APIs | Will not exist on mobile |
| ❌ CSS Modules | Mobile uses React Native styles |
| ❌ Socket.io | Use REST polling or WebSockets abstraction |
| ❌ WebGL | Complex, not mobile-ready |
| ❌ Browser tabs communication | Will not work on mobile |

---

## 4. FEATURE DEVELOPMENT CHECKLIST

When adding a new feature, verify:

### Backend (Server)
- [ ] New endpoints in `/server/routes/`
- [ ] Business logic in `/server/services/`
- [ ] Database schema in `/shared/schema.ts`
- [ ] Error handling follows convention
- [ ] Endpoints tested with curl/Postman
- [ ] Authentication required where needed

### Web UI
- [ ] Components in `/client/src/components/`
- [ ] Responsive design (mobile viewport test)
- [ ] API integration uses service layer
- [ ] No hardcoded localhost URLs
- [ ] Proper loading/error states
- [ ] Works on devices < 480px wide

### Mobile Preparation (Document)
- [ ] [ ] "Mobile TODO: Adapt component for React Native"
- [ ] [ ] "Mobile TODO: Test API endpoint"
- [ ] [ ] "Mobile TODO: Handle offline sync"

### Testing
- [ ] Manual test on mobile viewport (DevTools)
- [ ] Network throttling test (slow 3G)
- [ ] API endpoint works from mobile user perspective
- [ ] Error scenarios handled

---

## 5. EXAMPLE: Adding a New Feature (Mobile-Aware)

### Feature: "Course Notes"

#### Step 1: Backend (Server)

```typescript
// shared/schema.ts - Add data model
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  courseId: uuid("course_id").references(() => courses.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// server/routes/notes.ts - Create endpoints
router.get('/api/notes/:courseId', requireAuth, async (req, res) => {
  const notes = await noteService.getByCoursee(req.user.id, req.params.courseId);
  res.json(notes); // Both web and mobile call this
});

router.post('/api/notes', requireAuth, async (req, res) => {
  const note = await noteService.create(req.user.id, req.body);
  res.json(note);
});
```

#### Step 2: Web UI

```typescript
// client/src/components/NotesPanel.tsx - Responsive component
export function NotesPanel({ courseId }: { courseId: string }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchNotes();
  }, [courseId]);
  
  const fetchNotes = async () => {
    const response = await fetch(`/api/notes/${courseId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotes(await response.json());
    setLoading(false);
  };
  
  // Responsive layout
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {notes.map(note => (
        <div key={note.id} className="p-4 border rounded">{note.content}</div>
      ))}
    </div>
  );
}
```

#### Step 3: Mobile Implementation (Later)

```typescript
// mobile/src/screens/NotesScreen.tsx - Will adapt web logic
export function NotesScreen({ route }: any) {
  const [notes, setNotes] = useState([]);
  
  useEffect(() => {
    fetchNotes();
  }, [route.params.courseId]);
  
  const fetchNotes = async () => {
    // Same API endpoint!
    const response = await apiService.get(`/api/notes/${route.params.courseId}`);
    setNotes(response.data);
  };
  
  // Mobile layout (React Native)
  return (
    <FlatList
      data={notes}
      renderItem={({ item }) => (
        <View style={styles.noteCard}>
          <Text>{item.content}</Text>
        </View>
      )}
    />
  );
}
```

---

## 6. DOCUMENTATION REQUIREMENTS

When adding new features, document:

### In Code Comments
```typescript
/**
 * Get user courses
 * 
 * Portable: YES - Used by web and mobile
 * API: GET /api/courses
 * Auth: Required (JWT or session)
 * Response: { id, title, platform, progress, deadline }
 * 
 * Mobile Implementation: 
 * - mobile/src/screens/CourseListScreen.tsx
 * - Adapt to React Native FlatList
 * - Handle offline caching via SQLite
 */
```

### In Code File
- Mark non-portable code with `// DESKTOP-ONLY:`
- Mark portable code with `// PORTABLE: Web + Mobile`

---

## 7. PERFORMANCE CONSIDERATIONS FOR MOBILE

### Network
- Minimize API responses
- Implement pagination (not all 10,000 courses at once)
- Support compression (gzip)

### Battery/Data
- Implement background sync (mobile-specific)
- Cache aggressively (24-hour cache on mobile)
- Batch requests

### Example: Pagination

```typescript
// server/routes/courses.ts
router.get('/api/courses', requireAuth, async (req, res) => {
  const limit = parseInt(req.query.limit || '20');
  const offset = parseInt(req.query.offset || '0');
  
  const courses = await courseService.getUserCourses(
    req.user.id, 
    { limit, offset }
  );
  
  res.json({
    data: courses,
    total: await courseService.countUserCourses(req.user.id),
    limit,
    offset
  });
});

// Both web and mobile now support pagination
// web: page 1, 2, 3...
// mobile: infinite scroll with offset
```

---

## 8. REVIEW CHECKLIST FOR PRs

Before merging any feature:

- [ ] All business logic is server-side
- [ ] Database models use shared schema
- [ ] API endpoints are RESTful
- [ ] No browser-specific APIs in shared code
- [ ] Responsive design verified
- [ ] Error handling consistent
- [ ] Code documented for mobile portability
- [ ] Mobile TODO comments added if needed

---

## 9. RESOURCES

- **Mobile Architecture:** See `MOBILE_ARCHITECTURE.md`
- **Shared Schema:** See `shared/schema.ts`
- **API Examples:** See `server/routes/`
- **Web Components:** See `client/src/components/`

---

**Remember:** Every line of code written today might run on iOS or Android tomorrow!
