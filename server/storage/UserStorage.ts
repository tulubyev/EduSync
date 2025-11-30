import { db } from "../db";
import { 
  users, courses, deadlines, notes, platformConnections, studySessions, userSettings,
  type User, type InsertUser
} from "@shared/schema";
import { eq } from "drizzle-orm";
import type { IUserStorage } from "./types";

export class UserStorage implements IUserStorage {
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

  async getUserByIdentifier(identifier: string): Promise<User | undefined> {
    if (identifier.includes('@')) {
      return this.getUserByEmail(identifier);
    } else {
      return this.getUserByPhone(identifier);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUserData(userId: string): Promise<void> {
    await db.delete(notes).where(eq(notes.userId, userId));
    await db.delete(deadlines).where(eq(deadlines.userId, userId));
    await db.delete(studySessions).where(eq(studySessions.userId, userId));
    await db.delete(courses).where(eq(courses.userId, userId));
    await db.delete(platformConnections).where(eq(platformConnections.userId, userId));
    await db.delete(userSettings).where(eq(userSettings.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
}
