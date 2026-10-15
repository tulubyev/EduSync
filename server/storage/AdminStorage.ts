import { db } from "../db";
import { users, payments, subscriptions, subscriptionPlans, adminLogs, type User, type AdminLog, type InsertAdminLog } from "@shared/schema";
import { eq, desc, sql, gte, lte, and, or } from "drizzle-orm";
import type { IAdminStorage } from "./types";

export class AdminStorage implements IAdminStorage {
  async getTotalUsersCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0]?.count || 0;
  }

  async getUserGrowthByMonth(monthsBack: number = 6): Promise<Array<{ month: string; count: number }>> {
    try {
      const results = [];
      const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
      
      for (let i = monthsBack - 1; i >= 0; i--) {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() - i);
        endDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
        
        const result = await db.select({ count: sql<number>`count(*)` })
          .from(users)
          .where(lte(users.createdAt, endDate));
        
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        results.push({
          month: monthNames[d.getMonth()],
          count: Number(result[0]?.count || 0)
        });
      }
      return results;
    } catch (error) {
      console.error('Error getting user growth by month:', error);
      return [];
    }
  }

  async getNewUsersCount(days: number): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const result = await db.select({ count: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, date));
    return result[0]?.count || 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserByAdmin(userId: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return user || undefined;
  }

  async deleteUserByAdmin(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async getPaymentTransactionCount(provider?: string): Promise<number> {
    try {
      let query = db.select({ count: sql<number>`count(*)` }).from(payments);
      if (provider) {
        query = query.where(eq(payments.paymentProvider, provider)) as any;
      }
      const result = await query;
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting payment transaction count:', error);
      return 0;
    }
  }

  async getPaymentTotalAmount(provider?: string): Promise<number> {
    try {
      const conditions = [
        or(eq(payments.status, 'completed'), eq(payments.status, 'succeeded'))
      ];
      
      if (provider) {
        conditions.push(eq(payments.paymentProvider, provider));
      }
      
      const result = await db.select({ 
        total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` 
      }).from(payments).where(and(...conditions));
      
      return parseFloat(String(result[0]?.total)) || 0;
    } catch (error) {
      console.error('Error getting payment total amount:', error);
      return 0;
    }
  }

  async getSuccessfulPaymentCount(provider?: string): Promise<number> {
    try {
      const conditions = [
        or(eq(payments.status, 'completed'), eq(payments.status, 'succeeded'))
      ];
      
      if (provider) {
        conditions.push(eq(payments.paymentProvider, provider));
      }
      
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(payments)
        .where(and(...conditions));
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting successful payment count:', error);
      return 0;
    }
  }

  async getPaymentTransactions(fromDate: Date): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: payments.id,
          userId: payments.userId,
          amount: payments.amount,
          status: payments.status,
          createdAt: payments.createdAt,
          paymentMethod: payments.paymentProvider,
          description: payments.description,
          metadata: payments.metadata
        })
        .from(payments)
        .where(gte(payments.createdAt, fromDate))
        .orderBy(desc(payments.createdAt))
        .limit(100);

      const enrichedResults = await Promise.all(result.map(async (tx) => {
        const user = await db.select({ firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, tx.userId))
          .limit(1);
        
        return {
          ...tx,
          userName: user[0] ? `${user[0].firstName} ${user[0].lastName}` : 'Пользователь',
          planName: (tx.metadata as any)?.planName || 'Подписка'
        };
      }));

      return enrichedResults;
    } catch (error) {
      console.error('Error getting payment transactions:', error);
      return [];
    }
  }

  async createAdminLog(entry: InsertAdminLog): Promise<AdminLog> {
    const [row] = await db.insert(adminLogs).values(entry).returning();
    return row;
  }

  /** Журнал действий админов; adminUserId = undefined — все записи (для super_admin). */
  async getAdminLogs(adminUserId: string | undefined, page = 1, limit = 50): Promise<AdminLog[]> {
    const pageSize = Math.min(200, Math.max(1, limit));
    const query = db.select().from(adminLogs);
    const filtered = adminUserId ? query.where(eq(adminLogs.adminUserId, adminUserId)) : query;
    return await filtered
      .orderBy(desc(adminLogs.createdAt))
      .limit(pageSize)
      .offset((Math.max(1, page) - 1) * pageSize);
  }
}
