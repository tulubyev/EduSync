import { db } from "../db";
import { platforms, type Platform, type InsertPlatform } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { IPlatformStorage } from "./types";

export class PlatformStorage implements IPlatformStorage {
  async getPlatforms(): Promise<Platform[]> {
    return await db.select().from(platforms);
  }

  async getPlatform(id: string): Promise<Platform | undefined> {
    const [platform] = await db.select().from(platforms).where(eq(platforms.id, id));
    return platform || undefined;
  }

  async createPlatform(platform: InsertPlatform): Promise<Platform> {
    const [newPlatform] = await db.insert(platforms).values(platform).returning();
    return newPlatform;
  }
}
