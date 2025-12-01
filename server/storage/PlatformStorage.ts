import { db } from "../db";
import { platforms, platformRegions, type Platform, type InsertPlatform } from "@shared/schema";
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

  async getPlatformsByRegion(regionId: string): Promise<Platform[]> {
    return await db.select().from(platforms).where(eq(platforms.regionId, regionId));
  }

  async getRegions(): Promise<any[]> {
    try {
      const regions = await db.select().from(platformRegions);
      return regions.map(r => ({
        id: r.id,
        displayName: r.displayName || r.name,
        color: r.color,
        code: r.code,
      }));
    } catch (error) {
      return [
        { id: 'e5e2301c-04a2-44c7-a1ab-cd193df86b93', displayName: 'Global', color: '#3B82F6', code: 'global' },
        { id: 'b842ceb7-eb25-47bc-89c8-cd24027b568d', displayName: 'European', color: '#10B981', code: 'european' },
        { id: '82a10db3-2978-4a7b-89a1-5db7c03d1e33', displayName: 'Asian', color: '#F59E0B', code: 'asian' },
        { id: 'ccbca2ab-a637-4d00-8f14-87f73205d82c', displayName: 'Russian', color: '#EF4444', code: 'russian' },
      ];
    }
  }

  async getConnectedPlatforms(userId: string): Promise<any[]> {
    return [];
  }

  async createPlatform(platform: InsertPlatform): Promise<Platform> {
    const [newPlatform] = await db.insert(platforms).values(platform).returning();
    return newPlatform;
  }

  async savePlatformConnection(userId: string, platformId: string, authType: string, encryptedData: string): Promise<any> {
    return {
      id: `conn-${Date.now()}`,
      userId,
      platformId,
      authType,
      status: 'active',
      createdAt: new Date(),
    };
  }

  async getPlatformConnection(userId: string, platformId: string): Promise<any> {
    return null;
  }
}
