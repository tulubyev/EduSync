#!/usr/bin/env tsx
/**
 * Script to search for courses from educational platforms and save them to database
 * Usage: tsx server/scripts/fetchCourses.ts [limit=5]
 * 
 * Fetches courses from platforms and stores them in the courses table
 */

import { db } from "../db";
import { platforms, courses, users } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { PLATFORM_COURSE_DATA } from "../services/courseDiscoveryService";

interface CourseData {
  title: string;
  description?: string;
  courseUrl?: string;
  imageUrl?: string;
  category?: string;
  language?: string;
  cost?: number | null;
  instructor?: string;
  difficulty?: string;
  duration?: number;
  externalCourseId?: string;
}

async function getAdminUser() {
  const adminUser = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);
  
  if (!adminUser.length) {
    console.error("❌ No admin user found. Please create an admin user first.");
    process.exit(1);
  }
  
  return adminUser[0];
}

async function getPlatforms(limit: number = 5) {
  console.log(`📚 Fetching first ${limit} platforms...`);
  
  const platformList = await db
    .select()
    .from(platforms)
    .where(eq(platforms.isActive, true))
    .limit(limit);
  
  console.log(`✅ Found ${platformList.length} platforms`);
  return platformList;
}

async function saveCourses(
  userId: string,
  platformId: string,
  coursesData: CourseData[]
) {
  const savedCourses = [];
  let skippedCount = 0;
  
  for (const courseData of coursesData) {
    try {
      let existingCourse = null;
      
      if (courseData.externalCourseId) {
        const byExternalId = await db
          .select({ id: courses.id })
          .from(courses)
          .where(
            and(
              eq(courses.platformId, platformId),
              eq(courses.externalCourseId, courseData.externalCourseId)
            )
          )
          .limit(1);
        existingCourse = byExternalId.length > 0 ? byExternalId[0] : null;
      }
      
      if (!existingCourse) {
        const normalizedTitle = courseData.title.trim().toLowerCase();
        const byTitle = await db
          .select({ id: courses.id })
          .from(courses)
          .where(
            and(
              eq(courses.platformId, platformId),
              sql`lower(trim(${courses.title})) = ${normalizedTitle}`
            )
          )
          .limit(1);
        existingCourse = byTitle.length > 0 ? byTitle[0] : null;
      }
      
      if (existingCourse) {
        console.log(`  ⏭️  Skipped (exists): ${courseData.title}`);
        skippedCount++;
        continue;
      }
      
      const newCourse = await db
        .insert(courses)
        .values({
          userId,
          platformId,
          title: courseData.title,
          description: courseData.description,
          courseUrl: courseData.courseUrl || null,
          imageUrl: courseData.imageUrl || null,
          category: courseData.category || null,
          language: courseData.language || null,
          cost: courseData.cost !== null && courseData.cost !== undefined ? courseData.cost.toString() : null,
          instructor: courseData.instructor || null,
          difficulty: courseData.difficulty || null,
          duration: courseData.duration || null,
          externalCourseId: courseData.externalCourseId || null,
          status: "not_started",
        })
        .returning();
      
      savedCourses.push(newCourse[0]);
      console.log(`  ✅ Saved: ${courseData.title}`);
    } catch (error) {
      console.error(`  ❌ Error saving "${courseData.title}":`, error);
    }
  }
  
  if (skippedCount > 0) {
    console.log(`  ℹ️  Skipped ${skippedCount} existing courses`);
  }
  
  return savedCourses;
}

async function main() {
  try {
    const limitArg = process.argv[2] || "5";
    const limit = Math.max(1, Math.min(parseInt(limitArg), 89)); // Max 89 platforms
    
    console.log("🚀 Starting course discovery script...\n");
    
    const adminUser = await getAdminUser();
    console.log(`👤 Using admin user: ${adminUser.firstName} ${adminUser.lastName}\n`);
    
    const platformList = await getPlatforms(limit);
    
    if (!platformList.length) {
      console.log("❌ No platforms found in database");
      return;
    }
    
    console.log("\n📝 Platform Data Mapping:");
    console.log("━".repeat(60));
    
    let totalSaved = 0;
    
    for (const platform of platformList) {
      const platformCode = platform.code;
      const coursesForPlatform = PLATFORM_COURSE_DATA[platformCode] || [];
      
      console.log(`\n🔍 Processing: ${platform.name} (${platformCode})`);
      
      if (coursesForPlatform.length === 0) {
        console.log(`  ⚠️  No course data for this platform yet`);
        console.log(`  💡 Add courses for "${platformCode}" in PLATFORM_COURSE_DATA`);
        continue;
      }
      
      console.log(`  📖 Found ${coursesForPlatform.length} courses`);
      
      const saved = await saveCourses(
        adminUser.id,
        platform.id,
        coursesForPlatform
      );
      
      totalSaved += saved.length;
    }
    
    console.log("\n" + "━".repeat(60));
    console.log(`\n✨ Complete!`);
    console.log(`   Total courses saved: ${totalSaved}`);
    console.log(`   Platforms processed: ${platformList.length}`);
    
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
