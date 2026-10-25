import { Router, Request, Response } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { authenticateToken } from "../middleware/auth";
import { storage } from "../storage";
import { eventStorage, deleteOrCancelEvent } from "../storage/EventStorage";
import { db } from "../db";
import { recordingTasks, type InsertLearningEvent } from "@shared/schema";
import { EVENT_TYPES, EVENT_PRIORITIES } from "@shared/learningEvents";

/**
 * Лента ученика (#17): уроки, вебинары, задания, экзамены и дедлайны всех курсов.
 * Время — в UTC (ISO); в пояс ученика переводит клиент. Чужие события отвечают 404.
 */
const router = Router();

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null };
}

const DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 400;

const isoDate = z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Неверный формат даты" });
// только http(s): ссылки выводятся в кабинете как href
const link = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), { message: "Ссылка должна начинаться с http:// или https://" })
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();
const optText = (max: number) => z.string().trim().max(max).transform((v) => (v === "" ? null : v)).nullable().optional();

const eventSchema = z.object({
  type: z.enum(EVENT_TYPES, { errorMap: () => ({ message: "Неизвестный тип события" }) }),
  title: z.string().trim().min(1, "Название обязательно").max(500),
  description: optText(5000),
  startsAt: isoDate,
  durationMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
  timeZone: optText(50),
  programTitle: optText(500),
  moduleTitle: optText(500),
  courseId: z.string().uuid().nullable().optional(),
  lessonUrl: link,
  materialsUrl: link,
  joinUrl: link,
  priority: z.enum(EVENT_PRIORITIES, { errorMap: () => ({ message: "Неизвестная важность" }) }).optional(),
  reminderAt: isoDate.nullable().optional(),
});

const updateSchema = eventSchema.partial().extend({
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  recordingTaskId: z.string().uuid().nullable().optional(),
});

function validationError(res: Response, error: z.ZodError) {
  return res.status(400).json({ message: error.errors[0]?.message || "Ошибка валидации", errors: error.errors });
}

async function ownCourse(courseId: string | null | undefined, userId: string): Promise<boolean> {
  if (!courseId) return true;
  const course = await storage.getCourse(courseId);
  return !!course && course.userId === userId;
}

async function ownRecording(taskId: string | null | undefined, userId: string): Promise<boolean> {
  if (!taskId) return true;
  const [row] = await db
    .select({ id: recordingTasks.id })
    .from(recordingTasks)
    .where(and(eq(recordingTasks.id, taskId), eq(recordingTasks.userId, userId)));
  return !!row;
}

function toFields(data: z.infer<typeof updateSchema>): Partial<InsertLearningEvent> {
  const { startsAt, reminderAt, ...rest } = data;
  const fields: Partial<InsertLearningEvent> = { ...rest };
  if (startsAt !== undefined) fields.startsAt = new Date(startsAt);
  if (reminderAt !== undefined) fields.reminderAt = reminderAt ? new Date(reminderAt) : null;
  return fields;
}

// GET /api/events?from=…&to=… — события периода (по умолчанию неделя назад и два месяца вперёд)
router.get("/", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const now = Date.now();
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(now - 7 * DAY);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date(now + 60 * DAY);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) {
      return res.status(400).json({ message: "Неверный период" });
    }
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY) {
      return res.status(400).json({ message: `Период не больше ${MAX_RANGE_DAYS} дней` });
    }
    const includeCancelled = req.query.cancelled === "1";
    const events = await eventStorage.listEvents(req.user!.id, { from, to });
    res.json(includeCancelled ? events : events.filter((e) => e.status !== "cancelled"));
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Ошибка получения событий" });
  }
});

router.post("/", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const userId = req.user!.id;
    if (!(await ownCourse(parsed.data.courseId, userId))) {
      return res.status(400).json({ message: "Курс не найден или недоступен" });
    }
    const event = await eventStorage.createEvent({
      ...(toFields(parsed.data) as InsertLearningEvent),
      userId,
      source: "manual",
    });
    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ message: "Ошибка создания события" });
  }
});

router.patch("/:id", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const existing = await eventStorage.getEvent(req.params.id);
    if (!existing || existing.userId !== userId) return res.status(404).json({ message: "Событие не найдено" });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    if (!(await ownCourse(parsed.data.courseId, userId))) {
      return res.status(400).json({ message: "Курс не найден или недоступен" });
    }
    if (!(await ownRecording(parsed.data.recordingTaskId, userId))) {
      return res.status(400).json({ message: "Запись не найдена" });
    }

    const fields = toFields(parsed.data);
    if (parsed.data.status === "completed" && existing.status !== "completed") fields.completedAt = new Date();
    if (parsed.data.status && parsed.data.status !== "completed") fields.completedAt = null;
    const event = await eventStorage.updateEvent(existing.id, fields);
    res.json(event);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Ошибка обновления события" });
  }
});

router.delete("/:id", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await eventStorage.getEvent(req.params.id);
    if (!existing || existing.userId !== req.user!.id) return res.status(404).json({ message: "Событие не найдено" });
    await deleteOrCancelEvent(eventStorage, existing.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Ошибка удаления события" });
  }
});

export default router;
