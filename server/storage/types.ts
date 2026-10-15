import type { 
  User, InsertUser, 
  Course, InsertCourse,
  Platform, InsertPlatform,
  Deadline, InsertDeadline,
  Note, InsertNote,
  AdminLog, InsertAdminLog
} from "@shared/schema";

export interface IUserStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByIdentifier(identifier: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | undefined>;
  deleteUserData(userId: string): Promise<void>;
}

export interface ICourseStorage {
  getCourses(userId: string): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, updates: Partial<Course>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<void>;
}

export interface IPlatformStorage {
  getPlatforms(): Promise<Platform[]>;
  getPlatform(id: string): Promise<Platform | undefined>;
  createPlatform(platform: InsertPlatform): Promise<Platform>;
  savePlatformConnection(userId: string, platformId: string, authType: string, encryptedData: string): Promise<any>;
  getPlatformConnection(userId: string, platformId: string): Promise<any>;
}

export interface IDeadlineStorage {
  getDeadlines(userId: string): Promise<Deadline[]>;
  getDeadlinesByCourse(courseId: string): Promise<Deadline[]>;
  getDeadline(id: string): Promise<Deadline | undefined>;
  createDeadline(deadline: InsertDeadline): Promise<Deadline>;
  updateDeadline(id: string, updates: Partial<Deadline>): Promise<Deadline | undefined>;
  deleteDeadline(id: string): Promise<void>;
}

export interface INoteStorage {
  getNotes(userId: string): Promise<Note[]>;
  getNotesByCourse(courseId: string): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined>;
  deleteNote(id: string): Promise<void>;
}

export interface IAdminStorage {
  getAllUsers(): Promise<User[]>;
  getTotalUsersCount(): Promise<number>;
  getNewUsersCount(days: number): Promise<number>;
  getUserGrowthByMonth(monthsBack?: number): Promise<Array<{ month: string; count: number }>>;
  updateUserByAdmin(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUserByAdmin(id: string): Promise<void>;
  getPaymentTransactionCount(provider?: string): Promise<number>;
  getPaymentTotalAmount(provider?: string): Promise<number>;
  getSuccessfulPaymentCount(provider?: string): Promise<number>;
  getPaymentTransactions(fromDate: Date): Promise<any[]>;
  createAdminLog(entry: InsertAdminLog): Promise<AdminLog>;
  getAdminLogs(adminUserId: string | undefined, page?: number, limit?: number): Promise<AdminLog[]>;
}
