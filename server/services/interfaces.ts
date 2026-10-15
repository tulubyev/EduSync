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
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  planType: string;
  isVerified: boolean;
  banksConnected: number;
  totalBalance: string;
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

// ===========================================
// ADMIN SERVICE INTERFACES (ДОБАВЛЕНО)
// ===========================================

export interface IAdminService {
  getAdminDashboardData(adminUserId: string): Promise<AdminDashboardData>;
  moderateUser(adminUserId: string, targetUserId: string, action: string, reason?: string): Promise<UserModerationData>;
  manageAdminRole(superAdminId: string, targetUserId: string, newRole: any): Promise<void>;
  getAdminAuditLog(adminUserId: string, filters?: any): Promise<any[]>;
  getSystemHealth(): Promise<SystemHealthData>;
  bulkUserOperation(adminUserId: string, userIds: string[], operation: string, params?: any): Promise<any>;
}

export interface AdminDashboardData {
  totalUsers: number;
  newUsersToday: number;
  pendingDocuments: number;
  systemHealth: any;
  usersByRole: Record<string, number>;
  financialStats: any;
  recentLogs: any[];
  lastUpdated: Date;
}

export interface UserModerationData {
  success: boolean;
  action: string;
  targetUser: string;
  reason: string;
  timestamp: Date;
}

export interface SystemHealthData {
  overall: 'healthy' | 'warning' | 'error';
  database: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  performance: any;
  lastCheck: Date;
}