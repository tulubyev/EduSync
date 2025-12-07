# Course Discovery Scripts

## fetchCourses.ts

Скрипт для поиска и сохранения курсов из образовательных платформ в базу данных.

### Использование

```bash
# Обработать первые 5 платформ (по умолчанию)
npm run tsx server/scripts/fetchCourses.ts

# Обработать первые N платформ
npm run tsx server/scripts/fetchCourses.ts 10

# Обработать все доступные платформы
npm run tsx server/scripts/fetchCourses.ts 89
```

### Как это работает

1. **Получает платформы из БД** - Загружает активные платформы (по умолчанию первые 5)
2. **Ищет курсы** - Для каждой платформы использует данные из `PLATFORM_COURSE_DATA`
3. **Сохраняет в БД** - Добавляет курсы в таблицу `courses` с автором = админ-пользователь

### Добавление курсов для платформы

1. Откройте `server/scripts/fetchCourses.ts`
2. Найдите объект `PLATFORM_COURSE_DATA`
3. Добавьте код платформы и курсы:

```typescript
PLATFORM_COURSE_DATA: Record<string, CourseData[]> = {
  // ... существующие данные ...
  
  'your-platform-code': [
    {
      title: "Название курса",
      description: "Описание курса",
      courseUrl: "https://...",
      imageUrl: "https://...",
      category: "Категория",
      language: "ru", // или 'en'
      cost: 0, // 0 для бесплатных, иначе цена
      instructor: "Преподаватель",
      difficulty: "beginner", // beginner, intermediate, advanced
      duration: 3600, // в минутах
      externalCourseId: "unique-id"
    },
    // больше курсов...
  ]
};
```

### Поля CourseData

- `title` (обязательно) - Название курса
- `description` - Описание курса
- `courseUrl` - Ссылка на курс
- `imageUrl` - URL изображения курса
- `category` - Категория (например, "Programming", "Data Science")
- `language` - Язык курса (en, ru, etc.)
- `cost` - Стоимость (0 для бесплатных)
- `instructor` - Преподаватель
- `difficulty` - Уровень сложности
- `duration` - Длительность в минутах
- `externalCourseId` - Уникальный ID на платформе

### Пример вывода

```
🚀 Starting course discovery script...

👤 Using admin user: Admin User

📚 Fetching first 5 platforms...
✅ Found 5 platforms

📝 Platform Data Mapping:
────────────────────────────────────────────────────────────

🔍 Processing: Coursera (coursera)
  📖 Found 2 courses
  ✅ Saved: Machine Learning by Andrew Ng
  ✅ Saved: Python for Everybody

🔍 Processing: edX (edx)
  📖 Found 2 courses
  ✅ Saved: CS50's Introduction to Computer Science
  ✅ Saved: Introduction to Linux

...

✨ Complete!
   Total courses saved: 10
   Platforms processed: 5
```

### Следующий этап: Веб-поиск курсов

Для получения реальных курсов с интернета:
1. Используйте веб-поиск для каждой платформы
2. Парсите результаты вручную
3. Добавляйте в `PLATFORM_COURSE_DATA`
4. Запустите скрипт

Пример запроса поиска:
- "Coursera machine learning courses 2024"
- "edX computer science courses free"
- "Udemy python programming courses"
