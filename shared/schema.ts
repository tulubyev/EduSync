import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===========================================
// MY EPA - EDUCATIONAL PLATFORM AGGREGATOR
// Schema for managing online courses from multiple platforms
// ===========================================

// Users table - Core user data
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).unique(), // E.164, необязательный
  country: varchar("country", { length: 2 }), // ISO 3166-1 alpha-2, по нему выбирается контур хранения данных
  // Контур хранения персональных данных (shared/dataRegions.ts): где должны храниться по закону страны и где хранятся
  homeRegion: varchar("home_region", { length: 10 }),
  dataRegion: varchar("data_region", { length: 10 }).notNull().default("ru"),
  profileImageUrl: varchar("profile_image_url", { length: 500 }), // URL to profile image
  profileImage: text("profile_image"), // Base64 encoded WebP image
  role: varchar("role", { length: 20 }).default("user"), // user, admin
  adminRole: varchar("admin_role", { length: 50 }), // super_admin, analytics_admin, devops_admin, etc.
  planType: varchar("plan_type", { length: 20 }).default("free"), // free, premium, pro
  isVerified: boolean("is_verified").default(false),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  isEmailVerified: boolean("is_email_verified").default(false),
  timezone: varchar("timezone", { length: 50 }).default("Europe/Moscow"),
  language: varchar("language", { length: 10 }).default("ru"),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  // Секрет ссылки на ленту .ics (#18, docs/CALENDAR-FEED.md); пусто — ссылки нет
  calendarToken: varchar("calendar_token", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  phoneIdx: index("users_phone_idx").on(table.phone),
  calendarTokenUniq: uniqueIndex("users_calendar_token_uniq").on(table.calendarToken),
}));

// Sessions table - Web sessions for authentication
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userSessionIdx: index("sessions_user_idx").on(table.userId),
  tokenIdx: index("sessions_token_idx").on(table.token),
}));

// Educational Platforms table - Supported learning platforms
export const platforms = pgTable("platforms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(), // coursera, udemy, edx, stepik, etc.
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  logoUrl: varchar("logo_url", { length: 500 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  apiType: varchar("api_type", { length: 20 }), // oauth, api_key, manual
  categoryId: uuid("category_id").references(() => platformCategories.id),
  regionId: uuid("region_id").references(() => platformRegions.id),
  isActive: boolean("is_active").default(true),
  color: varchar("color", { length: 7 }), // hex color for UI
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  codeIdx: index("platforms_code_idx").on(table.code),
  categoryIdx: index("platforms_category_idx").on(table.categoryId),
  regionIdx: index("platforms_region_idx").on(table.regionId),
}));

// Platform Categories table - Categorize platforms
export const platformCategories = pgTable("platform_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(), // it-general, qatesting, art-design, etc.
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).notNull(), // hex color for UI
  icon: varchar("icon", { length: 100 }), // emoji or icon name
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  codeIdx: index("platform_categories_code_idx").on(table.code),
  sortIdx: index("platform_categories_sort_idx").on(table.sortOrder),
}));

// Platform Regions table - Organize platforms by geographic regions
export const platformRegions = pgTable("platform_regions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(), // european, asian, russian, global
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  countries: text("countries").array(), // ['Germany', 'France', 'UK']
  languages: varchar("languages", { length: 500 }), // supported languages
  color: varchar("color", { length: 7 }), // hex color for UI
  icon: varchar("icon", { length: 100 }), // emoji or icon name
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  codeIdx: index("platform_regions_code_idx").on(table.code),
  sortIdx: index("platform_regions_sort_idx").on(table.sortOrder),
}));

