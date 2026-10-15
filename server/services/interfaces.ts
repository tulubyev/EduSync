import type { User, Document } from "@shared/schema";

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
  
  // Верификация пользователя
  initiateUserVerification(userId: string): Promise<VerificationProcess>;
  completeUserVerification(userId: string, verificationData: any): Promise<VerificationResult>;
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
  documentsVerified: boolean;
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

export interface VerificationProcess {
  processId: string;
  requiredDocuments: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

export interface VerificationResult {
  success: boolean;
  verificationLevel: 'basic' | 'standard' | 'enhanced';
  message: string;
}

// ===========================================
// DOCUMENT SERVICE INTERFACES
// ===========================================

export interface IDocumentService {
  // Управление документами
  getUserDocuments(userId: string, status?: string): Promise<DocumentInfo[]>;
  uploadDocument(userId: string, documentData: UploadDocumentData): Promise<Document>;
  
  // Верификация документов
  submitForVerification(documentId: string): Promise<void>;
  getVerificationStatus(documentId: string): Promise<VerificationStatus>;
  
  // Админ функции
  getPendingDocuments(): Promise<DocumentInfo[]>;
  approveDocument(documentId: string, adminId: string): Promise<Document>;
  rejectDocument(documentId: string, adminId: string, reason: string): Promise<Document>;
}

export interface DocumentInfo extends Document {
  typeName: string;
  isRequired: boolean;
  verificationHistory: VerificationHistoryItem[];
}

export interface UploadDocumentData {
  documentTypeId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  encryptedContent: Buffer;
}

export interface VerificationStatus {
  status: 'pending' | 'verified' | 'rejected';
  verifiedAt: Date | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
}

export interface VerificationHistoryItem {
  action: string;
  performedBy: string;
  performedAt: Date;
  reason?: string;
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