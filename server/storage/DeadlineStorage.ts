import type { Deadline, InsertDeadline, LearningEvent } from "@shared/schema";
import { DUE_TYPES } from "@shared/learningEvents";
import type { IDeadlineStorage } from "./types";
import { EventStorage, deleteOrCancelEvent } from "./EventStorage";
import { CourseStorage } from "./CourseStorage";

/**
 * Дедлайны — это события со сроком сдачи (дедлайн, задание, экзамен) из learning_events (#17).
 * Прежняя форма Deadline сохранена для страницы «Дедлайны», главной и ИИ-помощника.
 */
function toDeadline(e: LearningEvent): Deadline {
  const meta = (e.metadata ?? {}) as { recurringPattern?: unknown };
  return {
    id: e.id,
    userId: e.userId,
    courseId: e.courseId,
    title: e.title,
    description: e.description,
    dueDate: e.startsAt,
    reminderDate: e.reminderAt,
    priority: e.priority,
    status: e.status,
    completedAt: e.completedAt,
    isRecurring: meta.recurringPattern != null,
    recurringPattern: meta.recurringPattern ?? null,
    notificationSent: false,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function toEventFields(d: Partial<InsertDeadline>) {
  const fields: Record<string, unknown> = {};
  if (d.title !== undefined) fields.title = d.title;
  if (d.description !== undefined) fields.description = d.description;
  if (d.dueDate !== undefined) fields.startsAt = d.dueDate;
  if (d.reminderDate !== undefined) fields.reminderAt = d.reminderDate;
  if (d.priority !== undefined) fields.priority = d.priority ?? 'medium';
  if (d.courseId !== undefined) fields.courseId = d.courseId;
  if (d.completedAt !== undefined) fields.completedAt = d.completedAt;
  if (d.status !== undefined) {
    // «просрочен» не хранится — его считает маршрут по сроку
    fields.status = d.status === 'completed' || d.status === 'cancelled' ? d.status : 'pending';
  }
  if (d.recurringPattern !== undefined || d.isRecurring !== undefined) {
    fields.metadata = d.isRecurring === false || d.recurringPattern == null ? null : { recurringPattern: d.recurringPattern };
  }
  return fields;
}

export class DeadlineStorage implements IDeadlineStorage {
  private events = new EventStorage();
  private courses = new CourseStorage();

  async getDeadlines(userId: string): Promise<Deadline[]> {
    const rows = await this.events.listEvents(userId, { types: DUE_TYPES });
    return rows.filter((e) => e.status !== 'cancelled').map(toDeadline);
  }

  async getDeadlinesByCourse(courseId: string): Promise<Deadline[]> {
    const course = await this.courses.getCourse(courseId);
    if (!course) return [];
    const rows = await this.events.listEvents(course.userId, { types: DUE_TYPES, courseId });
    return rows.filter((e) => e.status !== 'cancelled').map(toDeadline);
  }

  async getDeadline(id: string): Promise<Deadline | undefined> {
    const e = await this.events.getEvent(id);
    return e && DUE_TYPES.includes(e.type as any) ? toDeadline(e) : undefined;
  }

  async createDeadline(deadline: InsertDeadline): Promise<Deadline> {
    const created = await this.events.createEvent({
      ...(toEventFields(deadline) as any),
      userId: deadline.userId,
      type: 'deadline',
      source: 'manual',
    });
    return toDeadline(created);
  }

  async updateDeadline(id: string, updates: Partial<Deadline>): Promise<Deadline | undefined> {
    const e = await this.events.updateEvent(id, toEventFields(updates as Partial<InsertDeadline>) as any);
    return e ? toDeadline(e) : undefined;
  }

  async deleteDeadline(id: string): Promise<void> {
    await deleteOrCancelEvent(this.events, id);
  }
}
