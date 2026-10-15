import { db } from "../db";
import { platforms, platformRegions, platformConnections, type Platform, type InsertPlatform } from "@shared/schema";
import { eq, and } from "drizzle-orm";
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
    try {
      const { platformConnections } = await import('../../shared/schema');
      const connections = await db
        .select()
        .from(platformConnections)
        .where(eq(platformConnections.userId, userId));
      return connections;
    } catch (error) {
      console.error('Error fetching connected platforms:', error);
      return [];
    }
  }

  async connectPlatform(userId: string, platformId: string): Promise<any> {
    try {
      const { platformConnections } = await import('../../shared/schema');
      
      const existing = await db
        .select()
        .from(platformConnections)
        .where(
          and(
            eq(platformConnections.userId, userId),
            eq(platformConnections.platformId, platformId)
          )
        );
      
      if (existing.length > 0) {
        return existing[0];
      }
      
      const [connection] = await db
        .insert(platformConnections)
        .values({
          userId,
          platformId,
          connectionStatus: 'active',
        })
        .returning();
      
      return connection;
    } catch (error) {
      console.error('Error connecting platform:', error);
      throw error;
    }
  }

  async createPlatform(platform: InsertPlatform): Promise<Platform> {
    const [newPlatform] = await db.insert(platforms).values(platform).returning();
    return newPlatform;
  }

  /**
   * Сохраняет зашифрованные учётные данные платформы (логин/пароль, API-ключ).
   * Отдельной колонки под тип авторизации нет, поэтому в access_token_encrypted лежит
   * JSON {authType, encrypted}; сами данные уже зашифрованы EncryptionService.
   */
  async savePlatformConnection(userId: string, platformId: string, authType: string, encryptedData: string): Promise<any> {
    const payload = JSON.stringify({ authType, encrypted: encryptedData });

    const [existing] = await db
      .select()
      .from(platformConnections)
      .where(and(eq(platformConnections.userId, userId), eq(platformConnections.platformId, platformId)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(platformConnections)
        .set({ accessTokenEncrypted: payload, connectionStatus: 'active', updatedAt: new Date() })
        .where(eq(platformConnections.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(platformConnections)
      .values({ userId, platformId, accessTokenEncrypted: payload, connectionStatus: 'active' })
      .returning();
    return created;
  }

  async getPlatformConnection(userId: string, platformId: string): Promise<any> {
    const [row] = await db
      .select()
      .from(platformConnections)
      .where(and(eq(platformConnections.userId, userId), eq(platformConnections.platformId, platformId)))
      .limit(1);

    if (!row?.accessTokenEncrypted) return null;

    try {
      const { authType, encrypted } = JSON.parse(row.accessTokenEncrypted);
      if (typeof authType !== 'string' || typeof encrypted !== 'string') return null;
      return { ...row, authType, encryptedData: encrypted };
    } catch {
      // Токен другого формата (например, OAuth Stepik) — это не учётные данные
      return null;
    }
  }
}