// Platform Connections table - User connections to platforms (OAuth tokens)
export const platformConnections = pgTable("platform_connections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  platformId: uuid("platform_id").references(() => platforms.id).notNull(),
  externalUserId: varchar("external_user_id", { length: 255 }), // Stepik user ID, etc.
  accessTokenEncrypted: text("access_token_encrypted"), // Encrypted OAuth access token
  refreshTokenEncrypted: text("refresh_token_encrypted"), // Encrypted OAuth refresh token
  tokenExpiresAt: timestamp("token_expires_at"), // When access token expires
  connectionStatus: varchar("connection_status", { length: 20 }).default("active"), // active, expired, reauth_required, revoked
  syncStatus: varchar("sync_status", { length: 20 }).default("idle"), // idle, syncing, failed
  lastSyncAt: timestamp("last_sync_at"), // Last successful sync timestamp
  lastSyncError: text("last_sync_error"), // Error message from last sync if failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userPlatformIdx: index("platform_connections_user_platform_idx").on(table.userId, table.platformId),
  userIdx: index("platform_connections_user_idx").on(table.userId),
  platformIdx: index("platform_connections_platform_idx").on(table.platformId),
  statusIdx: index("platform_connections_status_idx").on(table.connectionStatus),
}));

// External Courses table - Courses synced from external platforms (Stepik, Coursera, etc.)
export const externalCourses = pgTable("external_courses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  platformId: uuid("platform_id").references(() => platforms.id).notNull(),
  externalCourseId: varchar("external_course_id", { length: 255 }).notNull(), // ID from platform (e.g., Stepik course ID)
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),
  courseUrl: varchar("course_url", { length: 500 }).notNull(), // Link to course on platform
  progress: integer("progress").default(0), // 0-100%
  isCompleted: boolean("is_completed").default(false),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  language: varchar("language", { length: 20 }), // en, ru, etc.
  certificateAvailable: boolean("certificate_available").default(false),
  workload: integer("workload"), // estimated hours per week
  metadata: jsonb("metadata"), // additional data from platform
  externalLastUpdatedAt: timestamp("external_last_updated_at"), // When platform updated this course
  lastSyncedAt: timestamp("last_synced_at"), // When we last synced this course
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userCourseIdx: index("external_courses_user_idx").on(table.userId),
  platformCourseIdx: index("external_courses_platform_idx").on(table.platformId),
  externalIdIdx: index("external_courses_external_id_idx").on(table.externalCourseId),
  userPlatformIdx: index("external_courses_user_platform_idx").on(table.userId, table.platformId),
  userExternalUniq: uniqueIndex("external_courses_user_external_uniq").on(table.externalCourseId, table.userId),
}));

// Course Deadlines table - Deadlines from external platforms
export const courseDeadlines = pgTable("course_deadlines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  externalCourseId: uuid("external_course_id").references(() => externalCourses.id).notNull(),
  platformId: uuid("platform_id").references(() => platforms.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  externalDeadlineId: varchar("external_deadline_id", { length: 255 }), // ID from platform
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  deadlineType: varchar("deadline_type", { length: 50 }), // soft, hard, lesson, section, etc.
  metadata: jsonb("metadata"), // additional deadline data
  externalLastUpdatedAt: timestamp("external_last_updated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  externalCourseIdx: index("course_deadlines_external_course_idx").on(table.externalCourseId),
  userIdx: index("course_deadlines_user_idx").on(table.userId),
  dueDateIdx: index("course_deadlines_due_date_idx").on(table.dueDate),
  platformIdx: index("course_deadlines_platform_idx").on(table.platformId),
}));

// Courses table - User's courses from various platforms
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  platformId: uuid("platform_id").references(() => platforms.id),
  externalCourseId: varchar("external_course_id", { length: 255 }), // ID from the platform
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  instructor: varchar("instructor", { length: 255 }),
  imageUrl: varchar("image_url", { length: 500 }),
  courseUrl: varchar("course_url", { length: 500 }),
  category: varchar("category", { length: 100 }),
  difficulty: varchar("difficulty", { length: 20 }), // beginner, intermediate, advanced
  duration: integer("duration"), // in minutes
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"), // 0-100%
  status: varchar("status", { length: 20 }).default("not_started"), // not_started, in_progress, completed, paused
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  lastAccessedAt: timestamp("last_accessed_at"),
  isFavorite: boolean("is_favorite").default(false),
  cost: decimal("cost", { precision: 10, scale: 2 }), // course cost, null = free
  tags: text("tags").array(), // custom user tags
  metadata: jsonb("metadata"), // additional course data from platform
  // Программа ученика (#17): ручная (manual) или с площадки (код площадки, например stepik) — одна таблица для всех
  source: varchar("source", { length: 50 }).notNull().default("manual"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userCourseIdx: index("courses_user_idx").on(table.userId),
  sourceUniq: uniqueIndex("courses_user_source_external_uniq").on(table.userId, table.source, table.externalCourseId),
  platformCourseIdx: index("courses_platform_idx").on(table.platformId),
  statusIdx: index("courses_status_idx").on(table.status),
  categoryIdx: index("courses_category_idx").on(table.category),
}));

