import { db } from "../db";
import { courses, deadlines, library, studySessions, type Course, type InsertCourse } from "@shared/schema";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import type { ICourseStorage } from "./types";

/** Курс площадки, как его отдаёт адаптер источника (#17) */
export interface SourceCourseInput {
  externalId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  courseUrl?: string | null;
  progress: number; // 0–100
  isCompleted: boolean;
  startedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
}

const statusFor = (c: SourceCourseInput) => (c.isCompleted ? "completed" : c.progress > 0 ? "in_progress" : "not_started");

export class CourseStorage implements ICourseStorage {
  async getCourses(userId: string): Promise<Course[]> {
    return await db.select().from(courses).where(eq(courses.userId, userId)).orderBy(desc(courses.updatedAt));
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course || undefined;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course | undefined> {
    const [course] = await db.update(courses).set({ ...updates, updatedAt: new Date() }).where(eq(courses.id, id)).returning();
    return course || undefined;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  /**
   * Записать курс площадки: новый добавляется, известный (по id у площадки) обновляется.
   * Название, описание, прогресс и статус — площадки; избранное, теги и категория остаются за учеником.
   */
  async upsertSourceCourse(userId: string, source: string, platformId: string | null, c: SourceCourseInput): Promise<Course> {
    const now = new Date();
    const status = statusFor(c);
    const progress = String(Math.max(0, Math.min(100, Math.round(c.progress))));
    const [row] = await db
      .insert(courses)
      .values({
        userId,
        source,
        platformId,
        externalCourseId: c.externalId,
        title: c.title.slice(0, 500),
        description: c.description ?? null,
        imageUrl: c.imageUrl ?? null,
        courseUrl: c.courseUrl ?? null,
        progress,
        status,
        startedAt: c.startedAt ?? null,
        completedAt: c.isCompleted ? now : null,
        metadata: c.metadata ?? null,
        lastSyncedAt: now,
      })
      .onConflictDoUpdate({
        target: [courses.userId, courses.source, courses.externalCourseId],
        set: {
          title: c.title.slice(0, 500),
          description: c.description ?? null,
          imageUrl: c.imageUrl ?? null,
          courseUrl: c.courseUrl ?? null,
          platformId,
          progress,
          status,
          // дата завершения не сдвигается при каждой синхронизации
          completedAt: c.isCompleted ? sql`COALESCE(${courses.completedAt}, ${now})` : null,
          metadata: c.metadata ?? null,
          lastSyncedAt: now,
          updatedAt: now,
        },
      })
      .returning();
    return row;
  }

  async getSourceCourses(userId: string, source: string): Promise<Course[]> {
    return await db.select().from(courses)
      .where(and(eq(courses.userId, userId), eq(courses.source, source)))
      .orderBy(desc(courses.updatedAt));
  }

  /** Удалить курсы площадки; заметки и учебные сессии ученика остаются, только без ссылки на курс */
  async deleteSourceCourses(userId: string, source: string): Promise<void> {
    const ids = (await this.getSourceCourses(userId, source)).map((c) => c.id);
    if (ids.length === 0) return;
    await db.transaction(async (tx) => {
      await tx.update(library).set({ courseId: null }).where(inArray(library.courseId, ids));
      await tx.update(studySessions).set({ courseId: null }).where(inArray(studySessions.courseId, ids));
      await tx.update(deadlines).set({ courseId: null }).where(inArray(deadlines.courseId, ids));
      await tx.delete(courses).where(inArray(courses.id, ids));
    });
  }
}

export const courseStorage = new CourseStorage();
