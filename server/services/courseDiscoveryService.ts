import { db } from "../db";
import { platforms, courses, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const PLATFORM_COURSE_DATA: Record<string, CourseData[]> = {
  coursera: [
    { title: "Machine Learning by Andrew Ng", description: "Learn machine learning fundamentals", courseUrl: "https://coursera.org/learn/machine-learning", category: "Data Science", language: "en", cost: 0, instructor: "Andrew Ng", difficulty: "intermediate", duration: 3600, externalCourseId: "coursera-ml" },
    { title: "Python for Everybody", description: "Beginner's guide to Python programming", courseUrl: "https://coursera.org/learn/python-for-everybody", category: "Programming", language: "en", cost: 0, instructor: "Dr. Charles Severance", difficulty: "beginner", duration: 2400, externalCourseId: "coursera-python" }
  ],
  edx: [
    { title: "CS50's Introduction to Computer Science", description: "Harvard's intro to CS", courseUrl: "https://edx.org/course/cs50x", category: "Computer Science", language: "en", cost: 0, instructor: "David J. Malan", difficulty: "beginner", duration: 4000, externalCourseId: "edx-cs50" },
    { title: "Introduction to Linux", description: "Learn Linux fundamentals", courseUrl: "https://edx.org/course/introduction-linux", category: "System Administration", language: "en", cost: 0, difficulty: "beginner", duration: 3000, externalCourseId: "edx-linux" }
  ],
  udemy: [
    { title: "Complete Python Bootcamp", description: "Comprehensive Python course", courseUrl: "https://udemy.com/course/python-bootcamp", category: "Programming", language: "en", cost: 12.99, instructor: "Jose Portilla", difficulty: "beginner", duration: 2200, externalCourseId: "udemy-python" },
    { title: "The Web Developer Bootcamp", description: "Full-stack web development", courseUrl: "https://udemy.com/course/web-developer-bootcamp", category: "Web Development", language: "en", cost: 14.99, instructor: "Colt Steele", difficulty: "beginner", duration: 2600, externalCourseId: "udemy-web" }
  ],
  stepik: [
    { title: "Обучение Python на русском", description: "Полный курс Python для начинающих", courseUrl: "https://stepik.org/course/67", category: "Программирование", language: "ru", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "stepik-python" },
    { title: "Web-разработка на Python и Django", description: "Django веб-разработка", courseUrl: "https://stepik.org/course/3236", category: "Веб-разработка", language: "ru", cost: 0, instructor: "Mykola Horovyy", difficulty: "intermediate", duration: 3000, externalCourseId: "stepik-django" }
  ],
  skillbox: [
    { title: "Профессия: Data Scientist на Python", description: "Полное обучение профессии Data Scientist", courseUrl: "https://skillbox.ru/course/data-scientist", category: "Data Science", language: "ru", cost: 5990, difficulty: "intermediate", duration: 5000, externalCourseId: "skillbox-ds" },
    { title: "Профессия: Full-Stack разработчик на JavaScript", description: "Обучение full-stack разработке", courseUrl: "https://skillbox.ru/course/fullstack-js", category: "Web Development", language: "ru", cost: 5490, difficulty: "intermediate", duration: 4500, externalCourseId: "skillbox-fullstack" }
  ],
  pluralsight: [
    { title: "AWS Certified Solutions Architect", description: "Prepare for AWS certification", courseUrl: "https://pluralsight.com/courses/aws-certified-solutions-architect", category: "Cloud Computing", language: "en", cost: 0, difficulty: "intermediate", duration: 3600, externalCourseId: "pluralsight-aws" },
    { title: "C# Programming Fundamentals", description: "Learn C# from basics", courseUrl: "https://pluralsight.com/courses/csharp-fundamentals", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 3000, externalCourseId: "pluralsight-csharp" }
  ],
  codecademy: [
    { title: "Learn Python 3", description: "Interactive Python programming course", courseUrl: "https://codecademy.com/learn/learn-python-3", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 1500, externalCourseId: "codecademy-python" },
    { title: "Learn JavaScript", description: "Interactive JavaScript course", courseUrl: "https://codecademy.com/learn/learn-javascript", category: "Web Development", language: "en", cost: 0, difficulty: "beginner", duration: 1200, externalCourseId: "codecademy-js" }
  ],
  datacamp: [
    { title: "Introduction to Python for Data Analysis", description: "Python for data science", courseUrl: "https://datacamp.com/courses/intro-to-python-for-data-science", category: "Data Science", language: "en", cost: 0, difficulty: "beginner", duration: 240, externalCourseId: "datacamp-python" },
    { title: "Introduction to AI Concepts", description: "AI fundamentals course", courseUrl: "https://datacamp.com/courses/intro-to-ai", category: "Artificial Intelligence", language: "en", cost: 0, difficulty: "beginner", duration: 120, externalCourseId: "datacamp-ai" }
  ],
  treehouse: [
    { title: "JavaScript Basics", description: "Learn JavaScript fundamentals", courseUrl: "https://teamtreehouse.com/library/javascript-basics", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "treehouse-js" },
    { title: "HTML & CSS", description: "Web design basics", courseUrl: "https://teamtreehouse.com/library/html-css", category: "Web Design", language: "en", cost: 0, difficulty: "beginner", duration: 2000, externalCourseId: "treehouse-html" }
  ],
  "linkedin-learning": [
    { title: "Python Essential Training", description: "Python fundamentals", courseUrl: "https://linkedin.com/learning/python-essential-training", category: "Programming", language: "en", cost: 0, instructor: "Ryan Mitchell", difficulty: "beginner", duration: 185, externalCourseId: "linkedin-python" },
    { title: "SQL Essential Training", description: "Learn SQL databases", courseUrl: "https://linkedin.com/learning/learning-sql", category: "Databases", language: "en", cost: 0, instructor: "Walter Shields", difficulty: "beginner", duration: 108, externalCourseId: "linkedin-sql" }
  ],
  "khan-academy": [
    { title: "Intro to Computer Science with Python", description: "Free Python programming course", courseUrl: "https://khanacademy.org/computing/intro-to-python-fundamentals", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 2000, externalCourseId: "khan-python" },
    { title: "Intro to Computer Science with JavaScript", description: "JavaScript for beginners", courseUrl: "https://khanacademy.org/computing/computer-programming/intro-to-programming", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 1800, externalCourseId: "khan-js" }
  ],
  duolingo: [
    { title: "Spanish Language Learning", description: "Learn Spanish interactively", courseUrl: "https://duolingo.com/course/es/learn-spanish", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 0, externalCourseId: "duolingo-es" },
    { title: "French Language Learning", description: "Learn French interactively", courseUrl: "https://duolingo.com/course/fr/learn-french", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 0, externalCourseId: "duolingo-fr" }
  ],
  memrise: [
    { title: "Learn Spanish: Vocabulary & Phrases", description: "Spanish language with native speakers", courseUrl: "https://memrise.com/course/learn-spanish", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 1200, externalCourseId: "memrise-spanish" },
    { title: "Learn German: Fundamentals", description: "German language basics", courseUrl: "https://memrise.com/course/learn-german", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 1500, externalCourseId: "memrise-german" }
  ],
  "futurelearn": [
    { title: "English in Early Childhood", description: "Language development course", courseUrl: "https://futurelearn.com/courses/english-early-childhood", category: "Education", language: "en", cost: 0, difficulty: "intermediate", duration: 1200, externalCourseId: "futurelearn-english" },
    { title: "AI & Business: Strategy for Leaders", description: "AI for business strategy", courseUrl: "https://futurelearn.com/courses/ai-strategy", category: "Artificial Intelligence", language: "en", cost: 0, difficulty: "intermediate", duration: 1500, externalCourseId: "futurelearn-ai" }
  ],
  "yandex-praktikum": [
    { title: "Frontend разработчик", description: "Полное обучение веб-разработке", courseUrl: "https://practicum.yandex.ru/frontend", category: "Web Development", language: "ru", cost: 0, difficulty: "intermediate", duration: 4800, externalCourseId: "yandex-frontend" },
    { title: "Data Analyst", description: "Обучение анализу данных", courseUrl: "https://practicum.yandex.ru/data-analyst", category: "Data Analysis", language: "ru", cost: 0, difficulty: "intermediate", duration: 3600, externalCourseId: "yandex-analyst" }
  ],
  netology: [
    { title: "Data Scientist", description: "Профессиональное обучение data science", courseUrl: "https://netology.ru/programs/data-scientist", category: "Data Science", language: "ru", cost: 0, difficulty: "intermediate", duration: 3000, externalCourseId: "netology-ds" },
    { title: "Python Developer", description: "Обучение Python разработке", courseUrl: "https://netology.ru/programs/python", category: "Programming", language: "ru", cost: 0, difficulty: "intermediate", duration: 3600, externalCourseId: "netology-python" }
  ],
  "mit-ocw": [
    { title: "Introduction to Computer Science", description: "MIT's intro CS course", courseUrl: "https://ocw.mit.edu/courses/introduction-to-computer-science", category: "Computer Science", language: "en", cost: 0, difficulty: "intermediate", duration: 2000, externalCourseId: "mit-cs" },
    { title: "Linear Algebra", description: "Linear algebra fundamentals", courseUrl: "https://ocw.mit.edu/courses/mathematics/linear-algebra", category: "Mathematics", language: "en", cost: 0, difficulty: "advanced", duration: 3000, externalCourseId: "mit-linear" }
  ],
  brilliant: [
    { title: "Computer Science Fundamentals", description: "Interactive CS course", courseUrl: "https://brilliant.org/courses/computer-science", category: "Computer Science", language: "en", cost: 0, difficulty: "beginner", duration: 2000, externalCourseId: "brilliant-cs" },
    { title: "Neural Networks", description: "Machine learning neural networks", courseUrl: "https://brilliant.org/courses/neural-networks", category: "Machine Learning", language: "en", cost: 0, difficulty: "advanced", duration: 1500, externalCourseId: "brilliant-nn" }
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
      const adminUser = await db
        .select()
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);

      if (!adminUser.length) {
        result.errors.push({ platform: "system", error: "No admin user found" });
        result.endTime = new Date();
        return result;
      }

      const userId = adminUser[0].id;

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
          continue;
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
                instructor: courseData.instructor || null,
                difficulty: courseData.difficulty || null,
                duration: courseData.duration || null,
                externalCourseId: courseData.externalCourseId || null,
                status: "not_started",
              });

              result.totalSaved++;
            } catch (err) {
              logger.warn(`Error saving course "${courseData.title}" for ${platform.name}`);
            }
          }
        } catch (err) {
          result.errors.push({ platform: platform.name, error: String(err) });
        }
      }

      result.success = true;
      result.endTime = new Date();
      return result;

    } catch (error) {
      result.errors.push({ platform: "system", error: String(error) });
      result.endTime = new Date();
      return result;
    }
  }
}

export const courseDiscoveryService = new CourseDiscoveryService();
