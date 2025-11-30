import { db } from "../db";
import { courses, type Course, type InsertCourse } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { ICourseStorage } from "./types";

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
}