// Deadlines table - Course deadlines and assignments
export const deadlines = pgTable("deadlines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  courseId: uuid("course_id").references(() => courses.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  reminderDate: timestamp("reminder_date"),
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  status: varchar("status", { length: 20 }).default("pending"), // pending, completed, overdue, cancelled
  completedAt: timestamp("completed_at"),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: jsonb("recurring_pattern"), // { type: 'weekly', days: [1,3,5] }
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userDeadlineIdx: index("deadlines_user_idx").on(table.userId),
  courseDeadlineIdx: index("deadlines_course_idx").on(table.courseId),
  dueDateIdx: index("deadlines_due_date_idx").on(table.dueDate),
  statusIdx: index("deadlines_status_idx").on(table.status),
}));

// Learning Events — единая лента ученика: уроки, вебинары, задания, экзамены и дедлайны всех курсов (#17).
// Ручные события и события площадок лежат вместе; создаётся скриптом scripts/sql/2026-10-25-learning-events.sql
export const learningEvents = pgTable("learning_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("deadline"), // lesson, webinar, assignment, exam, deadline
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at").notNull(), // UTC; у дедлайна — срок сдачи
  durationMinutes: integer("duration_minutes"),
  timeZone: varchar("time_zone", { length: 50 }), // пояс, в котором событие задано
  programTitle: varchar("program_title", { length: 500 }),
  moduleTitle: varchar("module_title", { length: 500 }),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
  platformId: uuid("platform_id").references(() => platforms.id, { onDelete: "set null" }),
  lessonUrl: varchar("lesson_url", { length: 1000 }),
  materialsUrl: varchar("materials_url", { length: 1000 }),
  joinUrl: varchar("join_url", { length: 1000 }), // вход на вебинар
  source: varchar("source", { length: 50 }).notNull().default("manual"), // manual или код площадки (stepik, …), ical
  externalId: varchar("external_id", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, cancelled
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, urgent
  completedAt: timestamp("completed_at"),
  reminderAt: timestamp("reminder_at"),
  recordingTaskId: uuid("recording_task_id").references(() => recordingTasks.id, { onDelete: "set null" }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userStartsIdx: index("learning_events_user_starts_idx").on(table.userId, table.startsAt),
  courseIdx: index("learning_events_course_idx").on(table.courseId),
  sourceUniq: uniqueIndex("learning_events_source_uniq").on(table.userId, table.source, table.externalId),
}));

// Отправленные напоминания (#18): ключ — событие, вид, время события и канал; перенос события даёт новое напоминание
export const eventReminders = pgTable("event_reminders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").references(() => learningEvents.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  kind: varchar("kind", { length: 20 }).notNull(), // start, due
  startsAt: timestamp("starts_at").notNull(),
  channel: varchar("channel", { length: 20 }).notNull().default("email"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
}, (table) => ({
  reminderUniq: uniqueIndex("event_reminders_uniq").on(table.eventId, table.kind, table.startsAt, table.channel),
}));

// Library table - User library materials for courses
export const library = pgTable("notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  courseId: uuid("course_id").references(() => courses.id),
  platformId: uuid("platform_id").references(() => platforms.id),
  title: varchar("title", { length: 255 }),
  content: text("content").notNull(),
  resourceUrl: text("resource_url"), // URL to external resource or base64 file data
  lessonNumber: integer("lesson_number"),
  lessonTitle: varchar("lesson_title", { length: 255 }),
  tags: text("tags").array(),
  isPinned: boolean("is_pinned").default(false),
  color: varchar("color", { length: 7 }), // hex color for note card
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userNoteIdx: index("notes_user_idx").on(table.userId),
  courseNoteIdx: index("notes_course_idx").on(table.courseId),
  platformNoteIdx: index("notes_platform_idx").on(table.platformId),
}));

