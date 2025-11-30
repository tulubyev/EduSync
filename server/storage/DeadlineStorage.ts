import { db } from "../db";
import { deadlines, type Deadline, type InsertDeadline } from "@shared/schema";
import { eq, asc } from "drizzle-orm";
import type { IDeadlineStorage } from "./types";

export class DeadlineStorage implements IDeadlineStorage {
  async getDeadlines(userId: string): Promise<Deadline[]> {
    return await db.select().from(deadlines).where(eq(deadlines.userId, userId)).orderBy(asc(deadlines.dueDate));
  }

  async getDeadlinesByCourse(courseId: string): Promise<Deadline[]> {
    return await db.select().from(deadlines).where(eq(deadlines.courseId, courseId)).orderBy(asc(deadlines.dueDate));
  }

  async getDeadline(id: string): Promise<Deadline | undefined> {
    const [deadline] = await db.select().from(deadlines).where(eq(deadlines.id, id));
    return deadline || undefined;
  }

  async createDeadline(deadline: InsertDeadline): Promise<Deadline> {
    const [newDeadline] = await db.insert(deadlines).values(deadline).returning();
    return newDeadline;
  }

  async updateDeadline(id: string, updates: Partial<Deadline>): Promise<Deadline | undefined> {
    const [deadline] = await db.update(deadlines).set({ ...updates, updatedAt: new Date() }).where(eq(deadlines.id, id)).returning();
    return deadline || undefined;
  }

  async deleteDeadline(id: string): Promise<void> {
    await db.delete(deadlines).where(eq(deadlines.id, id));
  }
}
