import { db } from "../db";
import { learningEvents, courses, type LearningEvent, type InsertLearningEvent } from "@shared/schema";
import type { EventType } from "@shared/learningEvents";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";

export type LearningEventWithCourse = LearningEvent & { courseTitle: string | null };

/** Событие из источника (площадка, iCal): общий вход для всех адаптеров */
export interface SourceEventInput {
  externalId: string;
  type: EventType;
  title: string;
  startsAt: Date;
  durationMinutes?: number | null;
  timeZone?: string | null;
  programTitle?: string | null;
  moduleTitle?: string | null;
  lessonUrl?: string | null;
  materialsUrl?: string | null;
  joinUrl?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface EventListFilter {
  from?: Date;
  to?: Date;
  types?: readonly EventType[];
  courseId?: string;
}

export class EventStorage {
  async listEvents(userId: string, filter: EventListFilter = {}): Promise<LearningEventWithCourse[]> {
    const where = [eq(learningEvents.userId, userId)];
    if (filter.from) where.push(gte(learningEvents.startsAt, filter.from));
    if (filter.to) where.push(lte(learningEvents.startsAt, filter.to));
    if (filter.types?.length) where.push(inArray(learningEvents.type, [...filter.types]));
    if (filter.courseId) where.push(eq(learningEvents.courseId, filter.courseId));
    const rows = await db
      .select({ event: learningEvents, courseTitle: courses.title })
      .from(learningEvents)
      .leftJoin(courses, eq(courses.id, learningEvents.courseId))
      .where(and(...where))
      .orderBy(asc(learningEvents.startsAt));
    return rows.map((r) => ({ ...r.event, courseTitle: r.courseTitle ?? null }));
  }

  async getEvent(id: string): Promise<LearningEvent | undefined> {
    const [event] = await db.select().from(learningEvents).where(eq(learningEvents.id, id));
    return event || undefined;
  }

  async createEvent(event: InsertLearningEvent): Promise<LearningEvent> {
    const [created] = await db.insert(learningEvents).values(event).returning();
    return created;
  }

  async updateEvent(id: string, updates: Partial<InsertLearningEvent>): Promise<LearningEvent | undefined> {
    const [event] = await db.update(learningEvents).set({ ...updates, updatedAt: new Date() }).where(eq(learningEvents.id, id)).returning();
    return event || undefined;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(learningEvents).where(eq(learningEvents.id, id));
  }

  /**
   * Записать события источника: новые добавляются, известные (по external_id) обновляются.
   * Статус, важность и запись вебинара — ученика, синхронизация их не трогает.
   */
  async upsertSourceEvents(userId: string, source: string, platformId: string | null, items: SourceEventInput[]): Promise<number> {
    // одна строка на external_id: повтор в одной пачке ON CONFLICT не принимает
    const unique = Array.from(new Map(items.map((i) => [i.externalId, i])).values());
    if (unique.length === 0) return 0;
    const values: InsertLearningEvent[] = unique.map((i) => ({
      userId,
      source,
      platformId,
      externalId: i.externalId,
      type: i.type,
      title: i.title.slice(0, 500),
      description: i.description ?? null,
      startsAt: i.startsAt,
      durationMinutes: i.durationMinutes ?? null,
      timeZone: i.timeZone ?? null,
      programTitle: i.programTitle ?? null,
      moduleTitle: i.moduleTitle ?? null,
      lessonUrl: i.lessonUrl ?? null,
      materialsUrl: i.materialsUrl ?? null,
      joinUrl: i.joinUrl ?? null,
      metadata: i.metadata ?? null,
    }));
    const excluded = (col: string) => sql.raw(`excluded.${col}`);
    await db
      .insert(learningEvents)
      .values(values)
      .onConflictDoUpdate({
        target: [learningEvents.userId, learningEvents.source, learningEvents.externalId],
        set: {
          type: excluded("type"),
          title: excluded("title"),
          description: excluded("description"),
          startsAt: excluded("starts_at"),
          durationMinutes: excluded("duration_minutes"),
          timeZone: excluded("time_zone"),
          programTitle: excluded("program_title"),
          moduleTitle: excluded("module_title"),
          platformId: excluded("platform_id"),
          lessonUrl: excluded("lesson_url"),
          materialsUrl: excluded("materials_url"),
          joinUrl: excluded("join_url"),
          metadata: excluded("metadata"),
          updatedAt: new Date(),
        },
      });
    return values.length;
  }
}

/**
 * Ручное событие удаляется; событие площадки при следующей синхронизации вернулось бы,
 * поэтому оно только отменяется и пропадает из ленты.
 */
export async function deleteOrCancelEvent(events: EventStorage, id: string): Promise<void> {
  const event = await events.getEvent(id);
  if (!event) return;
  if (event.source === 'manual') await events.deleteEvent(id);
  else await events.updateEvent(id, { status: 'cancelled' });
}

export const eventStorage = new EventStorage();
