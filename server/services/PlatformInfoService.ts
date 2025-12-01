import { storage } from "../storage";
import type { Platform } from "@shared/schema";

export interface PlatformInfo extends Platform {
  supportedLanguages: string[];
  keyFeatures: string[];
  bestFor: string;
}

export class PlatformInfoService {
  private cache = new Map<string, PlatformInfo>();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

  async getPlatformInfo(platformId: string): Promise<PlatformInfo | undefined> {
    if (this.cache.has(platformId)) {
      return this.cache.get(platformId);
    }

    const platform = await storage.getPlatform(platformId);
    if (!platform) return undefined;

    const info = this.enrichPlatformData(platform);
    this.cache.set(platformId, info);
    
    setTimeout(() => {
      this.cache.delete(platformId);
    }, this.cacheTimeout);

    return info;
  }

  private enrichPlatformData(platform: Platform): PlatformInfo {
    const platformData: Record<string, Partial<PlatformInfo>> = {
      coursera: {
        supportedLanguages: ["English", "Spanish", "French", "German", "Russian", "Chinese"],
        keyFeatures: ["University partnerships", "Certificates", "Specializations", "Degrees"],
        bestFor: "Те, кто хочет получить сертификат от топ-университетов"
      },
      edx: {
        supportedLanguages: ["English", "Spanish", "Arabic", "Chinese", "German", "French"],
        keyFeatures: ["MIT/Harvard courses", "Professional certificates", "MicroMasters", "Free audit"],
        bestFor: "Студенты и профессионалы, желающие учиться на курсах от лучших университетов"
      },
      udemy: {
        supportedLanguages: ["English", "Spanish", "Portuguese", "German", "French", "Japanese", "Chinese", "Russian"],
        keyFeatures: ["213,000+ courses", "Lifetime access", "Affordable", "Wide selection"],
        bestFor: "Тех, кто хочет быстро освоить практический навык по доступной цене"
      },
      stepik: {
        supportedLanguages: ["Russian", "English"],
        keyFeatures: ["Interactive tasks", "Free courses", "Community", "Russian focus"],
        bestFor: "Русскоязычных учеников, изучающих программирование и математику"
      },
      skillbox: {
        supportedLanguages: ["Russian"],
        keyFeatures: ["Professional courses", "Career support", "Internships", "Job placement"],
        bestFor: "Тех, кто ищет курсы digital-профессий с помощью в трудоустройстве"
      },
      geekbrains: {
        supportedLanguages: ["Russian"],
        keyFeatures: ["Intensive programs", "Mentorship", "Career guidance", "VK ecosystem"],
        bestFor: "Начинающих программистов, ищущих интенсивную подготовку"
      },
      khan_academy: {
        supportedLanguages: ["English", "Spanish", "French", "Portuguese", "German", "Russian", "Japanese", "Chinese"],
        keyFeatures: ["Free", "K-12 focus", "Video lessons", "Practice problems"],
        bestFor: "Школьников и родителей, ищущих бесплатное качественное образование"
      },
      codecademy: {
        supportedLanguages: ["English"],
        keyFeatures: ["Interactive learning", "Hands-on coding", "Beginner-friendly", "Multiple languages"],
        bestFor: "Тех, кто хочет научиться программировать с нулевого уровня"
      }
    };

    const code = platform.code?.toLowerCase() || '';
    const enriched = platformData[code] || {};

    return {
      ...platform,
      supportedLanguages: enriched.supportedLanguages || [],
      keyFeatures: enriched.keyFeatures || [],
      bestFor: enriched.bestFor || "Для любого уровня подготовки"
    };
  }
}

export const platformInfoService = new PlatformInfoService();
