import type { User } from "@shared/schema";

/**
 * ДОМЕННЫЕ ИНТЕРФЕЙСЫ ДЛЯ СЕРВИСОВ
 * Разделение IStorage на специализированные интерфейсы
 */

// ===========================================
// USER SERVICE INTERFACES
// ===========================================

export interface IUserService {
  // Профиль пользователя (агрегированные данные)
  getUserProfile(userId: string): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: ProfileUpdates): Promise<User>;
  
  // Аутентификация и безопасность
  verifyUserCredentials(identifier: string, password: string): Promise<AuthResult>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: string;
  planType: string;
  isVerified: boolean;
  createdAt: Date;
}

export interface ProfileUpdates {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResult {
  user: User;
  token: string;
  refreshToken?: string;
}
