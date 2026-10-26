/**
 * Сбор данных ученика из базы для выгрузки (#44); файлы архива собирает dataExportFiles.ts.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  users, userSettings, courses, learningEvents, library, studySessions, recordingTasks,
  platformConnections, platforms, subscriptions, subscriptionPlans, payments, courseDeadlines,
} from "@shared/schema";
import type { UserDataBundle } from "./dataExportFiles";

/** Сбор данных ученика из базы — только по его id */
export async function collectUserData(userId: string): Promise<UserDataBundle> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error("User not found");
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  const own = <T extends { userId: unknown }>(t: T) => eq(t.userId as never, userId);

  const [courseRows, eventRows, notes, sessions, tasks, connections, subs, pays, legacyDeadlines] = await Promise.all([
    db.select().from(courses).where(own(courses)).orderBy(asc(courses.createdAt)),
    db.select({ event: learningEvents, courseTitle: courses.title })
      .from(learningEvents)
      .leftJoin(courses, and(eq(courses.id, learningEvents.courseId), eq(courses.userId, userId)))
      .where(own(learningEvents))
      .orderBy(asc(learningEvents.startsAt)),
    db.select().from(library).where(own(library)).orderBy(asc(library.createdAt)),
    db.select().from(studySessions).where(own(studySessions)).orderBy(asc(studySessions.startTime)),
    db.select().from(recordingTasks).where(own(recordingTasks)).orderBy(asc(recordingTasks.scheduledTime)),
    db.select({ connection: platformConnections, platformName: platforms.name })
      .from(platformConnections)
      .leftJoin(platforms, eq(platforms.id, platformConnections.platformId))
      .where(own(platformConnections)),
    db.select({ subscription: subscriptions, planName: subscriptionPlans.name })
      .from(subscriptions)
      .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .where(own(subscriptions)),
    db.select().from(payments).where(own(payments)).orderBy(asc(payments.createdAt)),
    // сроки площадок из старой таблицы (до #17); код их больше не читает, но строки могли остаться
    db.select().from(courseDeadlines).where(own(courseDeadlines)),
  ]);

  return {
    profile: user,
    profileImage: user.profileImage ?? null,
    language: user.language ?? null,
    settings: settings ?? null,
    courses: courseRows,
    events: eventRows.map((r) => ({ ...r.event, courseTitle: r.courseTitle ?? null })),
    library: notes,
    studySessions: sessions,
    recordings: tasks,
    platformConnections: connections.map((r) => ({ ...r.connection, platformName: r.platformName ?? null })),
    subscriptions: subs.map((r) => ({ ...r.subscription, planName: r.planName ?? null })),
    payments: pays,
    legacyPlatformDeadlines: legacyDeadlines,
  };
}

