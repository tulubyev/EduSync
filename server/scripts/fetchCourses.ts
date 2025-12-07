#!/usr/bin/env tsx
/**
 * Script to search for courses from educational platforms and save them to database
 * Usage: tsx server/scripts/fetchCourses.ts [limit=5]
 * 
 * Fetches courses from platforms and stores them in the courses table
 */

import { db } from "../db";
import { platforms, courses, users } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

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

interface PlatformCourses {
  platformName: string;
  platformId: string;
  courses: CourseData[];
}

/**
 * Sample course data for different platforms
 * This is a template that can be expanded with real data from web searches
 */
const PLATFORM_COURSE_DATA: Record<string, CourseData[]> = {
  coursera: [
    {
      title: "Machine Learning by Andrew Ng",
      description: "Learn machine learning from one of its pioneers. Master the fundamentals of machine learning and AI.",
      courseUrl: "https://www.coursera.org/learn/machine-learning",
      imageUrl: "https://coursera.com/machine-learning.jpg",
      category: "Data Science",
      language: "en",
      cost: 0,
      instructor: "Andrew Ng",
      difficulty: "intermediate",
      duration: 3600,
      externalCourseId: "coursera-ml"
    },
    {
      title: "Python for Everybody",
      description: "Beginner's guide to programming with Python. Learn the fundamentals from scratch.",
      courseUrl: "https://www.coursera.org/learn/python-for-everybody",
      category: "Programming",
      language: "en",
      cost: 0,
      instructor: "Dr. Charles Severance",
      difficulty: "beginner",
      duration: 2400,
      externalCourseId: "coursera-python"
    }
  ],
  edx: [
    {
      title: "CS50's Introduction to Computer Science",
      description: "Harvard's introduction to the intellectual enterprises of computer science and the art of programming.",
      courseUrl: "https://www.edx.org/course/cs50s-introduction-computer-science-harvardx-cs50x",
      category: "Computer Science",
      language: "en",
      cost: 0,
      instructor: "David J. Malan",
      difficulty: "beginner",
      duration: 4000,
      externalCourseId: "edx-cs50"
    },
    {
      title: "Introduction to Linux",
      description: "Learn Linux fundamentals and system administration. Perfect for beginners.",
      courseUrl: "https://www.edx.org/course/introduction-linux-linuxfoundationx-lfs101x",
      category: "System Administration",
      language: "en",
      cost: 0,
      difficulty: "beginner",
      duration: 3000,
      externalCourseId: "edx-linux"
    }
  ],
  udemy: [
    {
      title: "Complete Python Bootcamp",
      description: "Learn Python programming comprehensively. From basics to advanced concepts.",
      courseUrl: "https://www.udemy.com/course/complete-python-bootcamp/",
      category: "Programming",
      language: "en",
      cost: 9.99,
      instructor: "Jose Portilla",
      difficulty: "beginner",
      duration: 2200,
      externalCourseId: "udemy-python-bootcamp"
    },
    {
      title: "The Web Developer Bootcamp",
      description: "Learn web development with HTML, CSS, JavaScript, and more.",
      courseUrl: "https://www.udemy.com/course/the-web-developer-bootcamp/",
      category: "Web Development",
      language: "en",
      cost: 12.99,
      instructor: "Colt Steele",
      difficulty: "beginner",
      duration: 2600,
      externalCourseId: "udemy-web-bootcamp"
    }
  ],
  stepik: [
    {
      title: "Обучение Python на русском",
      description: "Полный курс программирования на Python для начинающих на русском языке.",
      courseUrl: "https://stepik.org/course/python/",
      category: "Программирование",
      language: "ru",
      cost: 0,
      difficulty: "beginner",
      duration: 2400,
      externalCourseId: "stepik-python-ru"
    },
    {
      title: "Web-разработка на Python и Django",
      description: "Полный курс веб-разработки с использованием фреймворка Django.",
      courseUrl: "https://stepik.org/course/django/",
      category: "Веб-разработка",
      language: "ru",
      cost: 0,
      instructor: "Mykola Horovyy",
      difficulty: "intermediate",
      duration: 3000,
      externalCourseId: "stepik-django"
    }
  ],
  skillbox: [
    {
      title: "Профессия: Data Scientist на Python",
      description: "Полное обучение профессии Data Scientist на базе Python.",
      courseUrl: "https://skillbox.ru/course/profession-datascientist/",
      category: "Data Science",
      language: "ru",
      cost: 5990,
      difficulty: "intermediate",
      duration: 5000,
      externalCourseId: "skillbox-datascientist"
    },
    {
      title: "Профессия: Full-Stack разработчик на JavaScript",
      description: "Обучение полному стеку веб-разработки с JavaScript, Node.js и React.",
      courseUrl: "https://skillbox.ru/course/profession-fullstack-js/",
      category: "Веб-разработка",
      language: "ru",
      cost: 5490,
      difficulty: "intermediate",
      duration: 4500,
      externalCourseId: "skillbox-fullstack"
    }
  ]
};

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
  
  for (const courseData of coursesData) {
    try {
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
