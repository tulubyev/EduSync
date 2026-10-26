import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { authenticateToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler";
import { db } from "../db";
import { users } from "@shared/schema";
import { eventStorage } from "../storage/EventStorage";
import { buildIcsFeed } from "../services/icalFeed";
import { logger } from "../services/logger";

/**
 * Лента событий ученика по секретной ссылке (#18, docs/CALENDAR-FEED.md):
 * Google, Яндекс, Apple и Outlook подписываются на /api/calendar/<секрет>.ics и сами её перечитывают.
 * Ссылку создаёт, перевыпускает и отключает сам ученик; секрет хранится в users.calendar_token.
 */
const router = Router();

interface AuthRequest extends Request {
  user?: { id: string };
}

const DAY = 24 * 60 * 60 * 1000;
const PAST_DAYS = 30;
const FUTURE_DAYS = 365;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

const newToken = () => randomBytes(32).toString("base64url"); // 256 бит, 43 символа

async function setToken(userId: string, token: string | null) {
  await db.update(users).set({ calendarToken: token, updatedAt: new Date() }).where(eq(users.id, userId));
}

// Есть ли ссылка у ученика (сам адрес собирает клиент: origin сайта + /api/calendar/<секрет>.ics)
router.get("/feed", authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const [row] = await db.select({ token: users.calendarToken }).from(users).where(eq(users.id, req.user!.id));
  res.json({ token: row?.token ?? null });
}));

// Создать или перевыпустить ссылку: старая сразу перестаёт работать
router.post("/feed", authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const token = newToken();
  await setToken(req.user!.id, token);
  res.json({ token });
}));

// Отключить ссылку
router.delete("/feed", authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  await setToken(req.user!.id, null);
  res.json({ token: null });
}));

// Сама лента: без входа, доступ — по секрету в адресе
router.get("/:file", async (req: Request, res: Response) => {
  const token = req.params.file.replace(/\.ics$/i, "");
  if (!TOKEN_RE.test(token)) return res.status(404).type("text/plain").send("Not found");
  try {
    const [user] = await db
      .select({ id: users.id, language: users.language })
      .from(users)
      .where(eq(users.calendarToken, token));
    if (!user) return res.status(404).type("text/plain").send("Not found");

    const now = Date.now();
    const events = await eventStorage.listEvents(user.id, {
      from: new Date(now - PAST_DAYS * DAY),
      to: new Date(now + FUTURE_DAYS * DAY),
    });
    const ics = buildIcsFeed(events, { lang: user.language, host: process.env.APP_DOMAIN || "myepa.ru" });
    res
      .status(200)
      .set({
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="myepa.ics"',
        "Cache-Control": "private, max-age=300",
        "X-Robots-Tag": "noindex",
      })
      .send(ics);
  } catch (error) {
    logger.error("Calendar feed error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).type("text/plain").send("Calendar is temporarily unavailable");
  }
});

export default router;