// Study Sessions table - Track study time
export const studySessions = pgTable("study_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  courseId: uuid("course_id").references(() => courses.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in minutes
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userStudyIdx: index("study_sessions_user_idx").on(table.userId),
  courseStudyIdx: index("study_sessions_course_idx").on(table.courseId),
  startTimeIdx: index("study_sessions_start_idx").on(table.startTime),
}));

// User Settings table - User preferences and settings
export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  theme: varchar("theme", { length: 20 }).default("system"), // light, dark, system
  dashboardLayout: jsonb("dashboard_layout"), // custom dashboard widgets
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  deadlineReminders: boolean("deadline_reminders").default(true),
  reminderAdvance: integer("reminder_advance").default(24), // hours before deadline
  weeklyDigest: boolean("weekly_digest").default(true),
  studyGoalMinutes: integer("study_goal_minutes").default(60), // daily goal
  preferredStudyTime: varchar("preferred_study_time", { length: 20 }), // morning, afternoon, evening
  // Удобные и рабочие часы (#48, shared/recordingHints.ts): минуты от полуночи в поясе ученика
  comfortFrom: integer("comfort_from").notNull().default(480),
  comfortTo: integer("comfort_to").notNull().default(1320),
  workFrom: integer("work_from"),
  workTo: integer("work_to"),
  workDays: integer("work_days").array().notNull().default(sql`'{1,2,3,4,5}'`),
  recordingHints: boolean("recording_hints").notNull().default(true),
  // План недели (#20): дни учёбы; минуты в день — studyGoalMinutes, любимое время — preferredStudyTime
  studyDays: integer("study_days").array().notNull().default(sql`'{1,2,3,4,5,6,7}'`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userSettingsIdx: index("user_settings_user_idx").on(table.userId),
}));

// Subscription Plans table - Available subscription plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(), // free, premium, pro
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }).notNull(), // in RUB
  priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }), // discounted yearly price
  features: jsonb("features"), // { maxCourses: 10, analytics: true, etc. }
  maxCourses: integer("max_courses"), // null = unlimited
  maxPlatforms: integer("max_platforms"), // null = unlimited
  hasAnalytics: boolean("has_analytics").default(false),
  hasAdvancedReminders: boolean("has_advanced_reminders").default(false),
  hasPrioritySupport: boolean("has_priority_support").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  codeIdx: index("subscription_plans_code_idx").on(table.code),
  sortIdx: index("subscription_plans_sort_idx").on(table.sortOrder),
}));

// Subscriptions table - User subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  planId: uuid("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: varchar("status", { length: 20 }).default("active"), // active, cancelled, expired, past_due
  billingPeriod: varchar("billing_period", { length: 20 }).default("monthly"), // monthly, yearly
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  cancelledAt: timestamp("cancelled_at"),
  yoomoneyPaymentMethodId: varchar("yoomoney_payment_method_id", { length: 255 }), // saved payment method (YooKassa)
  alfabankPaymentMethodId: varchar("alfabank_payment_method_id", { length: 255 }), // saved payment method (Альфа-Банк)
  paymentProvider: varchar("payment_provider", { length: 50 }).default("yookassa"), // yookassa, alfabank
  autoRenewalEnabled: boolean("auto_renewal_enabled").default(false), // enable automatic recurring payments
  lastPaymentAt: timestamp("last_payment_at"),
  nextPaymentAt: timestamp("next_payment_at"),
  lastAutoPaymentAttemptAt: timestamp("last_auto_payment_attempt_at"), // for tracking retry logic
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userSubIdx: index("subscriptions_user_idx").on(table.userId),
  planSubIdx: index("subscriptions_plan_idx").on(table.planId),
  statusIdx: index("subscriptions_status_idx").on(table.status),
  autoRenewalIdx: index("subscriptions_auto_renewal_idx").on(table.autoRenewalEnabled),
  providerIdx: index("subscriptions_provider_idx").on(table.paymentProvider),
}));

