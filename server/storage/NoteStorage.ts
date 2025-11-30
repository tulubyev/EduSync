import { db } from "../db";
import { notes, type Note, type InsertNote } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { INoteStorage } from "./types";

export class NoteStorage implements INoteStorage {
  async getNotes(userId: string): Promise<Note[]> {
    return await db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.updatedAt));
  }

  async getNotesByCourse(courseId: string): Promise<Note[]> {
    return await db.select().from(notes).where(eq(notes.courseId, courseId)).orderBy(desc(notes.updatedAt));
  }

  async getNote(id: string): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note || undefined;
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(notes).values(note).returning();
    return newNote;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined> {
    const [note] = await db.update(notes).set({ ...updates, updatedAt: new Date() }).where(eq(notes.id, id)).returning();
    return note || undefined;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }
}
