import { db } from "../db";
import { platforms, courses, users } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "./logger";

export const PLATFORM_COURSE_DATA: Record<string, CourseData[]> = {
  coursera: [
    { title: "Machine Learning by Andrew Ng", description: "Learn machine learning fundamentals from Stanford professor", courseUrl: "https://coursera.org/learn/machine-learning", category: "Data Science", language: "en", cost: 0, instructor: "Andrew Ng", difficulty: "intermediate", duration: 3600, externalCourseId: "coursera-ml" },
    { title: "Python for Everybody", description: "Beginner's guide to Python programming", courseUrl: "https://coursera.org/learn/python-for-everybody", category: "Programming", language: "en", cost: 0, instructor: "Dr. Charles Severance", difficulty: "beginner", duration: 2400, externalCourseId: "coursera-python" },
    { title: "Google Data Analytics Professional Certificate", description: "Prepare for a career in data analytics", courseUrl: "https://coursera.org/professional-certificates/google-data-analytics", category: "Data Analytics", language: "en", cost: 0, instructor: "Google", difficulty: "beginner", duration: 4800, externalCourseId: "coursera-google-data" },
    { title: "Deep Learning Specialization", description: "Master deep learning and neural networks", courseUrl: "https://coursera.org/specializations/deep-learning", category: "Machine Learning", language: "en", cost: 0, instructor: "Andrew Ng", difficulty: "advanced", duration: 6000, externalCourseId: "coursera-deep-learning" }
  ],
  edx: [
    { title: "CS50's Introduction to Computer Science", description: "Harvard's intro to computer science", courseUrl: "https://edx.org/course/cs50x", category: "Computer Science", language: "en", cost: 0, instructor: "David J. Malan", difficulty: "beginner", duration: 4000, externalCourseId: "edx-cs50" },
    { title: "Introduction to Linux", description: "Learn Linux fundamentals from Linux Foundation", courseUrl: "https://edx.org/course/introduction-linux", category: "System Administration", language: "en", cost: 0, difficulty: "beginner", duration: 3000, externalCourseId: "edx-linux" },
    { title: "Data Science: Machine Learning", description: "Harvard's machine learning course", courseUrl: "https://edx.org/course/data-science-machine-learning", category: "Machine Learning", language: "en", cost: 0, instructor: "Rafael Irizarry", difficulty: "intermediate", duration: 3200, externalCourseId: "edx-ml" },
    { title: "AWS Cloud Technical Essentials", description: "Cloud computing fundamentals with AWS", courseUrl: "https://edx.org/course/aws-cloud-technical-essentials", category: "Cloud Computing", language: "en", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "edx-aws" }
  ],
  udemy: [
    { title: "Complete Python Bootcamp", description: "Comprehensive Python course from zero to hero", courseUrl: "https://udemy.com/course/python-bootcamp", category: "Programming", language: "en", cost: 12.99, instructor: "Jose Portilla", difficulty: "beginner", duration: 2200, externalCourseId: "udemy-python" },
    { title: "The Web Developer Bootcamp 2024", description: "Full-stack web development with HTML, CSS, JS, Node", courseUrl: "https://udemy.com/course/web-developer-bootcamp", category: "Web Development", language: "en", cost: 14.99, instructor: "Colt Steele", difficulty: "beginner", duration: 2600, externalCourseId: "udemy-web" },
    { title: "React - The Complete Guide 2024", description: "React JS & Redux complete guide", courseUrl: "https://udemy.com/course/react-the-complete-guide", category: "Web Development", language: "en", cost: 13.99, instructor: "Maximilian Schwarzmüller", difficulty: "intermediate", duration: 4800, externalCourseId: "udemy-react" },
    { title: "Machine Learning A-Z", description: "Hands-on Python & R in Data Science", courseUrl: "https://udemy.com/course/machinelearning", category: "Machine Learning", language: "en", cost: 11.99, instructor: "Kirill Eremenko", difficulty: "beginner", duration: 4400, externalCourseId: "udemy-ml" }
  ],
  stepik: [
    { title: "Программирование на Python", description: "Полный курс Python для начинающих", courseUrl: "https://stepik.org/course/67", category: "Программирование", language: "ru", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "stepik-python" },
    { title: "Алгоритмы: теория и практика", description: "Основы алгоритмов и структур данных", courseUrl: "https://stepik.org/course/217", category: "Алгоритмы", language: "ru", cost: 0, difficulty: "intermediate", duration: 3000, externalCourseId: "stepik-algorithms" },
    { title: "Введение в Data Science и машинное обучение", description: "Основы Data Science на Python", courseUrl: "https://stepik.org/course/4852", category: "Data Science", language: "ru", cost: 0, difficulty: "intermediate", duration: 2800, externalCourseId: "stepik-ds" },
    { title: "Web-разработка на Django", description: "Django веб-разработка от основ", courseUrl: "https://stepik.org/course/3236", category: "Веб-разработка", language: "ru", cost: 0, difficulty: "intermediate", duration: 3000, externalCourseId: "stepik-django" }
  ],
  skillbox: [
    { title: "Python-разработчик", description: "Самый популярный курс - 28% продаж платформы", courseUrl: "https://skillbox.ru/course/python-developer", category: "Программирование", language: "ru", cost: 5990, difficulty: "beginner", duration: 5000, externalCourseId: "skillbox-python" },
    { title: "Java-разработчик", description: "Профессия backend разработчика на Java", courseUrl: "https://skillbox.ru/course/java-developer", category: "Программирование", language: "ru", cost: 5990, difficulty: "beginner", duration: 4800, externalCourseId: "skillbox-java" },
    { title: "Инженер по тестированию", description: "Быстрый старт в IT - QA Engineer", courseUrl: "https://skillbox.ru/course/qa-engineer", category: "Тестирование", language: "ru", cost: 4990, difficulty: "beginner", duration: 3600, externalCourseId: "skillbox-qa" },
    { title: "Data Science с нуля", description: "Профессия Data Scientist на Python", courseUrl: "https://skillbox.ru/course/data-scientist", category: "Data Science", language: "ru", cost: 5990, difficulty: "intermediate", duration: 5000, externalCourseId: "skillbox-ds" },
    { title: "Frontend-разработчик", description: "Современная веб-разработка на React", courseUrl: "https://skillbox.ru/course/frontend-developer", category: "Web Development", language: "ru", cost: 5490, difficulty: "intermediate", duration: 4500, externalCourseId: "skillbox-frontend" }
  ],
  geekbrains: [
    { title: "Python-разработчик", description: "Профессия разработчика, зарплата 192-200K ₽/мес", courseUrl: "https://gb.ru/professions/python-developer", category: "Программирование", language: "ru", cost: 4990, difficulty: "beginner", duration: 5400, externalCourseId: "geekbrains-python" },
    { title: "JavaScript-разработчик", description: "Полный курс JS, зарплата 200K ₽/мес", courseUrl: "https://gb.ru/professions/javascript-developer", category: "Программирование", language: "ru", cost: 4990, difficulty: "beginner", duration: 4800, externalCourseId: "geekbrains-js" },
    { title: "Java-разработчик", description: "Enterprise и Android разработка", courseUrl: "https://gb.ru/professions/java-developer", category: "Программирование", language: "ru", cost: 4990, difficulty: "beginner", duration: 5400, externalCourseId: "geekbrains-java" },
    { title: "Тестировщик ПО", description: "Самый быстрый вход в IT - 3-6 месяцев", courseUrl: "https://gb.ru/professions/qa-engineer", category: "Тестирование", language: "ru", cost: 3990, difficulty: "beginner", duration: 3000, externalCourseId: "geekbrains-qa" },
    { title: "Data Science", description: "Профессия аналитика данных, зарплата 150K+ ₽", courseUrl: "https://gb.ru/professions/data-scientist", category: "Data Science", language: "ru", cost: 5490, difficulty: "intermediate", duration: 4800, externalCourseId: "geekbrains-ds" },
    { title: "Frontend-разработчик", description: "React и современная веб-разработка", courseUrl: "https://gb.ru/professions/frontend-developer", category: "Web Development", language: "ru", cost: 4990, difficulty: "beginner", duration: 4200, externalCourseId: "geekbrains-frontend" }
  ],
  pluralsight: [
    { title: "AWS Certified Solutions Architect", description: "Prepare for AWS certification exam", courseUrl: "https://pluralsight.com/paths/aws-certified-solutions-architect", category: "Cloud Computing", language: "en", cost: 29, difficulty: "intermediate", duration: 3600, externalCourseId: "pluralsight-aws" },
    { title: "C# Programming Fundamentals", description: "Learn C# from basics to advanced", courseUrl: "https://pluralsight.com/paths/csharp", category: "Programming", language: "en", cost: 29, difficulty: "beginner", duration: 3000, externalCourseId: "pluralsight-csharp" },
    { title: "Ethical Hacking with Kali Linux", description: "Cybersecurity 8-course series", courseUrl: "https://pluralsight.com/paths/ethical-hacking", category: "Cybersecurity", language: "en", cost: 29, difficulty: "intermediate", duration: 2880, externalCourseId: "pluralsight-hacking" },
    { title: "Python for Data Science", description: "End-to-end data science projects", courseUrl: "https://pluralsight.com/paths/python-data-science", category: "Data Science", language: "en", cost: 29, difficulty: "intermediate", duration: 3200, externalCourseId: "pluralsight-python-ds" },
    { title: "Core Python", description: "Web development with object-oriented design", courseUrl: "https://pluralsight.com/paths/core-python", category: "Programming", language: "en", cost: 29, difficulty: "beginner", duration: 2400, externalCourseId: "pluralsight-core-python" }
  ],
  codecademy: [
    { title: "Learn Python 3", description: "Interactive Python programming course", courseUrl: "https://codecademy.com/learn/learn-python-3", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 1500, externalCourseId: "codecademy-python" },
    { title: "Learn JavaScript", description: "Interactive JavaScript fundamentals", courseUrl: "https://codecademy.com/learn/learn-javascript", category: "Web Development", language: "en", cost: 0, difficulty: "beginner", duration: 1200, externalCourseId: "codecademy-js" },
    { title: "Learn HTML", description: "Web page structure fundamentals", courseUrl: "https://codecademy.com/learn/learn-html", category: "Web Development", language: "en", cost: 0, difficulty: "beginner", duration: 600, externalCourseId: "codecademy-html" },
    { title: "Learn React", description: "React JS library for building UIs", courseUrl: "https://codecademy.com/learn/react-101", category: "Web Development", language: "en", cost: 0, difficulty: "intermediate", duration: 1200, externalCourseId: "codecademy-react" },
    { title: "Learn SQL", description: "Database query language", courseUrl: "https://codecademy.com/learn/learn-sql", category: "Databases", language: "en", cost: 0, difficulty: "beginner", duration: 900, externalCourseId: "codecademy-sql" }
  ],
  freecodecamp: [
    { title: "Responsive Web Design Certification", description: "HTML, CSS and responsive design projects", courseUrl: "https://freecodecamp.org/learn/responsive-web-design", category: "Web Development", language: "en", cost: 0, difficulty: "beginner", duration: 1800, externalCourseId: "fcc-responsive" },
    { title: "JavaScript Algorithms and Data Structures", description: "Core programming concepts with JavaScript", courseUrl: "https://freecodecamp.org/learn/javascript-algorithms-and-data-structures", category: "Programming", language: "en", cost: 0, difficulty: "intermediate", duration: 1800, externalCourseId: "fcc-js-algorithms" },
    { title: "Front End Development Libraries", description: "React, Redux, jQuery, Bootstrap", courseUrl: "https://freecodecamp.org/learn/front-end-development-libraries", category: "Web Development", language: "en", cost: 0, difficulty: "intermediate", duration: 1800, externalCourseId: "fcc-frontend" },
    { title: "Data Visualization", description: "D3.js charts and graphics", courseUrl: "https://freecodecamp.org/learn/data-visualization", category: "Data Visualization", language: "en", cost: 0, difficulty: "intermediate", duration: 1800, externalCourseId: "fcc-dataviz" },
    { title: "Machine Learning with Python", description: "TensorFlow and neural networks", courseUrl: "https://freecodecamp.org/learn/machine-learning-with-python", category: "Machine Learning", language: "en", cost: 0, difficulty: "advanced", duration: 1800, externalCourseId: "fcc-ml" },
    { title: "Scientific Computing with Python", description: "Python fundamentals and scientific computing", courseUrl: "https://freecodecamp.org/learn/scientific-computing-with-python", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 1800, externalCourseId: "fcc-python" }
  ],
  sololearn: [
    { title: "Introduction to Python", description: "7.1M+ learners - beginner-friendly Python", courseUrl: "https://sololearn.com/learn/courses/python-introduction", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 600, externalCourseId: "sololearn-python" },
    { title: "Introduction to HTML", description: "7.5M+ learners - web page structure", courseUrl: "https://sololearn.com/learn/courses/html-introduction", category: "Web Development", language: "en", cost: 0, difficulty: "beginner", duration: 480, externalCourseId: "sololearn-html" },
    { title: "Introduction to Java", description: "4.7M+ learners - object-oriented programming", courseUrl: "https://sololearn.com/learn/courses/java-introduction", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 600, externalCourseId: "sololearn-java" },
    { title: "JavaScript Intermediate", description: "Interactive UI development", courseUrl: "https://sololearn.com/learn/courses/javascript-intermediate", category: "Web Development", language: "en", cost: 0, difficulty: "intermediate", duration: 480, externalCourseId: "sololearn-js-int" },
    { title: "SQL Introduction", description: "Database queries and management", courseUrl: "https://sololearn.com/learn/courses/sql-introduction", category: "Databases", language: "en", cost: 0, difficulty: "beginner", duration: 420, externalCourseId: "sololearn-sql" },
    { title: "React + Redux", description: "Modern JavaScript library for UIs", courseUrl: "https://sololearn.com/learn/courses/react", category: "Web Development", language: "en", cost: 0, difficulty: "intermediate", duration: 600, externalCourseId: "sololearn-react" }
  ],
  datacamp: [
    { title: "Introduction to Python", description: "Most popular - 4 hours, data science basics", courseUrl: "https://datacamp.com/courses/intro-to-python-for-data-science", category: "Data Science", language: "en", cost: 0, difficulty: "beginner", duration: 240, externalCourseId: "datacamp-python" },
    { title: "Understanding Artificial Intelligence", description: "AI fundamentals course 2024", courseUrl: "https://datacamp.com/courses/understanding-artificial-intelligence", category: "Artificial Intelligence", language: "en", cost: 0, difficulty: "beginner", duration: 180, externalCourseId: "datacamp-ai" },
    { title: "Introduction to ChatGPT", description: "Prompt engineering for beginners", courseUrl: "https://datacamp.com/courses/introduction-to-chatgpt", category: "Artificial Intelligence", language: "en", cost: 0, difficulty: "beginner", duration: 120, externalCourseId: "datacamp-chatgpt" },
    { title: "Working with the OpenAI API", description: "Build chatbots and AI applications", courseUrl: "https://datacamp.com/courses/working-with-openai-api", category: "Artificial Intelligence", language: "en", cost: 0, difficulty: "advanced", duration: 240, externalCourseId: "datacamp-openai" },
    { title: "Introduction to SQL", description: "Database querying basics", courseUrl: "https://datacamp.com/courses/introduction-to-sql", category: "Databases", language: "en", cost: 0, difficulty: "beginner", duration: 240, externalCourseId: "datacamp-sql" },
    { title: "Introduction to Power BI", description: "Business intelligence dashboards", courseUrl: "https://datacamp.com/courses/introduction-to-power-bi", category: "Data Analytics", language: "en", cost: 0, difficulty: "beginner", duration: 240, externalCourseId: "datacamp-powerbi" }
  ],
  treehouse: [
    { title: "JavaScript Basics", description: "Learn JavaScript fundamentals", courseUrl: "https://teamtreehouse.com/library/javascript-basics", category: "Programming", language: "en", cost: 25, difficulty: "beginner", duration: 2400, externalCourseId: "treehouse-js" },
    { title: "HTML & CSS Basics", description: "Web design fundamentals", courseUrl: "https://teamtreehouse.com/library/html-css", category: "Web Design", language: "en", cost: 25, difficulty: "beginner", duration: 2000, externalCourseId: "treehouse-html" },
    { title: "Python Basics", description: "Python programming from scratch", courseUrl: "https://teamtreehouse.com/library/python-basics", category: "Programming", language: "en", cost: 25, difficulty: "beginner", duration: 1800, externalCourseId: "treehouse-python" },
    { title: "Full-Stack JavaScript", description: "Node.js and React development", courseUrl: "https://teamtreehouse.com/techdegree/full-stack-javascript", category: "Web Development", language: "en", cost: 50, difficulty: "intermediate", duration: 4800, externalCourseId: "treehouse-fullstack" }
  ],
  "linkedin-learning": [
    { title: "Excel Essential Training (Microsoft 365)", description: "#1 most popular course - data, formulas, Copilot", courseUrl: "https://linkedin.com/learning/excel-essential-training-microsoft-365", category: "Productivity", language: "en", cost: 30, difficulty: "beginner", duration: 420, externalCourseId: "linkedin-excel" },
    { title: "Python Essential Training", description: "Python programming fundamentals", courseUrl: "https://linkedin.com/learning/python-essential-training", category: "Programming", language: "en", cost: 30, instructor: "Ryan Mitchell", difficulty: "beginner", duration: 185, externalCourseId: "linkedin-python" },
    { title: "Power BI Essential Training", description: "Business analytics dashboards", courseUrl: "https://linkedin.com/learning/power-bi-essential-training", category: "Data Analytics", language: "en", cost: 30, difficulty: "beginner", duration: 300, externalCourseId: "linkedin-powerbi" },
    { title: "Project Management Foundations", description: "Project planning and resource management", courseUrl: "https://linkedin.com/learning/project-management-foundations", category: "Business", language: "en", cost: 30, difficulty: "beginner", duration: 240, externalCourseId: "linkedin-pm" },
    { title: "Introduction to Large Language Models", description: "ChatGPT and NLP fundamentals", courseUrl: "https://linkedin.com/learning/introduction-to-large-language-models", category: "Artificial Intelligence", language: "en", cost: 30, difficulty: "beginner", duration: 180, externalCourseId: "linkedin-llm" }
  ],
  "khan-academy": [
    { title: "Intro to Computer Science with Python", description: "Free Python programming course", courseUrl: "https://khanacademy.org/computing/intro-to-python-fundamentals", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 2000, externalCourseId: "khan-python" },
    { title: "Intro to Programming with JavaScript", description: "Drawing and animation with code", courseUrl: "https://khanacademy.org/computing/computer-programming", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 1800, externalCourseId: "khan-js" },
    { title: "Algebra 1", description: "Variables, equations, functions", courseUrl: "https://khanacademy.org/math/algebra", category: "Mathematics", language: "en", cost: 0, difficulty: "beginner", duration: 3600, externalCourseId: "khan-algebra1" },
    { title: "AP Calculus AB", description: "Advanced high school math", courseUrl: "https://khanacademy.org/math/ap-calculus-ab", category: "Mathematics", language: "en", cost: 0, difficulty: "advanced", duration: 4800, externalCourseId: "khan-calculus" },
    { title: "High School Biology", description: "Cells, genetics, evolution - NGSS-aligned", courseUrl: "https://khanacademy.org/science/high-school-biology", category: "Science", language: "en", cost: 0, difficulty: "intermediate", duration: 3000, externalCourseId: "khan-biology" },
    { title: "Statistics and Probability", description: "Data analysis and probability", courseUrl: "https://khanacademy.org/math/statistics-probability", category: "Mathematics", language: "en", cost: 0, difficulty: "intermediate", duration: 3600, externalCourseId: "khan-stats" }
  ],
  duolingo: [
    { title: "Spanish Language Course", description: "Learn Spanish interactively - 30+ languages", courseUrl: "https://duolingo.com/course/es", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 0, externalCourseId: "duolingo-es" },
    { title: "French Language Course", description: "Learn French with gamification", courseUrl: "https://duolingo.com/course/fr", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 0, externalCourseId: "duolingo-fr" },
    { title: "German Language Course", description: "Learn German interactively", courseUrl: "https://duolingo.com/course/de", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 0, externalCourseId: "duolingo-de" },
    { title: "Japanese Language Course", description: "Learn Japanese hiragana, katakana, kanji", courseUrl: "https://duolingo.com/course/ja", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 0, externalCourseId: "duolingo-ja" },
    { title: "Russian Language Course", description: "Learn Russian alphabet and basics", courseUrl: "https://duolingo.com/course/ru", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 0, externalCourseId: "duolingo-ru" }
  ],
  babbel: [
    { title: "Spanish Complete Course", description: "Conversation-focused, 14 languages available", courseUrl: "https://babbel.com/learn-spanish", category: "Languages", language: "en", cost: 13.95, difficulty: "beginner", duration: 3600, externalCourseId: "babbel-spanish" },
    { title: "French Complete Course", description: "Practical phrases and grammar", courseUrl: "https://babbel.com/learn-french", category: "Languages", language: "en", cost: 13.95, difficulty: "beginner", duration: 3600, externalCourseId: "babbel-french" },
    { title: "German Complete Course", description: "Strong grammar integration", courseUrl: "https://babbel.com/learn-german", category: "Languages", language: "en", cost: 13.95, difficulty: "beginner", duration: 3600, externalCourseId: "babbel-german" },
    { title: "Italian Complete Course", description: "Cultural context included", courseUrl: "https://babbel.com/learn-italian", category: "Languages", language: "en", cost: 13.95, difficulty: "beginner", duration: 3600, externalCourseId: "babbel-italian" }
  ],
  busuu: [
    { title: "Spanish Course A1-B2", description: "CEFR-aligned with native speaker feedback", courseUrl: "https://busuu.com/learn-spanish", category: "Languages", language: "en", cost: 10, difficulty: "beginner", duration: 3600, externalCourseId: "busuu-spanish" },
    { title: "French Course A1-B2", description: "Video clips of native speakers", courseUrl: "https://busuu.com/learn-french", category: "Languages", language: "en", cost: 10, difficulty: "beginner", duration: 3600, externalCourseId: "busuu-french" },
    { title: "Japanese Course", description: "Community feedback from native speakers", courseUrl: "https://busuu.com/learn-japanese", category: "Languages", language: "en", cost: 10, difficulty: "beginner", duration: 4200, externalCourseId: "busuu-japanese" },
    { title: "Chinese Course", description: "Mandarin with McGraw-Hill certification", courseUrl: "https://busuu.com/learn-chinese", category: "Languages", language: "en", cost: 10, difficulty: "beginner", duration: 4200, externalCourseId: "busuu-chinese" }
  ],
  memrise: [
    { title: "Learn Spanish Vocabulary", description: "Best for rapid vocab acquisition", courseUrl: "https://memrise.com/course/learn-spanish", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 1200, externalCourseId: "memrise-spanish" },
    { title: "Learn German Vocabulary", description: "Spaced repetition for memory", courseUrl: "https://memrise.com/course/learn-german", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 1500, externalCourseId: "memrise-german" },
    { title: "Learn French Vocabulary", description: "Video clips of native speakers", courseUrl: "https://memrise.com/course/learn-french", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 1200, externalCourseId: "memrise-french" },
    { title: "Learn Japanese Vocabulary", description: "Mnemonic techniques for memorization", courseUrl: "https://memrise.com/course/learn-japanese", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 1800, externalCourseId: "memrise-japanese" }
  ],
  futurelearn: [
    { title: "Digital Skills: Artificial Intelligence", description: "#3 most popular - Accenture partnership", courseUrl: "https://futurelearn.com/courses/artificial-intelligence", category: "Artificial Intelligence", language: "en", cost: 0, difficulty: "beginner", duration: 1200, externalCourseId: "futurelearn-ai" },
    { title: "Generative AI in Higher Education", description: "AI for educators 2024", courseUrl: "https://futurelearn.com/courses/generative-ai-education", category: "Artificial Intelligence", language: "en", cost: 0, difficulty: "intermediate", duration: 1200, externalCourseId: "futurelearn-gen-ai" },
    { title: "Critical Thinking", description: "University preparation skills", courseUrl: "https://futurelearn.com/courses/critical-thinking", category: "Education", language: "en", cost: 0, difficulty: "beginner", duration: 900, externalCourseId: "futurelearn-critical" },
    { title: "English in Early Childhood", description: "Language development course", courseUrl: "https://futurelearn.com/courses/english-early-childhood", category: "Education", language: "en", cost: 0, difficulty: "intermediate", duration: 1200, externalCourseId: "futurelearn-english" }
  ],
  "yandex-praktikum": [
    { title: "Python-разработчик", description: "9 месяцев, с нуля до профи, диплом", courseUrl: "https://practicum.yandex.ru/python-developer", category: "Программирование", language: "ru", cost: 18000, difficulty: "beginner", duration: 7200, externalCourseId: "yandex-python" },
    { title: "Frontend-разработчик", description: "HTML, CSS, JavaScript с нуля", courseUrl: "https://practicum.yandex.ru/frontend-developer", category: "Web Development", language: "ru", cost: 16000, difficulty: "beginner", duration: 6000, externalCourseId: "yandex-frontend" },
    { title: "Java-разработчик", description: "Backend разработка на Java", courseUrl: "https://practicum.yandex.ru/java-developer", category: "Программирование", language: "ru", cost: 18000, difficulty: "beginner", duration: 7200, externalCourseId: "yandex-java" },
    { title: "Аналитик данных", description: "6 месяцев, диплом о переподготовке", courseUrl: "https://practicum.yandex.ru/data-analyst", category: "Data Analysis", language: "ru", cost: 70000, difficulty: "beginner", duration: 4800, externalCourseId: "yandex-analyst" },
    { title: "Data Science", description: "8 месяцев продвинутого обучения", courseUrl: "https://practicum.yandex.ru/data-scientist", category: "Data Science", language: "ru", cost: 112000, difficulty: "intermediate", duration: 6400, externalCourseId: "yandex-ds" },
    { title: "Тестировщик", description: "4 месяца до первой работы", courseUrl: "https://practicum.yandex.ru/qa-engineer", category: "Тестирование", language: "ru", cost: 16000, difficulty: "beginner", duration: 3200, externalCourseId: "yandex-qa" },
    { title: "Android-разработчик", description: "Kotlin и мобильная разработка", courseUrl: "https://practicum.yandex.ru/android-developer", category: "Мобильная разработка", language: "ru", cost: 18000, difficulty: "beginner", duration: 6000, externalCourseId: "yandex-android" }
  ],
  netology: [
    { title: "Data Scientist", description: "Профессиональное обучение data science", courseUrl: "https://netology.ru/programs/data-scientist", category: "Data Science", language: "ru", cost: 89000, difficulty: "intermediate", duration: 5400, externalCourseId: "netology-ds" },
    { title: "Python-разработчик с нуля", description: "Обучение Python разработке", courseUrl: "https://netology.ru/programs/python", category: "Программирование", language: "ru", cost: 79000, difficulty: "beginner", duration: 5400, externalCourseId: "netology-python" },
    { title: "Fullstack-разработчик", description: "Frontend + Backend полный курс", courseUrl: "https://netology.ru/programs/fullstack", category: "Web Development", language: "ru", cost: 99000, difficulty: "intermediate", duration: 7200, externalCourseId: "netology-fullstack" },
    { title: "Java-разработчик с нуля", description: "Enterprise и Android", courseUrl: "https://netology.ru/programs/java", category: "Программирование", language: "ru", cost: 89000, difficulty: "beginner", duration: 6000, externalCourseId: "netology-java" }
  ],
  foxford: [
    { title: "Подготовка к ЕГЭ по информатике", description: "Полный курс подготовки к экзамену", courseUrl: "https://foxford.ru/courses/ege-informatika", category: "ЕГЭ", language: "ru", cost: 3990, difficulty: "intermediate", duration: 4800, externalCourseId: "foxford-ege-info" },
    { title: "Подготовка к ЕГЭ по математике", description: "Профильный уровень", courseUrl: "https://foxford.ru/courses/ege-math-prof", category: "ЕГЭ", language: "ru", cost: 3990, difficulty: "intermediate", duration: 5400, externalCourseId: "foxford-ege-math" },
    { title: "Программирование на Python для школьников", description: "Основы программирования", courseUrl: "https://foxford.ru/courses/python-school", category: "Программирование", language: "ru", cost: 2990, difficulty: "beginner", duration: 2400, externalCourseId: "foxford-python" },
    { title: "Олимпиадная математика", description: "Подготовка к олимпиадам", courseUrl: "https://foxford.ru/courses/olymp-math", category: "Математика", language: "ru", cost: 4990, difficulty: "advanced", duration: 3600, externalCourseId: "foxford-olymp" }
  ],
  hexlet: [
    { title: "Python-разработчик", description: "Профессия с практикой и менторством", courseUrl: "https://hexlet.io/programs/python", category: "Программирование", language: "ru", cost: 3900, difficulty: "beginner", duration: 4800, externalCourseId: "hexlet-python" },
    { title: "JavaScript-разработчик", description: "Frontend и Node.js", courseUrl: "https://hexlet.io/programs/javascript", category: "Web Development", language: "ru", cost: 3900, difficulty: "beginner", duration: 4800, externalCourseId: "hexlet-js" },
    { title: "PHP-разработчик", description: "Backend разработка на PHP", courseUrl: "https://hexlet.io/programs/php", category: "Web Development", language: "ru", cost: 3900, difficulty: "beginner", duration: 4200, externalCourseId: "hexlet-php" },
    { title: "Java-разработчик", description: "Enterprise Java разработка", courseUrl: "https://hexlet.io/programs/java", category: "Программирование", language: "ru", cost: 3900, difficulty: "beginner", duration: 4800, externalCourseId: "hexlet-java" }
  ],
  lektorium: [
    { title: "Введение в программирование", description: "Бесплатный курс программирования", courseUrl: "https://lektorium.tv/course/programming-intro", category: "Программирование", language: "ru", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "lektorium-prog" },
    { title: "Математический анализ", description: "Университетский курс", courseUrl: "https://lektorium.tv/course/math-analysis", category: "Математика", language: "ru", cost: 0, difficulty: "advanced", duration: 3600, externalCourseId: "lektorium-math" },
    { title: "Физика", description: "Общий курс физики", courseUrl: "https://lektorium.tv/course/physics", category: "Наука", language: "ru", cost: 0, difficulty: "intermediate", duration: 3000, externalCourseId: "lektorium-physics" }
  ],
  "mit-ocw": [
    { title: "Introduction to Computer Science (6.0001)", description: "MIT's intro CS course with Python", courseUrl: "https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python", category: "Computer Science", language: "en", cost: 0, instructor: "John Guttag", difficulty: "beginner", duration: 3600, externalCourseId: "mit-6001" },
    { title: "Linear Algebra (18.06)", description: "Gilbert Strang's famous course", courseUrl: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010", category: "Mathematics", language: "en", cost: 0, instructor: "Gilbert Strang", difficulty: "intermediate", duration: 4800, externalCourseId: "mit-1806" },
    { title: "Introduction to Algorithms (6.006)", description: "Algorithms and data structures", courseUrl: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020", category: "Algorithms", language: "en", cost: 0, difficulty: "intermediate", duration: 4200, externalCourseId: "mit-6006" },
    { title: "Machine Learning (6.867)", description: "Graduate-level ML course", courseUrl: "https://ocw.mit.edu/courses/6-867-machine-learning-fall-2006", category: "Machine Learning", language: "en", cost: 0, difficulty: "advanced", duration: 4800, externalCourseId: "mit-6867" }
  ],
  brilliant: [
    { title: "Computer Science Fundamentals", description: "Interactive problem-solving approach", courseUrl: "https://brilliant.org/courses/computer-science-fundamentals", category: "Computer Science", language: "en", cost: 25, difficulty: "beginner", duration: 2000, externalCourseId: "brilliant-cs" },
    { title: "Neural Networks", description: "Machine learning neural networks", courseUrl: "https://brilliant.org/courses/neural-networks", category: "Machine Learning", language: "en", cost: 25, difficulty: "advanced", duration: 1500, externalCourseId: "brilliant-nn" },
    { title: "Algebra Fundamentals", description: "Interactive math foundations", courseUrl: "https://brilliant.org/courses/algebra-fundamentals", category: "Mathematics", language: "en", cost: 25, difficulty: "beginner", duration: 1800, externalCourseId: "brilliant-algebra" },
    { title: "Calculus in a Nutshell", description: "Gamified calculus learning", courseUrl: "https://brilliant.org/courses/calculus-nutshell", category: "Mathematics", language: "en", cost: 25, difficulty: "intermediate", duration: 2000, externalCourseId: "brilliant-calculus" },
    { title: "Quantum Computing", description: "Quantum mechanics for computing", courseUrl: "https://brilliant.org/courses/quantum-computing", category: "Computer Science", language: "en", cost: 25, difficulty: "advanced", duration: 2400, externalCourseId: "brilliant-quantum" }
  ],
  skillshare: [
    { title: "ChatGPT for Creatives", description: "#1 most watched 2024 - AI in creative workflows", courseUrl: "https://skillshare.com/classes/chatgpt-creatives", category: "Artificial Intelligence", language: "en", cost: 39, difficulty: "beginner", duration: 120, externalCourseId: "skillshare-chatgpt" },
    { title: "Digital Illustration: Procreate", description: "Mindful approach to digital art", courseUrl: "https://skillshare.com/classes/procreate-digital-illustration", category: "Design", language: "en", cost: 39, instructor: "Mimi Chao", difficulty: "beginner", duration: 180, externalCourseId: "skillshare-procreate" },
    { title: "Mastering Productivity", description: "Create a custom productivity system", courseUrl: "https://skillshare.com/classes/mastering-productivity", category: "Productivity", language: "en", cost: 39, instructor: "Thomas Frank", difficulty: "beginner", duration: 120, externalCourseId: "skillshare-productivity" },
    { title: "Video Editing in Premiere Pro", description: "Professional video editing", courseUrl: "https://skillshare.com/classes/premiere-pro-video-editing", category: "Video", language: "en", cost: 39, instructor: "Jordy Vandeput", difficulty: "beginner", duration: 240, externalCourseId: "skillshare-premiere" },
    { title: "Graphic Design Basics", description: "Core principles for visual design", courseUrl: "https://skillshare.com/classes/graphic-design-basics", category: "Design", language: "en", cost: 39, difficulty: "beginner", duration: 180, externalCourseId: "skillshare-design" }
  ],
  masterclass: [
    { title: "Gordon Ramsay Teaches Cooking", description: "World-class culinary techniques", courseUrl: "https://masterclass.com/classes/gordon-ramsay-teaches-cooking", category: "Cooking", language: "en", cost: 120, instructor: "Gordon Ramsay", difficulty: "beginner", duration: 240, externalCourseId: "masterclass-ramsay" },
    { title: "Neil deGrasse Tyson Teaches Scientific Thinking", description: "Astrophysics and critical thinking", courseUrl: "https://masterclass.com/classes/neil-degrasse-tyson-scientific-thinking", category: "Science", language: "en", cost: 120, instructor: "Neil deGrasse Tyson", difficulty: "beginner", duration: 180, externalCourseId: "masterclass-tyson" },
    { title: "Chris Voss Teaches Negotiation", description: "FBI negotiator tactics", courseUrl: "https://masterclass.com/classes/chris-voss-teaches-negotiation", category: "Business", language: "en", cost: 120, instructor: "Chris Voss", difficulty: "intermediate", duration: 180, externalCourseId: "masterclass-voss" },
    { title: "Aaron Sorkin Teaches Screenwriting", description: "Oscar-winning writer on craft", courseUrl: "https://masterclass.com/classes/aaron-sorkin-teaches-screenwriting", category: "Writing", language: "en", cost: 120, instructor: "Aaron Sorkin", difficulty: "intermediate", duration: 240, externalCourseId: "masterclass-sorkin" }
  ],
  "microsoft-learn": [
    { title: "Azure Fundamentals (AZ-900)", description: "Cloud computing basics - free certification prep", courseUrl: "https://learn.microsoft.com/training/paths/azure-fundamentals", category: "Cloud Computing", language: "en", cost: 0, difficulty: "beginner", duration: 600, externalCourseId: "mslearn-az900" },
    { title: "AI Fundamentals", description: "Azure AI and machine learning basics", courseUrl: "https://learn.microsoft.com/training/paths/get-started-with-artificial-intelligence", category: "Artificial Intelligence", language: "en", cost: 0, difficulty: "beginner", duration: 480, externalCourseId: "mslearn-ai" },
    { title: "Power BI Data Analyst", description: "Business intelligence and reporting", courseUrl: "https://learn.microsoft.com/training/paths/data-analytics-microsoft", category: "Data Analytics", language: "en", cost: 0, difficulty: "intermediate", duration: 720, externalCourseId: "mslearn-powerbi" },
    { title: "Microsoft Copilot Fundamentals", description: "Generative AI with Microsoft 365", courseUrl: "https://learn.microsoft.com/training/paths/copilot-fundamentals", category: "Artificial Intelligence", language: "en", cost: 0, difficulty: "beginner", duration: 300, externalCourseId: "mslearn-copilot" },
    { title: "C# First Steps", description: "C# programming fundamentals", courseUrl: "https://learn.microsoft.com/training/paths/csharp-first-steps", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 420, externalCourseId: "mslearn-csharp" }
  ],
  "amazon-skill-builder": [
    { title: "AWS Cloud Practitioner Essentials", description: "AWS certification prep - free tier", courseUrl: "https://explore.skillbuilder.aws/learn/course/cloud-practitioner-essentials", category: "Cloud Computing", language: "en", cost: 0, difficulty: "beginner", duration: 360, externalCourseId: "aws-cpe" },
    { title: "AWS Solutions Architect Associate", description: "Design distributed systems on AWS", courseUrl: "https://explore.skillbuilder.aws/learn/course/solutions-architect", category: "Cloud Computing", language: "en", cost: 0, difficulty: "intermediate", duration: 720, externalCourseId: "aws-saa" },
    { title: "Machine Learning on AWS", description: "SageMaker and AI services", courseUrl: "https://explore.skillbuilder.aws/learn/course/machine-learning", category: "Machine Learning", language: "en", cost: 0, difficulty: "advanced", duration: 600, externalCourseId: "aws-ml" },
    { title: "AWS Security Fundamentals", description: "Cloud security best practices", courseUrl: "https://explore.skillbuilder.aws/learn/course/security-fundamentals", category: "Cybersecurity", language: "en", cost: 0, difficulty: "beginner", duration: 240, externalCourseId: "aws-security" }
  ],
  "stanford-online": [
    { title: "Machine Learning (CS229)", description: "Andrew Ng's Stanford ML course", courseUrl: "https://online.stanford.edu/courses/cs229-machine-learning", category: "Machine Learning", language: "en", cost: 0, instructor: "Andrew Ng", difficulty: "advanced", duration: 4800, externalCourseId: "stanford-ml" },
    { title: "Algorithms: Design and Analysis", description: "Core algorithms course", courseUrl: "https://online.stanford.edu/courses/algorithms-design-analysis", category: "Algorithms", language: "en", cost: 0, difficulty: "advanced", duration: 3600, externalCourseId: "stanford-algo" },
    { title: "Introduction to Statistics", description: "Statistical thinking and analysis", courseUrl: "https://online.stanford.edu/courses/introduction-to-statistics", category: "Statistics", language: "en", cost: 0, difficulty: "intermediate", duration: 3000, externalCourseId: "stanford-stats" }
  ],
  "harvard-online": [
    { title: "CS50: Introduction to Computer Science", description: "Harvard's famous intro CS course", courseUrl: "https://pll.harvard.edu/course/cs50-introduction-computer-science", category: "Computer Science", language: "en", cost: 0, instructor: "David J. Malan", difficulty: "beginner", duration: 4800, externalCourseId: "harvard-cs50" },
    { title: "Data Science: R Basics", description: "R programming for data science", courseUrl: "https://pll.harvard.edu/course/data-science-r-basics", category: "Data Science", language: "en", cost: 0, difficulty: "beginner", duration: 480, externalCourseId: "harvard-r" },
    { title: "Web Programming with Python and JavaScript", description: "Full-stack web development", courseUrl: "https://pll.harvard.edu/course/cs50s-web-programming-python-and-javascript", category: "Web Development", language: "en", cost: 0, difficulty: "intermediate", duration: 3600, externalCourseId: "harvard-web" }
  ],
  alison: [
    { title: "Diploma in Python Programming", description: "Free certified Python course", courseUrl: "https://alison.com/course/diploma-in-python-programming", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 1200, externalCourseId: "alison-python" },
    { title: "Introduction to Web Development", description: "HTML, CSS, JavaScript basics", courseUrl: "https://alison.com/course/introduction-to-web-development", category: "Web Development", language: "en", cost: 0, difficulty: "beginner", duration: 900, externalCourseId: "alison-web" },
    { title: "Diploma in Data Science", description: "Comprehensive data science training", courseUrl: "https://alison.com/course/diploma-in-data-science", category: "Data Science", language: "en", cost: 0, difficulty: "intermediate", duration: 1800, externalCourseId: "alison-ds" }
  ],
  edureka: [
    { title: "Python Certification Training", description: "Comprehensive Python with projects", courseUrl: "https://edureka.co/python-programming-certification-training", category: "Programming", language: "en", cost: 249, difficulty: "beginner", duration: 2400, externalCourseId: "edureka-python" },
    { title: "Data Science Masters Program", description: "End-to-end data science curriculum", courseUrl: "https://edureka.co/masters-program/data-scientist-certification", category: "Data Science", language: "en", cost: 499, difficulty: "intermediate", duration: 4800, externalCourseId: "edureka-ds" },
    { title: "AWS Solutions Architect Training", description: "AWS certification preparation", courseUrl: "https://edureka.co/aws-certification-training", category: "Cloud Computing", language: "en", cost: 349, difficulty: "intermediate", duration: 2400, externalCourseId: "edureka-aws" }
  ],
  creativelive: [
    { title: "Fundamentals of Photography", description: "Complete photography basics", courseUrl: "https://creativelive.com/class/fundamentals-of-photography", category: "Photography", language: "en", cost: 49, difficulty: "beginner", duration: 720, externalCourseId: "creativelive-photo" },
    { title: "Adobe Photoshop CC", description: "Photo editing mastery", courseUrl: "https://creativelive.com/class/adobe-photoshop-cc", category: "Design", language: "en", cost: 49, difficulty: "beginner", duration: 600, externalCourseId: "creativelive-ps" },
    { title: "Lighting 101", description: "Studio and natural lighting", courseUrl: "https://creativelive.com/class/lighting-101", category: "Photography", language: "en", cost: 39, difficulty: "beginner", duration: 480, externalCourseId: "creativelive-light" }
  ],
  domestika: [
    { title: "Introduction to Illustration with Procreate", description: "Digital illustration on iPad", courseUrl: "https://domestika.org/courses/procreate-illustration", category: "Design", language: "en", cost: 12, difficulty: "beginner", duration: 240, externalCourseId: "domestika-procreate" },
    { title: "Introduction to Graphic Design", description: "Design fundamentals and principles", courseUrl: "https://domestika.org/courses/graphic-design-intro", category: "Design", language: "en", cost: 12, difficulty: "beginner", duration: 300, externalCourseId: "domestika-design" },
    { title: "Watercolor Illustration", description: "Traditional and digital watercolor", courseUrl: "https://domestika.org/courses/watercolor-illustration", category: "Art", language: "en", cost: 12, difficulty: "beginner", duration: 180, externalCourseId: "domestika-watercolor" }
  ],
  italki: [
    { title: "English Conversation Practice", description: "1-on-1 with native speakers", courseUrl: "https://italki.com/teachers/english", category: "Languages", language: "en", cost: 15, difficulty: "beginner", duration: 60, externalCourseId: "italki-english" },
    { title: "Spanish Tutoring", description: "Personalized Spanish lessons", courseUrl: "https://italki.com/teachers/spanish", category: "Languages", language: "en", cost: 12, difficulty: "beginner", duration: 60, externalCourseId: "italki-spanish" },
    { title: "Japanese Tutoring", description: "Learn Japanese with native teachers", courseUrl: "https://italki.com/teachers/japanese", category: "Languages", language: "en", cost: 18, difficulty: "beginner", duration: 60, externalCourseId: "italki-japanese" }
  ],
  preply: [
    { title: "English Online Tutoring", description: "1-on-1 English with certified tutors", courseUrl: "https://preply.com/en/online/english-tutors", category: "Languages", language: "en", cost: 20, difficulty: "beginner", duration: 60, externalCourseId: "preply-english" },
    { title: "Spanish Online Tutoring", description: "Personalized Spanish lessons", courseUrl: "https://preply.com/en/online/spanish-tutors", category: "Languages", language: "en", cost: 15, difficulty: "beginner", duration: 60, externalCourseId: "preply-spanish" },
    { title: "French Online Tutoring", description: "Native French speakers as tutors", courseUrl: "https://preply.com/en/online/french-tutors", category: "Languages", language: "en", cost: 18, difficulty: "beginner", duration: 60, externalCourseId: "preply-french" }
  ],
  lingoda: [
    { title: "English Group Classes", description: "Small group live classes 24/7", courseUrl: "https://lingoda.com/en/english", category: "Languages", language: "en", cost: 99, difficulty: "beginner", duration: 3600, externalCourseId: "lingoda-english" },
    { title: "German A1-C1", description: "CEFR-aligned German curriculum", courseUrl: "https://lingoda.com/en/german", category: "Languages", language: "en", cost: 99, difficulty: "beginner", duration: 3600, externalCourseId: "lingoda-german" },
    { title: "French Group Classes", description: "Live classes with native teachers", courseUrl: "https://lingoda.com/en/french", category: "Languages", language: "en", cost: 99, difficulty: "beginner", duration: 3600, externalCourseId: "lingoda-french" }
  ],
  "rosetta-stone": [
    { title: "Spanish Complete", description: "Immersive language learning method", courseUrl: "https://rosettastone.com/learn-spanish", category: "Languages", language: "en", cost: 12, difficulty: "beginner", duration: 4800, externalCourseId: "rosetta-spanish" },
    { title: "French Complete", description: "Learn French through immersion", courseUrl: "https://rosettastone.com/learn-french", category: "Languages", language: "en", cost: 12, difficulty: "beginner", duration: 4800, externalCourseId: "rosetta-french" },
    { title: "Japanese Complete", description: "Learn Japanese with speech recognition", courseUrl: "https://rosettastone.com/learn-japanese", category: "Languages", language: "en", cost: 12, difficulty: "beginner", duration: 5400, externalCourseId: "rosetta-japanese" }
  ],
  mondly: [
    { title: "Learn Spanish", description: "Gamified Spanish with VR option", courseUrl: "https://mondly.com/learn-spanish", category: "Languages", language: "en", cost: 10, difficulty: "beginner", duration: 1800, externalCourseId: "mondly-spanish" },
    { title: "Learn German", description: "Interactive German lessons", courseUrl: "https://mondly.com/learn-german", category: "Languages", language: "en", cost: 10, difficulty: "beginner", duration: 1800, externalCourseId: "mondly-german" },
    { title: "Learn French", description: "Daily French practice", courseUrl: "https://mondly.com/learn-french", category: "Languages", language: "en", cost: 10, difficulty: "beginner", duration: 1800, externalCourseId: "mondly-french" }
  ],
  lecturio: [
    { title: "USMLE Step 1 Prep", description: "Medical licensing exam preparation", courseUrl: "https://lecturio.com/medical-education/usmle-step-1", category: "Medicine", language: "en", cost: 29, difficulty: "advanced", duration: 12000, externalCourseId: "lecturio-usmle1" },
    { title: "Medical Anatomy", description: "Comprehensive anatomy course", courseUrl: "https://lecturio.com/medical-courses/anatomy", category: "Medicine", language: "en", cost: 29, difficulty: "intermediate", duration: 4800, externalCourseId: "lecturio-anatomy" },
    { title: "Medical Physiology", description: "Human physiology for med students", courseUrl: "https://lecturio.com/medical-courses/physiology", category: "Medicine", language: "en", cost: 29, difficulty: "intermediate", duration: 3600, externalCourseId: "lecturio-physiology" }
  ],
  "google-career-certs": [
    { title: "Google Data Analytics Certificate", description: "Entry-level data analyst skills", courseUrl: "https://grow.google/certificates/data-analytics", category: "Data Analytics", language: "en", cost: 0, instructor: "Google", difficulty: "beginner", duration: 4800, externalCourseId: "google-data" },
    { title: "Google Cybersecurity Certificate", description: "Entry-level cybersecurity skills", courseUrl: "https://grow.google/certificates/cybersecurity", category: "Cybersecurity", language: "en", cost: 0, instructor: "Google", difficulty: "beginner", duration: 4800, externalCourseId: "google-security" },
    { title: "Google UX Design Certificate", description: "User experience design fundamentals", courseUrl: "https://grow.google/certificates/ux-design", category: "Design", language: "en", cost: 0, instructor: "Google", difficulty: "beginner", duration: 4800, externalCourseId: "google-ux" },
    { title: "Google IT Support Certificate", description: "IT support professional skills", courseUrl: "https://grow.google/certificates/it-support", category: "IT Support", language: "en", cost: 0, instructor: "Google", difficulty: "beginner", duration: 4800, externalCourseId: "google-it" }
  ],
  "fun-mooc": [
    { title: "Python 3: des fondamentaux aux concepts avancés", description: "Comprehensive Python in French", courseUrl: "https://fun-mooc.fr/courses/python", category: "Programming", language: "fr", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "funmooc-python" },
    { title: "Introduction à la statistique avec R", description: "Statistics with R programming", courseUrl: "https://fun-mooc.fr/courses/statistics-r", category: "Statistics", language: "fr", cost: 0, difficulty: "intermediate", duration: 1800, externalCourseId: "funmooc-stats" }
  ],
  iversity: [
    { title: "Dark Matter and Dark Energy", description: "Astrophysics course", courseUrl: "https://iversity.org/courses/dark-matter-dark-energy", category: "Science", language: "en", cost: 0, difficulty: "intermediate", duration: 1200, externalCourseId: "iversity-physics" },
    { title: "Visual Thinking for Business", description: "Business communication through visuals", courseUrl: "https://iversity.org/courses/visual-thinking", category: "Business", language: "en", cost: 0, difficulty: "beginner", duration: 900, externalCourseId: "iversity-visual" }
  ],
  swayam: [
    { title: "Programming in Python", description: "NPTEL Python course - IIT certified", courseUrl: "https://swayam.gov.in/courses/programming-python", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "swayam-python" },
    { title: "Data Science for Engineers", description: "IIT Madras data science course", courseUrl: "https://swayam.gov.in/courses/data-science-engineers", category: "Data Science", language: "en", cost: 0, difficulty: "intermediate", duration: 3600, externalCourseId: "swayam-ds" },
    { title: "Machine Learning", description: "NPTEL ML course from IIT", courseUrl: "https://swayam.gov.in/courses/machine-learning", category: "Machine Learning", language: "en", cost: 0, difficulty: "advanced", duration: 3000, externalCourseId: "swayam-ml" }
  ],
  nptel: [
    { title: "Introduction to Programming in C", description: "IIT Kanpur C programming", courseUrl: "https://nptel.ac.in/courses/programming-c", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "nptel-c" },
    { title: "Data Structures and Algorithms", description: "IIT Delhi algorithms course", courseUrl: "https://nptel.ac.in/courses/data-structures", category: "Algorithms", language: "en", cost: 0, difficulty: "intermediate", duration: 3000, externalCourseId: "nptel-dsa" },
    { title: "Deep Learning", description: "IIT Madras deep learning course", courseUrl: "https://nptel.ac.in/courses/deep-learning", category: "Machine Learning", language: "en", cost: 0, difficulty: "advanced", duration: 3600, externalCourseId: "nptel-dl" }
  ],
  miriadax: [
    { title: "Introducción a la Programación con Python", description: "Python basics in Spanish", courseUrl: "https://miriadax.net/courses/python-intro", category: "Programming", language: "es", cost: 0, difficulty: "beginner", duration: 1800, externalCourseId: "miriadax-python" },
    { title: "Big Data sin misterios", description: "Big data fundamentals in Spanish", courseUrl: "https://miriadax.net/courses/big-data", category: "Data Science", language: "es", cost: 0, difficulty: "beginner", duration: 1200, externalCourseId: "miriadax-bigdata" }
  ],
  "open-univ": [
    { title: "Introduction to Cyber Security", description: "Open University UK security course", courseUrl: "https://openuniversity.edu/courses/introduction-cyber-security", category: "Cybersecurity", language: "en", cost: 0, difficulty: "beginner", duration: 1200, externalCourseId: "ou-security" },
    { title: "Learn to Code for Data Analysis", description: "Python for data analysis", courseUrl: "https://openuniversity.edu/courses/learn-code-data-analysis", category: "Data Analysis", language: "en", cost: 0, difficulty: "beginner", duration: 1800, externalCourseId: "ou-data" }
  ],
  xuetangx: [
    { title: "人工智能导论 (Introduction to AI)", description: "Tsinghua University AI course", courseUrl: "https://xuetangx.com/course/ai-introduction", category: "Artificial Intelligence", language: "zh", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "xuetangx-ai" },
    { title: "Python程序设计", description: "Python programming in Chinese", courseUrl: "https://xuetangx.com/course/python-programming", category: "Programming", language: "zh", cost: 0, difficulty: "beginner", duration: 2000, externalCourseId: "xuetangx-python" }
  ],
  icourse163: [
    { title: "计算机科学导论", description: "Computer science introduction - Peking University", courseUrl: "https://icourse163.org/course/cs-introduction", category: "Computer Science", language: "zh", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "icourse-cs" },
    { title: "数据结构", description: "Data structures course", courseUrl: "https://icourse163.org/course/data-structures", category: "Algorithms", language: "zh", cost: 0, difficulty: "intermediate", duration: 3000, externalCourseId: "icourse-ds" }
  ],
  jmooc: [
    { title: "プログラミング入門 (Intro to Programming)", description: "Japanese programming basics", courseUrl: "https://jmooc.jp/courses/programming-intro", category: "Programming", language: "ja", cost: 0, difficulty: "beginner", duration: 1800, externalCourseId: "jmooc-prog" },
    { title: "AI入門 (AI Introduction)", description: "Artificial intelligence basics in Japanese", courseUrl: "https://jmooc.jp/courses/ai-introduction", category: "Artificial Intelligence", language: "ja", cost: 0, difficulty: "beginner", duration: 1500, externalCourseId: "jmooc-ai" }
  ],
  "kmooc": [
    { title: "파이썬 프로그래밍 (Python Programming)", description: "Korean Python course", courseUrl: "https://kmooc.kr/courses/python", category: "Programming", language: "ko", cost: 0, difficulty: "beginner", duration: 2000, externalCourseId: "kmooc-python" },
    { title: "인공지능 기초 (AI Basics)", description: "AI fundamentals in Korean", courseUrl: "https://kmooc.kr/courses/ai-basics", category: "Artificial Intelligence", language: "ko", cost: 0, difficulty: "beginner", duration: 1800, externalCourseId: "kmooc-ai" }
  ],
  unacademy: [
    { title: "Complete Python Bootcamp", description: "Python programming for Indian learners", courseUrl: "https://unacademy.com/course/python-bootcamp", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "unacademy-python" },
    { title: "Data Science Masterclass", description: "Comprehensive data science training", courseUrl: "https://unacademy.com/course/data-science-masterclass", category: "Data Science", language: "en", cost: 0, difficulty: "intermediate", duration: 3600, externalCourseId: "unacademy-ds" }
  ],
  upgrad: [
    { title: "Data Science Bootcamp", description: "Industry-partnered data science program", courseUrl: "https://upgrad.com/data-science-bootcamp", category: "Data Science", language: "en", cost: 599, difficulty: "intermediate", duration: 4800, externalCourseId: "upgrad-ds" },
    { title: "Full Stack Development", description: "MERN stack development", courseUrl: "https://upgrad.com/full-stack-development", category: "Web Development", language: "en", cost: 499, difficulty: "intermediate", duration: 4200, externalCourseId: "upgrad-fullstack" }
  ],
  "byju-s": [
    { title: "Class 12 JEE Preparation", description: "Engineering entrance exam prep", courseUrl: "https://byjus.com/jee-preparation", category: "Test Prep", language: "en", cost: 100, difficulty: "advanced", duration: 7200, externalCourseId: "byjus-jee" },
    { title: "NEET Preparation", description: "Medical entrance exam prep", courseUrl: "https://byjus.com/neet-preparation", category: "Test Prep", language: "en", cost: 100, difficulty: "advanced", duration: 7200, externalCourseId: "byjus-neet" }
  ],
  vedantu: [
    { title: "JEE Main & Advanced", description: "Engineering exam preparation", courseUrl: "https://vedantu.com/jee-preparation", category: "Test Prep", language: "en", cost: 75, difficulty: "advanced", duration: 6000, externalCourseId: "vedantu-jee" },
    { title: "Class 12 Physics", description: "CBSE Physics curriculum", courseUrl: "https://vedantu.com/class-12-physics", category: "Science", language: "en", cost: 50, difficulty: "intermediate", duration: 3600, externalCourseId: "vedantu-physics" }
  ],
  inflearn: [
    { title: "스프링 부트 입문 (Spring Boot Intro)", description: "Korean Spring Boot course", courseUrl: "https://inflearn.com/course/spring-boot", category: "Programming", language: "ko", cost: 0, difficulty: "beginner", duration: 1800, externalCourseId: "inflearn-spring" },
    { title: "파이썬 기초 (Python Basics)", description: "Python fundamentals in Korean", courseUrl: "https://inflearn.com/course/python-basics", category: "Programming", language: "ko", cost: 0, difficulty: "beginner", duration: 1500, externalCourseId: "inflearn-python" }
  ],
  fastcampus: [
    { title: "프론트엔드 개발 올인원 (Frontend All-in-One)", description: "Korean frontend development", courseUrl: "https://fastcampus.co.kr/dev_online_frontend", category: "Web Development", language: "ko", cost: 200, difficulty: "beginner", duration: 4800, externalCourseId: "fastcampus-frontend" },
    { title: "데이터 사이언스 (Data Science)", description: "Korean data science program", courseUrl: "https://fastcampus.co.kr/data_online_datascience", category: "Data Science", language: "ko", cost: 250, difficulty: "intermediate", duration: 5400, externalCourseId: "fastcampus-ds" }
  ],
  schoo: [
    { title: "プログラミング入門 (Programming Intro)", description: "Japanese programming basics", courseUrl: "https://schoo.jp/class/programming-intro", category: "Programming", language: "ja", cost: 10, difficulty: "beginner", duration: 1200, externalCourseId: "schoo-prog" },
    { title: "Webデザイン基礎 (Web Design Basics)", description: "Japanese web design course", courseUrl: "https://schoo.jp/class/web-design", category: "Web Design", language: "ja", cost: 10, difficulty: "beginner", duration: 1200, externalCourseId: "schoo-web" }
  ],
  prodigy: [
    { title: "Math Game Learning", description: "Gamified math for grades 1-8", courseUrl: "https://prodigygame.com/math", category: "Mathematics", language: "en", cost: 0, difficulty: "beginner", duration: 0, externalCourseId: "prodigy-math" },
    { title: "English Learning Game", description: "Reading and language arts", courseUrl: "https://prodigygame.com/english", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 0, externalCourseId: "prodigy-english" }
  ],
  ixl: [
    { title: "IXL Math", description: "Comprehensive K-12 math practice", courseUrl: "https://ixl.com/math", category: "Mathematics", language: "en", cost: 10, difficulty: "beginner", duration: 0, externalCourseId: "ixl-math" },
    { title: "IXL Language Arts", description: "Reading and writing practice", courseUrl: "https://ixl.com/ela", category: "Languages", language: "en", cost: 10, difficulty: "beginner", duration: 0, externalCourseId: "ixl-ela" },
    { title: "IXL Science", description: "K-12 science practice", courseUrl: "https://ixl.com/science", category: "Science", language: "en", cost: 10, difficulty: "beginner", duration: 0, externalCourseId: "ixl-science" }
  ],
  splashlearn: [
    { title: "Math Games K-5", description: "Fun math learning for kids", courseUrl: "https://splashlearn.com/math-games", category: "Mathematics", language: "en", cost: 0, difficulty: "beginner", duration: 0, externalCourseId: "splash-math" },
    { title: "Reading Games K-5", description: "Reading and phonics for kids", courseUrl: "https://splashlearn.com/reading-games", category: "Languages", language: "en", cost: 0, difficulty: "beginner", duration: 0, externalCourseId: "splash-reading" }
  ],
  "code-org": [
    { title: "Hour of Code", description: "1-hour intro to computer science", courseUrl: "https://code.org/hourofcode", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 60, externalCourseId: "codeorg-hoc" },
    { title: "CS Fundamentals", description: "K-5 computer science curriculum", courseUrl: "https://code.org/educate/csfundamentals", category: "Computer Science", language: "en", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "codeorg-csf" },
    { title: "CS Principles", description: "AP Computer Science Principles", courseUrl: "https://code.org/educate/csp", category: "Computer Science", language: "en", cost: 0, difficulty: "intermediate", duration: 4800, externalCourseId: "codeorg-csp" }
  ],
  codakid: [
    { title: "Python for Kids", description: "Game-based Python learning", courseUrl: "https://codakid.com/python", category: "Programming", language: "en", cost: 25, difficulty: "beginner", duration: 2400, externalCourseId: "codakid-python" },
    { title: "Minecraft Modding", description: "Learn Java through Minecraft", courseUrl: "https://codakid.com/minecraft-modding", category: "Programming", language: "en", cost: 25, difficulty: "beginner", duration: 3000, externalCourseId: "codakid-minecraft" },
    { title: "Roblox Game Development", description: "Create games on Roblox with Lua", courseUrl: "https://codakid.com/roblox", category: "Game Development", language: "en", cost: 25, difficulty: "beginner", duration: 2400, externalCourseId: "codakid-roblox" }
  ],
  universarium: [
    { title: "Основы программирования на Python", description: "Бесплатный Python курс от ведущих вузов", courseUrl: "https://universarium.org/course/python-basics", category: "Программирование", language: "ru", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "universarium-python" },
    { title: "Введение в машинное обучение", description: "ML основы от российских университетов", courseUrl: "https://universarium.org/course/machine-learning", category: "Machine Learning", language: "ru", cost: 0, difficulty: "intermediate", duration: 3000, externalCourseId: "universarium-ml" }
  ],
  "mfti-online": [
    { title: "Основы программирования на C++", description: "Курс от МФТИ", courseUrl: "https://online.mipt.ru/course/cpp", category: "Программирование", language: "ru", cost: 0, difficulty: "beginner", duration: 3000, externalCourseId: "mfti-cpp" },
    { title: "Алгоритмы и структуры данных", description: "Продвинутый курс МФТИ", courseUrl: "https://online.mipt.ru/course/algorithms", category: "Алгоритмы", language: "ru", cost: 0, difficulty: "intermediate", duration: 3600, externalCourseId: "mfti-algo" }
  ],
  "vshes-online": [
    { title: "Экономика для неэкономистов", description: "НИУ ВШЭ популярный курс", courseUrl: "https://openedu.hse.ru/economics-noneconomists", category: "Экономика", language: "ru", cost: 0, difficulty: "beginner", duration: 2400, externalCourseId: "hse-econ" },
    { title: "Анализ данных в Python", description: "Data Analysis с ВШЭ", courseUrl: "https://openedu.hse.ru/python-data-analysis", category: "Data Analysis", language: "ru", cost: 0, difficulty: "intermediate", duration: 3000, externalCourseId: "hse-python" }
  ],
  maximum: [
    { title: "Подготовка к ЕГЭ по математике", description: "Профильный уровень", courseUrl: "https://maximumtest.ru/ege-math", category: "ЕГЭ", language: "ru", cost: 4990, difficulty: "intermediate", duration: 4800, externalCourseId: "max-ege-math" },
    { title: "Подготовка к ОГЭ", description: "Комплексная подготовка к экзаменам", courseUrl: "https://maximumtest.ru/oge", category: "ОГЭ", language: "ru", cost: 3990, difficulty: "intermediate", duration: 3600, externalCourseId: "max-oge" }
  ],
  "tutor-online": [
    { title: "Репетитор по математике онлайн", description: "Индивидуальные занятия", courseUrl: "https://tutor-online.ru/math", category: "Математика", language: "ru", cost: 800, difficulty: "beginner", duration: 60, externalCourseId: "tutor-math" },
    { title: "Репетитор по английскому онлайн", description: "Персональное обучение", courseUrl: "https://tutor-online.ru/english", category: "Languages", language: "ru", cost: 900, difficulty: "beginner", duration: 60, externalCourseId: "tutor-english" }
  ],
  eduonix: [
    { title: "Full Stack Web Developer Bootcamp", description: "Complete web development course", courseUrl: "https://eduonix.com/full-stack-web-developer", category: "Web Development", language: "en", cost: 19, difficulty: "beginner", duration: 4200, externalCourseId: "eduonix-fullstack" },
    { title: "Data Science Bootcamp", description: "Python and ML for data science", courseUrl: "https://eduonix.com/data-science-bootcamp", category: "Data Science", language: "en", cost: 19, difficulty: "intermediate", duration: 3600, externalCourseId: "eduonix-ds" }
  ],
  "youtube-learning": [
    { title: "freeCodeCamp Python Tutorial", description: "4-hour Python course - 50M+ views", courseUrl: "https://youtube.com/watch?v=rfscVS0vtbw", category: "Programming", language: "en", cost: 0, instructor: "freeCodeCamp", difficulty: "beginner", duration: 240, externalCourseId: "yt-python" },
    { title: "Traversy Media Web Development", description: "HTML CSS Crash Course", courseUrl: "https://youtube.com/watch?v=UB1O30fR-EE", category: "Web Development", language: "en", cost: 0, instructor: "Brad Traversy", difficulty: "beginner", duration: 120, externalCourseId: "yt-traversy" },
    { title: "3Blue1Brown Linear Algebra", description: "Essence of Linear Algebra series", courseUrl: "https://youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab", category: "Mathematics", language: "en", cost: 0, instructor: "3Blue1Brown", difficulty: "intermediate", duration: 180, externalCourseId: "yt-3b1b-la" }
  ],
  "test-automation-u": [
    { title: "Introduction to Python", description: "Python for test automation", courseUrl: "https://testautomationu.applitools.com/python-tutorial", category: "Programming", language: "en", cost: 0, difficulty: "beginner", duration: 480, externalCourseId: "tau-python" },
    { title: "Selenium WebDriver with Python", description: "Web UI test automation", courseUrl: "https://testautomationu.applitools.com/selenium-webdriver-python-tutorial", category: "Testing", language: "en", cost: 0, difficulty: "intermediate", duration: 600, externalCourseId: "tau-selenium" },
    { title: "API Testing with Python", description: "REST API test automation", courseUrl: "https://testautomationu.applitools.com/python-api-testing", category: "Testing", language: "en", cost: 0, difficulty: "intermediate", duration: 480, externalCourseId: "tau-api" }
  ],
  codecamp: [
    { title: "Web Development Bootcamp", description: "Intensive coding bootcamp", courseUrl: "https://codecamp.com/bootcamp/web-development", category: "Web Development", language: "en", cost: 2000, difficulty: "beginner", duration: 9600, externalCourseId: "codecamp-web" },
    { title: "Data Science Bootcamp", description: "Career-focused data science", courseUrl: "https://codecamp.com/bootcamp/data-science", category: "Data Science", language: "en", cost: 2500, difficulty: "intermediate", duration: 9600, externalCourseId: "codecamp-ds" }
  ],
  skillbranch: [
    { title: "Android-разработчик", description: "Курс мобильной разработки на Kotlin", courseUrl: "https://skillbranch.ru/android", category: "Мобильная разработка", language: "ru", cost: 4990, difficulty: "beginner", duration: 4200, externalCourseId: "skillbranch-android" },
    { title: "Kotlin Developer", description: "Kotlin для Android и Backend", courseUrl: "https://skillbranch.ru/kotlin", category: "Программирование", language: "ru", cost: 4990, difficulty: "intermediate", duration: 3600, externalCourseId: "skillbranch-kotlin" }
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
              let existingCourse = null;
              
              if (courseData.externalCourseId) {
                const byExternalId = await db
                  .select({ id: courses.id })
                  .from(courses)
                  .where(
                    and(
                      eq(courses.platformId, platform.id),
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
                      eq(courses.platformId, platform.id),
                      sql`lower(trim(${courses.title})) = ${normalizedTitle}`
                    )
                  )
                  .limit(1);
                existingCourse = byTitle.length > 0 ? byTitle[0] : null;
              }
              
              if (existingCourse) {
                continue;
              }
              
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