// Payments table - Payment history
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  yoomoneyOperationId: varchar("yoomoney_operation_id", { length: 255 }), // Yoomoney/YooKassa operation ID
  alfabankOrderId: varchar("alfabank_order_id", { length: 255 }), // Альфа-Банк order ID
  paymentProvider: varchar("payment_provider", { length: 50 }).default("yookassa"), // yookassa, alfabank
  yoomoneyLabel: varchar("yoomoney_label", { length: 255 }), // unique payment label
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("RUB"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, completed, failed, refunded
  paymentType: varchar("payment_type", { length: 20 }), // AC=card, PC=wallet, SB=SberPay
  description: text("description"),
  failureReason: text("failure_reason"),
  metadata: jsonb("metadata"), // additional payment data
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userPaymentIdx: index("payments_user_idx").on(table.userId),
  subscriptionPaymentIdx: index("payments_subscription_idx").on(table.subscriptionId),
  yoomoneyOpIdx: index("payments_yoomoney_op_idx").on(table.yoomoneyOperationId),
  labelIdx: index("payments_label_idx").on(table.yoomoneyLabel),
  statusIdx: index("payments_status_idx").on(table.status),
}));

// Recording Tasks table - Scheduled broadcast/lecture recordings
export const recordingTasks = pgTable("recording_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  streamUrl: varchar("stream_url", { length: 1000 }).notNull(),
  streamPassword: varchar("stream_password", { length: 255 }),
  joinName: varchar("join_name", { length: 255 }),
  joinEmail: varchar("join_email", { length: 255 }),
  joinPhone: varchar("join_phone", { length: 50 }),
  scheduledTime: timestamp("scheduled_time").notNull(),
  duration: integer("duration").notNull(), // in minutes
  maxPartDuration: integer("max_part_duration").default(20), // minutes per part
  status: varchar("status", { length: 20 }).default("ready"), // ready, in_progress, uploading, completed, failed, cancelled
  saveTarget: varchar("save_target", { length: 20 }).default("yandex_disk"), // library, yandex_disk, beget
  currentPart: integer("current_part").default(0),
  totalParts: integer("total_parts").default(1),
  parts: jsonb("parts").$type<Array<{
    partNumber: number;
    fileName: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    status: 'pending' | 'recording' | 'uploading' | 'completed' | 'failed';
    yandexPath?: string;
    publicUrl?: string;
    error?: string;
  }>>(),
  playlistUrl: varchar("playlist_url", { length: 1000 }),
  libraryNoteId: uuid("library_note_id").references(() => library.id),
  errorMessage: text("error_message"),
  begetUrl: varchar("beget_url", { length: 1000 }), // URL of video in Beget S3 storage
  s3Prefix: varchar("s3_prefix", { length: 500 }), // S3 path prefix: epa/recordings/{userId}/{taskId}/
  s3Filename: varchar("s3_filename", { length: 255 }), // S3 base filename: {slug}_{YYYY-MM-DD}
  fileSize: integer("file_size"), // Size of the recorded file in bytes
  workerId: varchar("worker_id", { length: 255 }), // ID of Recording Worker that processes this task
  attemptCount: integer("attempt_count").default(0), // Number of retry attempts
  lastHeartbeat: timestamp("last_heartbeat"), // Last heartbeat from worker (for timeout detection)
  metadata: jsonb("metadata"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  urlCheckStatus: varchar("url_check_status", { length: 20 }).default("pending"), // pending, ok, warning, failed
  urlCheckMessage: text("url_check_message"),
  urlCheckedAt: timestamp("url_checked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("recording_tasks_user_idx").on(table.userId),
  statusIdx: index("recording_tasks_status_idx").on(table.status),
  scheduledTimeIdx: index("recording_tasks_scheduled_time_idx").on(table.scheduledTime),
  workerIdx: index("recording_tasks_worker_idx").on(table.workerId),
}));

