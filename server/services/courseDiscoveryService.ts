import { db } from "../db";
import { platforms, courses, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Sample course data for different platforms
 * Add more platforms and courses here as discovered
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

interface DiscoveryResult {
  success: boolean;
  totalSaved: number;
  platformsProcessed: number;
  platformsWithCourses: number;
  errors: Array<{ platform: string; error: string }>;
  startTime: Date;
  endTime: Date;
}

class CourseDiscoveryService {
  async discoverCourses(limit: number = 5): Promise<DiscoveryResult> {
    const startTime = new Date();
    const result: DiscoveryResult = {
      success: false,
      totalSaved: 0,
      platformsProcessed: 0,
      platformsWithCourses: 0,
      errors: [],
      startTime,
      endTime: new Date()
    };

    try {
      // Get admin user
      const adminUser = await db
        .select()
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);

      if (!adminUser.length) {
        result.errors.push({ 
          platform: "system", 
          error: "No admin user found" 
        });
        result.endTime = new Date();
        logger.error("❌ Course discovery: No admin user found");
        return result;
      }

      const userId = adminUser[0].id;

      // Get platforms
      const platformList = await db
        .select()
        .from(platforms)
        .where(eq(platforms.isActive, true))
        .limit(limit);

      result.platformsProcessed = platformList.length;

      for (const platform of platformList) {
        const platformCode = platform.code;
        const coursesForPlatform = PLATFORM_COURSE_DATA[platformCode] || [];

        if (coursesForPlatform.length === 0) {
          continue; // Skip platforms with no course data
        }

        result.platformsWithCourses++;

        try {
          for (const courseData of coursesForPlatform) {
            try {
              await db.insert(courses).values({
                userId,
                platformId: platform.id,
                title: courseData.title,
                description: courseData.description || null,
                courseUrl: courseData.courseUrl || null,
                imageUrl: courseData.imageUrl || null,
                category: courseData.category || null,
                language: courseData.language || null,
                cost: courseData.cost !== null && courseData.cost !== undefined 
                  ? courseData.cost.toString() 
                  : null,
                instructor: courseData.instructor || null,
                difficulty: courseData.difficulty || null,
                duration: courseData.duration || null,
                externalCourseId: courseData.externalCourseId || null,
                status: "not_started",
              });

              result.totalSaved++;
            } catch (err) {
              logger.warn(`Error saving course "${courseData.title}" for ${platform.name}: ${err}`);
            }
          }
        } catch (err) {
          result.errors.push({
            platform: platform.name,
            error: String(err)
          });
        }
      }

      result.success = true;
      result.endTime = new Date();
      return result;

    } catch (error) {
      result.errors.push({
        platform: "system",
        error: String(error)
      });
      result.endTime = new Date();
      return result;
    }
  }
}

export const courseDiscoveryService = new CourseDiscoveryService();
