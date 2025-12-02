import { db } from "../db";
import { library, type Note, type InsertNote } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { INoteStorage } from "./types";

export class NoteStorage implements INoteStorage {
  async getNotes(userId: string): Promise<Note[]> {
    return await db.select().from(library).where(eq(library.userId, userId)).orderBy(desc(library.updatedAt));
  }

  async getNotesByCourse(courseId: string): Promise<Note[]> {
    return await db.select().from(library).where(eq(library.courseId, courseId)).orderBy(desc(library.updatedAt));
  }

  async getNote(id: string): Promise<Note | undefined> {
    const [note] = await db.select().from(library).where(eq(library.id, id));
    return note || undefined;
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(library).values(note).returning();
    return newNote;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined> {
    const [note] = await db.update(library).set({ ...updates, updatedAt: new Date() }).where(eq(library.id, id)).returning();
    return note || undefined;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(library).where(eq(library.id, id));
  }
}