// Recording Logs table - Detailed event logs for recording tasks
export const recordingLogs = pgTable("recording_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").references(() => recordingTasks.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // task_created, task_started, recording_started, recording_completed, upload_started, upload_completed, upload_failed, browser_error, task_failed, task_cancelled
  partNumber: integer("part_number"), // which part if applicable
  message: text("message").notNull(), // detailed event message
  errorDetails: text("error_details"), // error stack trace or details
  fileSize: integer("file_size"), // bytes uploaded
  duration: integer("duration"), // actual recording duration in ms
  metadata: jsonb("metadata"), // additional event data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  taskIdx: index("recording_logs_task_idx").on(table.taskId),
  userIdx: index("recording_logs_user_idx").on(table.userId),
  eventTypeIdx: index("recording_logs_event_type_idx").on(table.eventType),
  createdAtIdx: index("recording_logs_created_at_idx").on(table.createdAt),
}));

// Recording Worker Status table - Monitor external Recording Worker health
export const recordingWorkerStatus = pgTable("recording_worker_status", {
  workerId: varchar("worker_id", { length: 255 }).primaryKey(),
  isActive: boolean("is_active").default(true),
  dbConnected: boolean("db_connected").default(false),
  s3Connected: boolean("s3_connected").default(false),
  activeTaskId: uuid("active_task_id").references(() => recordingTasks.id),
  currentTaskTitle: varchar("current_task_title", { length: 500 }),
  tasksProcessed: integer("tasks_processed").default(0),
  tasksSuccessful: integer("tasks_successful").default(0),
  tasksFailed: integer("tasks_failed").default(0),
  lastError: text("last_error"),
  lastErrorAt: timestamp("last_error_at"),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  startedAt: timestamp("started_at").defaultNow(),
  buildVersion: varchar("build_version", { length: 100 }),
  metadata: jsonb("metadata"),
}, (table) => ({
  lastSeenIdx: index("recording_worker_status_last_seen_idx").on(table.lastSeenAt),
  isActiveIdx: index("recording_worker_status_is_active_idx").on(table.isActive),
}));

// System Settings table — key-value store for system-wide configuration
export const systemSettings = pgTable("system_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin Logs table - Admin activity tracking
export const adminLogs = pgTable("admin_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: uuid("admin_user_id").references(() => users.id).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }),
  targetId: varchar("target_id", { length: 100 }),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  adminUserIdx: index("admin_logs_admin_idx").on(table.adminUserId),
  actionIdx: index("admin_logs_action_idx").on(table.action),
  createdAtIdx: index("admin_logs_created_at_idx").on(table.createdAt),
}));

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar("token", { length: 6 }).notNull(),
  method: varchar("method", { length: 10 }).notNull().default('email'), // 'email' | 'sms'
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===========================================
// RELATIONS
// ===========================================

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  platformConnections: many(platformConnections),
  courses: many(courses),
  deadlines: many(deadlines),
  library: many(library),
  studySessions: many(studySessions),
  settings: one(userSettings),
  adminLogs: many(adminLogs),
  subscriptions: many(subscriptions),
  payments: many(payments),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const platformsRelations = relations(platforms, ({ many, one }) => ({
  connections: many(platformConnections),
  courses: many(courses),
  category: one(platformCategories, { fields: [platforms.categoryId], references: [platformCategories.id] }),
  region: one(platformRegions, { fields: [platforms.regionId], references: [platformRegions.id] }),
}));

export const platformCategoriesRelations = relations(platformCategories, ({ many }) => ({
  platforms: many(platforms),
}));

export const platformRegionsRelations = relations(platformRegions, ({ many }) => ({
  platforms: many(platforms),
}));

export const platformConnectionsRelations = relations(platformConnections, ({ one, many }) => ({
  user: one(users, { fields: [platformConnections.userId], references: [users.id] }),
  platform: one(platforms, { fields: [platformConnections.platformId], references: [platforms.id] }),
  externalCourses: many(externalCourses),
  courseDeadlines: many(courseDeadlines),
}));

