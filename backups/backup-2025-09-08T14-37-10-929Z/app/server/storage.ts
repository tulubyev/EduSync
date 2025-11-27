import { 
  users, 
  bankConnections, 
  accounts, 
  transactions, 
  savingsGoals, 
  budgets,
  aiChatSessions,
  familyGroups,
  familyGroupMembers,
  adminLogs,
  type User, 
  type InsertUser,
  type BankConnection,
  type InsertBankConnection,
  type Account,
  type InsertAccount,
  type Transaction,
  type InsertTransaction,
  type SavingsGoal,
  type InsertSavingsGoal,
  type Budget,
  type InsertBudget,
  type AiChatSession,
  type InsertAiChatSession,
  type FamilyGroup,
  type InsertFamilyGroup,
  type FamilyGroupMember,
  type InsertFamilyGroupMember,
  type AdminLog,
  type InsertAdminLog,
  documentTypes,
  type DocumentType,
  documents,
  type Document,
  type InsertDocument,
  documentVerificationHistory,
  type DocumentVerificationHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, gte, lte, sum, sql, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByIdentifier(identifier: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | undefined>;

  // Bank connection operations
  getBankConnections(userId: string): Promise<BankConnection[]>;
  getBankConnection(id: string): Promise<BankConnection | undefined>;
  createBankConnection(connection: InsertBankConnection): Promise<BankConnection>;
  updateBankConnection(id: string, updates: Partial<BankConnection>): Promise<BankConnection | undefined>;

  // Account operations
  getAccounts(userId: string): Promise<Account[]>;
  getAccountsByBank(bankConnectionId: string): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  createOrUpdateAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, updates: Partial<Account>): Promise<Account | undefined>;

  // Transaction operations
  getTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  getTransactionsByAccount(accountId: string, limit?: number): Promise<Transaction[]>;
  getTransactionsByCategory(userId: string, category: string, fromDate?: Date, toDate?: Date): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;

  // Savings goal operations
  getSavingsGoals(userId: string): Promise<SavingsGoal[]>;
  createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal>;
  updateSavingsGoal(id: string, updates: Partial<SavingsGoal>): Promise<SavingsGoal | undefined>;

  // Budget operations
  getBudgets(userId: string, month: number, year: number): Promise<Budget[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: string, updates: Partial<Budget>): Promise<Budget | undefined>;

  // Basic analytics (moved complex analytics to FinanceService)
  getTotalBalance(userId: string): Promise<string>;

  // AI Chat operations
  getAiChatSessions(userId: string): Promise<AiChatSession[]>;
  createAiChatSession(session: InsertAiChatSession): Promise<AiChatSession>;
  updateAiChatSession(id: string, updates: Partial<AiChatSession>): Promise<AiChatSession | undefined>;

  // Family Group operations
  getFamilyGroupsByAdmin(adminUserId: string): Promise<FamilyGroup[]>;
  createFamilyGroup(group: InsertFamilyGroup): Promise<FamilyGroup>;
  addFamilyGroupMember(member: InsertFamilyGroupMember): Promise<FamilyGroupMember>;
  
  // Helper methods for testing
  getAccountsByUser(userId: string): Promise<Account[]>;
  getTransactionsByUser(userId: string): Promise<Transaction[]>;
  deleteUserData(userId: string): Promise<void>;

  // ESIA methods
  getUserBySnils?(snils: string): Promise<User | undefined>;
  getUserByEsiaOid?(esiaOid: string): Promise<User | undefined>;

  // Basic admin methods (complex analytics moved to AdminService)
  createAdminLog(log: InsertAdminLog): Promise<AdminLog>;
  getAdminLogs(adminUserId: string, options?: { limit?: number }): Promise<AdminLog[]>;
  
  // Admin statistics methods
  getTotalUsersCount(): Promise<number>;
  getNewUsersCount(date: Date): Promise<number>;
  getPendingDocumentsCount(): Promise<number>;
  
  // Super admin user management
  getAllUsers(page?: number, limit?: number, search?: string): Promise<any>;
  getUserDetails(userId: string): Promise<any>;

  // Document operations
  getDocumentTypes(): Promise<DocumentType[]>;
  getUserDocuments(userId: string, status?: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  updateDocumentStatus(
    id: string, 
    newStatus: string, 
    changedBy: string, 
    changeReason?: string,
    verificationNotes?: string,
    extractedData?: any
  ): Promise<Document | undefined>;
  getDocumentVerificationHistory(documentId: string): Promise<DocumentVerificationHistory[]>;
  deleteDocument(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async getUserBySnils(snils: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.snils, snils));
    return user || undefined;
  }

  async getUserByEsiaOid(esiaOid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.esiaOid, esiaOid));
    return user || undefined;
  }

  async getUserByIdentifier(identifier: string): Promise<User | undefined> {
    // Try to determine if identifier is email or phone
    if (identifier.includes('@')) {
      return this.getUserByEmail(identifier);
    } else {
      return this.getUserByPhone(identifier);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getBankConnections(userId: string): Promise<BankConnection[]> {
    return await db
      .select()
      .from(bankConnections)
      .where(eq(bankConnections.userId, userId))
      .orderBy(desc(bankConnections.createdAt));
  }

  async createBankConnection(connection: InsertBankConnection): Promise<BankConnection> {
    const [bankConnection] = await db
      .insert(bankConnections)
      .values(connection)
      .returning();
    return bankConnection;
  }

  async getBankConnection(id: string): Promise<BankConnection | undefined> {
    const [bankConnection] = await db
      .select()
      .from(bankConnections)
      .where(eq(bankConnections.id, id));
    return bankConnection || undefined;
  }

  async updateBankConnection(id: string, updates: Partial<BankConnection>): Promise<BankConnection | undefined> {
    const [bankConnection] = await db
      .update(bankConnections)
      .set(updates)
      .where(eq(bankConnections.id, id))
      .returning();
    return bankConnection || undefined;
  }

  async getAccounts(userId: string): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)));
  }

  async getAccountsByBank(bankConnectionId: string): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(eq(accounts.bankConnectionId, bankConnectionId));
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db
      .insert(accounts)
      .values(account)
      .returning();
    return newAccount;
  }

  async createOrUpdateAccount(account: InsertAccount): Promise<Account> {
    // Проверяем, существует ли счет с таким externalAccountId
    const [existingAccount] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.externalAccountId, account.externalAccountId),
          eq(accounts.bankConnectionId, account.bankConnectionId)
        )
      );

    if (existingAccount) {
      // Обновляем существующий счет
      const [updatedAccount] = await db
        .update(accounts)
        .set({ 
          ...account, 
          lastUpdatedAt: new Date() 
        })
        .where(eq(accounts.id, existingAccount.id))
        .returning();
      return updatedAccount;
    } else {
      // Создаем новый счет
      return this.createAccount(account);
    }
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account | undefined> {
    const [account] = await db
      .update(accounts)
      .set({ ...updates, lastUpdatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return account || undefined;
  }

  async getTransactions(userId: string, limit = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.transactionDate))
      .limit(limit);
  }

  async getTransactionsByAccount(accountId: string, limit = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(desc(transactions.transactionDate))
      .limit(limit);
  }

  async getTransactionsByCategory(userId: string, category: string, fromDate?: Date, toDate?: Date): Promise<Transaction[]> {
    const conditions = [
      eq(transactions.userId, userId),
      eq(transactions.category, category)
    ];

    if (fromDate && toDate) {
      conditions.push(
        gte(transactions.transactionDate, fromDate),
        lte(transactions.transactionDate, toDate)
      );
    }

    return await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.transactionDate));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return transaction || undefined;
  }

  async getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
    return await db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.isActive, true)))
      .orderBy(desc(savingsGoals.createdAt));
  }

  async createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal> {
    const [savingsGoal] = await db
      .insert(savingsGoals)
      .values(goal)
      .returning();
    return savingsGoal;
  }

  async updateSavingsGoal(id: string, updates: Partial<SavingsGoal>): Promise<SavingsGoal | undefined> {
    const [savingsGoal] = await db
      .update(savingsGoals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(savingsGoals.id, id))
      .returning();
    return savingsGoal || undefined;
  }

  async getBudgets(userId: string, month: number, year: number): Promise<Budget[]> {
    return await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.userId, userId),
        eq(budgets.month, month),
        eq(budgets.year, year),
        eq(budgets.isActive, true)
      ));
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [newBudget] = await db
      .insert(budgets)
      .values(budget)
      .returning();
    return newBudget;
  }

  async updateBudget(id: string, updates: Partial<Budget>): Promise<Budget | undefined> {
    const [budget] = await db
      .update(budgets)
      .set(updates)
      .where(eq(budgets.id, id))
      .returning();
    return budget || undefined;
  }


  async getTotalBalance(userId: string): Promise<string> {
    const result = await db
      .select({
        total: sum(accounts.balance).as('total')
      })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)));

    return result[0]?.total || "0";
  }



  async getAiChatSessions(userId: string): Promise<AiChatSession[]> {
    return await db
      .select()
      .from(aiChatSessions)
      .where(eq(aiChatSessions.userId, userId))
      .orderBy(desc(aiChatSessions.updatedAt));
  }

  async createAiChatSession(session: InsertAiChatSession): Promise<AiChatSession> {
    const [aiSession] = await db
      .insert(aiChatSessions)
      .values(session)
      .returning();
    return aiSession;
  }

  async updateAiChatSession(id: string, updates: Partial<AiChatSession>): Promise<AiChatSession | undefined> {
    const [aiSession] = await db
      .update(aiChatSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiChatSessions.id, id))
      .returning();
    return aiSession || undefined;
  }

  // Family Group operations
  async getFamilyGroupsByAdmin(adminUserId: string): Promise<FamilyGroup[]> {
    return await db
      .select()
      .from(familyGroups)
      .where(eq(familyGroups.adminUserId, adminUserId))
      .orderBy(desc(familyGroups.createdAt));
  }

  async createFamilyGroup(group: InsertFamilyGroup): Promise<FamilyGroup> {
    const [familyGroup] = await db
      .insert(familyGroups)
      .values(group)
      .returning();
    return familyGroup;
  }

  async addFamilyGroupMember(member: InsertFamilyGroupMember): Promise<FamilyGroupMember> {
    const [groupMember] = await db
      .insert(familyGroupMembers)
      .values(member)
      .returning();
    return groupMember;
  }

  // Document operations
  async getDocumentTypes(): Promise<DocumentType[]> {
    return await db
      .select()
      .from(documentTypes)
      .where(eq(documentTypes.isActive, true))
      .orderBy(asc(documentTypes.displayName));
  }

  async getUserDocuments(userId: string, status?: string): Promise<Document[]> {
    const conditions = [eq(documents.userId, userId), eq(documents.isActive, true)];
    if (status) {
      conditions.push(eq(documents.status, status));
    }
    
    return await db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return document || undefined;
  }

  async updateDocumentStatus(
    id: string, 
    newStatus: string, 
    changedBy: string, 
    changeReason?: string,
    verificationNotes?: string,
    extractedData?: any
  ): Promise<Document | undefined> {
    // Get current document
    const currentDoc = await this.getDocument(id);
    if (!currentDoc) return undefined;

    // Update document
    const updates: any = { 
      status: newStatus, 
      updatedAt: new Date() 
    };
    
    if (newStatus === 'verified') {
      updates.verifiedBy = changedBy;
      updates.verifiedAt = new Date();
    }
    
    if (verificationNotes) {
      updates.verificationNotes = verificationNotes;
    }
    
    if (extractedData) {
      updates.extractedData = extractedData;
    }

    const [updatedDoc] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();

    // Create verification history record
    await db.insert(documentVerificationHistory).values({
      documentId: id,
      previousStatus: currentDoc.status,
      newStatus,
      changedBy,
      changeReason,
    });

    // Auto-update user verification status when documents are verified
    if (newStatus === 'verified') {
      await this.updateUserVerificationStatus(updatedDoc.userId);
    }

    return updatedDoc;
  }

  async getDocumentVerificationHistory(documentId: string): Promise<DocumentVerificationHistory[]> {
    return await db
      .select()
      .from(documentVerificationHistory)
      .where(eq(documentVerificationHistory.documentId, documentId))
      .orderBy(desc(documentVerificationHistory.createdAt));
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      // First delete verification history
      await db.delete(documentVerificationHistory).where(eq(documentVerificationHistory.documentId, id));
      
      // Then delete the document
      const result = await db.delete(documents).where(eq(documents.id, id));
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  async updateUserVerificationStatus(userId: string): Promise<void> {
    try {
      console.log(`🔄 Обновление статуса верификации для пользователя ${userId}`);
      
      // Get all verified documents for this user with their types
      const userDocuments = await db
        .select({
          id: documents.id,
          documentTypeId: documents.documentTypeId,
          status: documents.status,
          typeName: documentTypes.name
        })
        .from(documents)
        .innerJoin(documentTypes, eq(documents.documentTypeId, documentTypes.id))
        .where(and(eq(documents.userId, userId), eq(documents.status, 'verified')));

      console.log(`📄 Найдено верифицированных документов: ${userDocuments.length}`, userDocuments);

      // Check which verification levels are completed based on verified documents
      const hasPassport = userDocuments.some(doc => doc.typeName === 'passport');
      const hasDriverLicense = userDocuments.some(doc => doc.typeName === 'driver_license');
      const hasSnils = userDocuments.some(doc => doc.typeName === 'snils');
      const hasInn = userDocuments.some(doc => doc.typeName === 'inn');
      const hasIncomeDocument = userDocuments.some(doc => doc.typeName === 'income_document');

      console.log(`📋 Типы документов: passport=${hasPassport}, driver_license=${hasDriverLicense}, snils=${hasSnils}, inn=${hasInn}, income=${hasIncomeDocument}`);

      // Определяем статус верификации по уровням:
      // Уровень 1 (Basic): телефон + email - устанавливается при регистрации
      // Уровень 2 (Standard): паспорт
      // Уровень 3 (Full): паспорт + СНИЛС + ИНН + справка о доходах

      const updates: any = {};

      // Получаем текущие данные пользователя для проверки Уровня 1
      const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
      
      // Уровень 1: телефон + email подтверждены (автоматически при регистрации)
      if (currentUser && currentUser.phone && currentUser.email && !currentUser.isVerified) {
        updates.isVerified = true;
        updates.verificationMethod = 'phone_email';
      }

      // Уровень 2 завершен если есть паспорт
      if (hasPassport) {
        updates.verificationLevel2 = true;
        // Если есть паспорт, то и Уровень 1 точно пройден
        if (!currentUser?.isVerified) {
          updates.isVerified = true;
          updates.verificationMethod = 'document_verification';
        }
      }

      // Уровень 3 завершен если есть паспорт + СНИЛС + ИНН + справка о доходах
      if (hasPassport && hasSnils && hasInn && hasIncomeDocument) {
        updates.verificationLevel3 = true;
      }

      // Обновляем только если есть изменения
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        
        await db
          .update(users)
          .set(updates)
          .where(eq(users.id, userId));

        console.log(`✅ Автоматически обновлен статус верификации для пользователя ${userId}:`, updates);
      }
    } catch (error) {
      console.error('❌ Ошибка при обновлении статуса верификации:', error);
    }
  }

  async getPendingDocuments(): Promise<any[]> {
    try {
      // Сначала получаем документы на модерацию
      const pendingDocs = await db
        .select()
        .from(documents)
        .where(or(eq(documents.status, 'pending'), eq(documents.status, 'processing')));

      // Затем для каждого документа получаем информацию о пользователе
      const result = [];
      for (const doc of pendingDocs) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, doc.userId));
        
        if (user) {
          result.push({
            id: doc.id,
            type: doc.documentTypeId,
            originalName: doc.fileName,
            userId: doc.userId,
            status: doc.status,
            uploadedAt: doc.createdAt,
            userFirstName: user.firstName,
            userLastName: user.lastName,
            userPhone: user.phone,
            userEmail: user.email,
          });
        }
      }

      // Сортируем по дате загрузки (новые сверху)
      return result.sort((a, b) => {
        const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Ошибка получения документов на модерацию:', error);
      throw error;
    }
  }

  async getArchivedDocuments(): Promise<any[]> {
    try {
      // Получаем документы со статусом verified или rejected
      const archivedDocs = await db
        .select()
        .from(documents)
        .where(or(eq(documents.status, 'verified'), eq(documents.status, 'rejected')));

      // Затем для каждого документа получаем информацию о пользователе
      const result = [];
      for (const doc of archivedDocs) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, doc.userId));
        
        if (user) {
          result.push({
            id: doc.id,
            type: doc.documentTypeId,
            originalName: doc.fileName,
            userId: doc.userId,
            status: doc.status,
            uploadedAt: doc.createdAt,
            verifiedAt: doc.verifiedAt,
            userFirstName: user.firstName,
            userLastName: user.lastName,
            userPhone: user.phone,
            userEmail: user.email,
          });
        }
      }

      // Сортируем по дате обработки (новые сверху)
      return result.sort((a, b) => {
        const dateA = a.verifiedAt ? new Date(a.verifiedAt).getTime() : 0;
        const dateB = b.verifiedAt ? new Date(b.verifiedAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Ошибка получения архивных документов:', error);
      throw error;
    }
  }

  async getDocumentById(documentId: string): Promise<any | null> {
    try {
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));
      
      return document || null;
    } catch (error) {
      console.error('Ошибка получения документа по ID:', error);
      throw error;
    }
  }

  // Helper methods for testing
  async getAccountsByUser(userId: string): Promise<Account[]> {
    return this.getAccounts(userId);
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return this.getTransactions(userId);
  }

  async deleteUserData(userId: string): Promise<void> {
    // Delete in correct order to respect foreign key constraints
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.delete(budgets).where(eq(budgets.userId, userId));
    await db.delete(savingsGoals).where(eq(savingsGoals.userId, userId));
    await db.delete(aiChatSessions).where(eq(aiChatSessions.userId, userId));
    await db.delete(accounts).where(eq(accounts.userId, userId));
    await db.delete(bankConnections).where(eq(bankConnections.userId, userId));
    await db.delete(familyGroupMembers).where(eq(familyGroupMembers.userId, userId));
    await db.delete(familyGroups).where(eq(familyGroups.adminUserId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  // ===========================================
  // BASIC MONITORING (complex analytics moved to AdminService)
  // ===========================================
  
  async getRecentLogs(limit: number = 100): Promise<any[]> {
    try {
      const logs = await db
        .select()
        .from(adminLogs)
        .orderBy(desc(adminLogs.createdAt))
        .limit(limit);
        
      return logs;
    } catch (error) {
      console.error('Error getting recent logs:', error);
      return [];
    }
  }
  

  // ===========================================
  // BASIC ADMIN HELPERS (complex analytics moved to AdminService)
  // ===========================================




  async getApiStatus(): Promise<any> {
    // Bank connection statuses
    const connectionStatuses = await db.select({
      bankCode: bankConnections.bankCode,
      status: bankConnections.status,
      count: sql<number>`count(*)`
    }).from(bankConnections)
      .groupBy(bankConnections.bankCode, bankConnections.status);

    // Recent sync activity
    const recentSyncs = await db.select({
      bankCode: bankConnections.bankCode,
      lastSync: bankConnections.lastSyncAt,
      status: bankConnections.status
    }).from(bankConnections)
      .orderBy(desc(bankConnections.lastSyncAt))
      .limit(20);

    return {
      connectionStatuses,
      recentSyncs,
      timestamp: new Date().toISOString()
    };
  }

  async getSecurityOverview(): Promise<any> {
    // 2FA adoption rate
    const [twoFactorStats] = await db.select({
      total: sql<number>`count(*)`,
      enabled: sql<number>`count(*) FILTER (WHERE two_factor_enabled = true)`,
      disabled: sql<number>`count(*) FILTER (WHERE two_factor_enabled = false)`
    }).from(users);

    // Verification methods
    const verificationMethods = await db.select({
      method: users.verificationMethod,
      count: sql<number>`count(*)`
    }).from(users)
      .where(sql`verification_method IS NOT NULL`)
      .groupBy(users.verificationMethod);

    return {
      twoFactorStats: {
        total: twoFactorStats.total,
        enabled: twoFactorStats.enabled,
        disabled: twoFactorStats.disabled,
        adoptionRate: twoFactorStats.total > 0 ? 
          Math.round((twoFactorStats.enabled / twoFactorStats.total) * 100) : 0
      },
      verificationMethods,
      timestamp: new Date().toISOString()
    };
  }

  async getSystemHealth(): Promise<any> {
    // Database connectivity test
    try {
      await db.select({ test: sql`1` });
      var dbStatus = 'healthy';
    } catch (error) {
      var dbStatus = 'unhealthy';
    }

    // Recent error patterns (would need error logging table in real implementation)
    const systemHealth = {
      database: dbStatus,
      api: 'healthy', // Would check API endpoints
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    return systemHealth;
  }


  async createAdminLog(log: InsertAdminLog): Promise<AdminLog> {
    const [adminLog] = await db
      .insert(adminLogs)
      .values(log)
      .returning();
    return adminLog;
  }

  async getAdminLogs(adminUserId: string, options?: { limit?: number }): Promise<AdminLog[]> {
    const query = db
      .select()
      .from(adminLogs)
      .where(eq(adminLogs.adminUserId, adminUserId))
      .orderBy(desc(adminLogs.createdAt));
    
    if (options?.limit) {
      return await query.limit(options.limit);
    }
    
    return await query;
  }

  async getTotalUsersCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    return result[0]?.count || 0;
  }

  async getNewUsersCount(date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(
        gte(users.createdAt, startOfDay),
        lte(users.createdAt, endOfDay)
      ));
    return result[0]?.count || 0;
  }

  async getPendingDocumentsCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(or(
        eq(documents.status, 'pending'),
        eq(documents.status, 'processing')
      ));
    return result[0]?.count || 0;
  }

  // ===========================================
  // SUPER ADMIN USER MANAGEMENT
  // ===========================================

  async getAllUsers(page: number = 1, limit: number = 20, search: string = ''): Promise<any> {
    const offset = (page - 1) * limit;
    
    let query = db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      adminRole: users.adminRole,
      planType: users.planType,
      isVerified: users.isVerified,
      verificationMethod: users.verificationMethod,
      twoFactorEnabled: users.twoFactorEnabled,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Добавляем поиск если указан
    if (search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      query = query.where(
        sql`LOWER(${users.firstName} || ' ' || ${users.lastName} || ' ' || COALESCE(${users.email}, '') || ' ' || ${users.phone}) LIKE ${searchTerm}`
      ) as any;
    }

    const usersList = await query;
    
    // Получаем общий счетчик
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
    if (search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      countQuery = countQuery.where(
        sql`LOWER(${users.firstName} || ' ' || ${users.lastName} || ' ' || COALESCE(${users.email}, '') || ' ' || ${users.phone}) LIKE ${searchTerm}`
      ) as any;
    }
    
    const [{ count: totalCount }] = await countQuery;

    return {
      users: usersList,
      pagination: {
        page,
        limit,
        total: totalCount,
        offset: (page - 1) * limit,
        pages: Math.ceil(totalCount / limit)
      }
    };
  }

  async getUserDetails(userId: string): Promise<any> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) return null;

    // Получаем статистику пользователя
    const [accountsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(accounts)
      .where(eq(accounts.userId, userId));

    const [transactionsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    const [bankConnectionsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(bankConnections)
      .where(eq(bankConnections.userId, userId));

    // Получаем последнюю активность (последняя транзакция)
    const [lastTransaction] = await db.select({
      date: transactions.transactionDate,
      description: transactions.description,
      amount: transactions.amount
    }).from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.transactionDate))
      .limit(1);

    return {
      ...user,
      stats: {
        accountsCount: accountsCount.count,
        transactionsCount: transactionsCount.count,
        bankConnectionsCount: bankConnectionsCount.count
      },
      lastActivity: lastTransaction ? {
        date: lastTransaction.date,
        description: lastTransaction.description,
        amount: lastTransaction.amount
      } : null
    };
  }
}

export const storage = new DatabaseStorage();
