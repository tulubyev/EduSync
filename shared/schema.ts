import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb, uuid, index } from "drizzle-orm/pg-core";
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
  phone: varchar("phone", { length: 20 }).notNull().unique(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  phoneIdx: index("users_phone_idx").on(table.phone),
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

// Platform Connections table - User connections to platforms
export const platformConnections = pgTable("platform_connections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  platformId: uuid("platform_id").references(() => platforms.id).notNull(),
  accessToken: text("access_token"), // encrypted
  refreshToken: text("refresh_token"), // encrypted
  externalUserId: varchar("external_user_id", { length: 255 }),
  status: varchar("status", { length: 20 }).default("active"), // active, expired, revoked
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userPlatformIdx: index("platform_connections_user_platform_idx").on(table.userId, table.platformId),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userCourseIdx: index("courses_user_idx").on(table.userId),
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
  yoomoneyPaymentMethodId: varchar("yoomoney_payment_method_id", { length: 255 }), // saved payment method
  lastPaymentAt: timestamp("last_payment_at"),
  nextPaymentAt: timestamp("next_payment_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userSubIdx: index("subscriptions_user_idx").on(table.userId),
  planSubIdx: index("subscriptions_plan_idx").on(table.planId),
  statusIdx: index("subscriptions_status_idx").on(table.status),
}));

// Payments table - Payment history
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  yoomoneyOperationId: varchar("yoomoney_operation_id", { length: 255 }), // Yoomoney operation ID
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

export const platformConnectionsRelations = relations(platformConnections, ({ one }) => ({
  user: one(users, { fields: [platformConnections.userId], references: [users.id] }),
  platform: one(platforms, { fields: [platformConnections.platformId], references: [platforms.id] }),
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

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type Deadline = typeof deadlines.$inferSelect;
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;

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
