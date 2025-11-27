/**
 * Схема пользователя для модуля авторизации FinTrack
 * 
 * Скопируйте в shared/schema.ts вашего проекта
 * Адаптируйте под свои нужды
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Основные данные
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  middleName: varchar("middle_name", { length: 100 }),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  birthDate: timestamp("birth_date"),
  gender: varchar("gender", { length: 1 }), // M, F
  
  // Государственные идентификаторы (для РФ)
  snils: varchar("snils", { length: 14 }).unique(),
  inn: varchar("inn", { length: 12 }).unique(),
  esiaOid: varchar("esia_oid", { length: 50 }).unique(), // ID в Госуслугах
  
  // Роли и планы
  role: varchar("role", { length: 20 }).default("personal"), // personal, family_admin, family_member, business
  adminRole: varchar("admin_role", { length: 20 }), // super_admin, devops_admin, analytics_admin, finance_admin, api_admin, security_admin
  planType: varchar("plan_type", { length: 20 }).default("free"), // free, premium, family, business
  
  // Верификация
  isVerified: boolean("is_verified").default(false),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  isEmailVerified: boolean("is_email_verified").default(false),
  isEsiaVerified: boolean("is_esia_verified").default(false),
  verificationLevel1: boolean("verification_level_1").default(false), // Базовый
  verificationLevel2: boolean("verification_level_2").default(false), // Расширенный
  verificationLevel3: boolean("verification_level_3").default(false), // Полный
  verificationMethod: varchar("verification_method", { length: 20 }), // phone, email, esia
  
  // Двухфакторная аутентификация
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret", { length: 100 }),
  twoFactorBackupCodes: text("two_factor_backup_codes").array(),
  
  // SMS верификация
  smsCode: varchar("sms_code", { length: 6 }),
  smsCodeExpiry: timestamp("sms_code_expiry"),
  
  // Даты
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  phoneIdx: index("phone_idx").on(table.phone),
  esiaIdx: index("esia_idx").on(table.esiaOid),
}));

// Типы
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Zod схемы для валидации
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  phone: z.string().regex(/^\+7[0-9]{10}$/, 'Неверный формат телефона').optional(),
  email: z.string().email('Неверный email').optional(),
  identifier: z.string().optional(),
  password: z.string().min(1, 'Пароль обязателен'),
  twoFactorCode: z.string().optional(),
}).refine(data => data.phone || data.email || data.identifier, {
  message: "Укажите телефон, email или идентификатор для входа",
});

export const registerSchema = z.object({
  firstName: z.string()
    .min(1, 'Имя обязательно')
    .max(100)
    .regex(/^[А-Яа-яЁё\s\-']+$/, 'Только русские буквы'),
  lastName: z.string()
    .min(1, 'Фамилия обязательна')
    .max(100)
    .regex(/^[А-Яа-яЁё\s\-']+$/, 'Только русские буквы'),
  phone: z.string().regex(/^\+7[0-9]{10}$/, 'Формат: +79161234567'),
  email: z.string().email('Неверный email').optional(),
  password: z.string()
    .min(12, 'Минимум 12 символов')
    .regex(/[A-Z]/, 'Нужна заглавная буква')
    .regex(/[a-z]/, 'Нужна строчная буква')
    .regex(/[0-9]/, 'Нужна цифра')
    .regex(/[!@#$%^&*]/, 'Нужен спецсимвол (!@#$%^&*)'),
});

// Админские роли
export type AdminRole = 
  | 'super_admin' 
  | 'devops_admin' 
  | 'analytics_admin' 
  | 'finance_admin' 
  | 'api_admin' 
  | 'security_admin';

export const ADMIN_PERMISSIONS = {
  super_admin: ['*', 'users.manage'],
  devops_admin: ['system.monitoring', 'system.performance', 'logs.system'],
  analytics_admin: ['analytics.view', 'reports.generate', 'metrics.view'],
  finance_admin: ['transactions.view', 'banks.manage', 'payments.view'],
  api_admin: ['api.monitoring', 'integrations.view', 'webhooks.manage'],
  security_admin: ['security.monitoring', 'auth.logs', 'audit.logs'],
} as const;
