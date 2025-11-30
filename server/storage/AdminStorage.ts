import { db } from "../db";
import { users, type User } from "@shared/schema";
import { eq, desc, sql, gte, lte, and } from "drizzle-orm";
import type { IAdminStorage } from "./types";

export class AdminStorage implements IAdminStorage {
  async getTotalUsersCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0]?.count || 0;
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
}