export const externalCoursesRelations = relations(externalCourses, ({ one, many }) => ({
  user: one(users, { fields: [externalCourses.userId], references: [users.id] }),
  platform: one(platforms, { fields: [externalCourses.platformId], references: [platforms.id] }),
  deadlines: many(courseDeadlines),
}));

export const courseDeadlinesRelations = relations(courseDeadlines, ({ one }) => ({
  externalCourse: one(externalCourses, { fields: [courseDeadlines.externalCourseId], references: [externalCourses.id] }),
  platform: one(platforms, { fields: [courseDeadlines.platformId], references: [platforms.id] }),
  user: one(users, { fields: [courseDeadlines.userId], references: [users.id] }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  user: one(users, { fields: [courses.userId], references: [users.id] }),
  platform: one(platforms, { fields: [courses.platformId], references: [platforms.id] }),
  deadlines: many(deadlines),
  library: many(library),
  studySessions: many(studySessions),
}));

export const deadlinesRelations = relations(deadlines, ({ one }) => ({
  user: one(users, { fields: [deadlines.userId], references: [users.id] }),
  course: one(courses, { fields: [deadlines.courseId], references: [courses.id] }),
}));

export const libraryRelations = relations(library, ({ one }) => ({
  user: one(users, { fields: [library.userId], references: [users.id] }),
  course: one(courses, { fields: [library.courseId], references: [courses.id] }),
}));

export const studySessionsRelations = relations(studySessions, ({ one }) => ({
  user: one(users, { fields: [studySessions.userId], references: [users.id] }),
  course: one(courses, { fields: [studySessions.courseId], references: [courses.id] }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const adminLogsRelations = relations(adminLogs, ({ one }) => ({
  admin: one(users, { fields: [adminLogs.adminUserId], references: [users.id] }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  plan: one(subscriptionPlans, { fields: [subscriptions.planId], references: [subscriptionPlans.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  subscription: one(subscriptions, { fields: [payments.subscriptionId], references: [subscriptions.id] }),
}));

export const recordingTasksRelations = relations(recordingTasks, ({ one }) => ({
  user: one(users, { fields: [recordingTasks.userId], references: [users.id] }),
  libraryNote: one(library, { fields: [recordingTasks.libraryNoteId], references: [library.id] }),
}));

// ===========================================
// INSERT SCHEMAS (Zod validation)
// ===========================================

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertPlatformSchema = createInsertSchema(platforms).omit({
  id: true,
  createdAt: true,
});

export const insertPlatformConnectionSchema = createInsertSchema(platformConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExternalCourseSchema = createInsertSchema(externalCourses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseDeadlineSchema = createInsertSchema(courseDeadlines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeadlineSchema = createInsertSchema(deadlines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNoteSchema = createInsertSchema(library).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudySessionSchema = createInsertSchema(studySessions).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertRecordingTaskSchema = createInsertSchema(recordingTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ===========================================
// TYPE EXPORTS
// ===========================================

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Platform = typeof platforms.$inferSelect;
export type InsertPlatform = z.infer<typeof insertPlatformSchema>;

export type PlatformConnection = typeof platformConnections.$inferSelect;
export type InsertPlatformConnection = z.infer<typeof insertPlatformConnectionSchema>;

export type ExternalCourse = typeof externalCourses.$inferSelect;
export type InsertExternalCourse = z.infer<typeof insertExternalCourseSchema>;

export type CourseDeadline = typeof courseDeadlines.$inferSelect;
export type InsertCourseDeadline = z.infer<typeof insertCourseDeadlineSchema>;

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type Deadline = typeof deadlines.$inferSelect;
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;

export type LearningEvent = typeof learningEvents.$inferSelect;
export type InsertLearningEvent = typeof learningEvents.$inferInsert;

export type Note = typeof library.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

export type StudySession = typeof studySessions.$inferSelect;
export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type RecordingTask = typeof recordingTasks.$inferSelect;
export type InsertRecordingTask = z.infer<typeof insertRecordingTaskSchema>;
