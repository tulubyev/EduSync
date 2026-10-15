import OpenAI from "openai";
import { storage } from "../storage";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface AiChatSession {
  id: string;
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
}

interface StudyContext {
  activeCourses: Array<{ title: string; progress: number; status: string }>;
  upcomingDeadlines: Array<{ title: string; dueDate: Date; priority: string }>;
  completedCourses: number;
}

const MODEL = "anthropic/claude-3.5-sonnet";
// Сессии чата хранятся в памяти процесса (отдельной таблицы в БД нет)
const MAX_SESSIONS_PER_USER = 20;
const MAX_SESSIONS_TOTAL = 2000;

export class AIService {
  private openai: OpenAI | null;
  private sessions = new Map<string, AiChatSession>();

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn("⚠️  OPENROUTER_API_KEY не найден, используется мок AI сервиса");
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
        defaultHeaders: {
          "HTTP-Referer": process.env.APP_URL || "http://localhost:5000",
          "X-Title": "My EPA AI Assistant",
        },
      });
    }
  }

  async createChatSession(userId: string): Promise<AiChatSession> {
    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const session: AiChatSession = {
      id: sessionId,
      sessionId,
      userId,
      messages: [
        {
          role: "assistant",
          content:
            "Привет! Я ИИ-помощник My EPA. Помогу разобраться в материале курса, спланировать учёбу, расставить приоритеты по дедлайнам и подобрать формат занятий. С чего начнём?",
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    this.evictOldSessions(userId);
    return session;
  }

  getChatSessions(userId: string): AiChatSession[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  async sendMessage(userId: string, sessionId: string, message: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Сессия чата не найдена");
    }

    const context = await this.getStudyContext(userId);

    session.messages.push({ role: "user", content: message, timestamp: new Date() });

    let reply: string;
    if (!this.openai) {
      reply = this.getMockResponse(message);
    } else {
      try {
        const completion = await this.openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: this.getSystemPromptWithContext(context) },
            ...session.messages.slice(-10).map(m => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          ],
          max_tokens: 500,
          temperature: 0.7,
        });
        reply = completion.choices[0]?.message?.content || "Извините, произошла ошибка. Попробуйте еще раз.";
      } catch (error) {
        console.error("OpenRouter API error:", error);
        reply = "Извините, временно не могу обработать ваш запрос. Попробуйте позже.";
      }
    }

    session.messages.push({ role: "assistant", content: reply, timestamp: new Date() });
    return reply;
  }

  /** Советы по учёбе на основе курсов и дедлайнов пользователя. */
  async getStudyInsights(userId: string): Promise<string> {
    const context = await this.getStudyContext(userId);

    if (!this.openai) {
      return this.getMockInsights(context);
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "Вы наставник по онлайн-обучению. Давайте конкретные, практичные советы на русском языке.",
          },
          {
            role: "user",
            content: `Проанализируйте учебную ситуацию и дайте 3-4 конкретных совета.\n${this.describeContext(context)}`,
          },
        ],
        max_tokens: 600,
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || "Не удалось получить рекомендации.";
    } catch (error) {
      console.error("OpenRouter API error:", error);
      return this.getMockInsights(context);
    }
  }

  private async getStudyContext(userId: string): Promise<StudyContext> {
    const [courses, deadlines] = await Promise.all([
      storage.getCourses(userId),
      storage.getDeadlines(userId),
    ]);

    const now = Date.now();
    return {
      activeCourses: courses
        .filter(c => c.status === "in_progress")
        .slice(0, 10)
        .map(c => ({ title: c.title, progress: Math.round(Number(c.progress ?? 0)), status: c.status ?? "in_progress" })),
      upcomingDeadlines: deadlines
        .filter(d => d.status !== "completed" && d.status !== "cancelled" && new Date(d.dueDate).getTime() >= now)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5)
        .map(d => ({ title: d.title, dueDate: new Date(d.dueDate), priority: d.priority ?? "medium" })),
      completedCourses: courses.filter(c => c.status === "completed").length,
    };
  }

  private describeContext(context: StudyContext): string {
    const courses = context.activeCourses.length
      ? context.activeCourses.map(c => `- ${c.title}: ${c.progress}%`).join("\n")
      : "- нет активных курсов";
    const deadlines = context.upcomingDeadlines.length
      ? context.upcomingDeadlines
          .map(d => `- ${d.title} — до ${d.dueDate.toLocaleDateString("ru-RU")} (приоритет: ${d.priority})`)
          .join("\n")
      : "- ближайших дедлайнов нет";

    return `Активные курсы:\n${courses}\n\nБлижайшие дедлайны:\n${deadlines}\n\nЗавершено курсов: ${context.completedCourses}`;
  }

  private getSystemPrompt(): string {
    return `
    Вы - ИИ-помощник платформы My EPA, агрегатора онлайн-обучения. Вы помогаете пользователям учиться эффективнее, отвечаете на русском языке.

    Ваши возможности:
    - Объяснение материала курсов простым языком
    - Планирование учёбы и расстановка приоритетов по дедлайнам
    - Советы по конспектированию и запоминанию
    - Помощь в выборе курсов и направлений обучения
    - Мотивация и борьба с прокрастинацией

    Правила общения:
    - Всегда отвечайте на русском языке
    - Будьте дружелюбны и понятны
    - Давайте конкретные, практичные советы
    - Если не можете дать точный ответ, честно об этом скажите
    - Не выдумывайте содержание курсов и сроки, которых не знаете
    `;
  }

  private getSystemPromptWithContext(context: StudyContext): string {
    return `
    ${this.getSystemPrompt()}

    Текущая учебная ситуация пользователя:
    ${this.describeContext(context)}

    Используйте эту информацию для персонализированных советов.
    `;
  }

  private getMockResponse(message: string): string {
    const text = message.toLowerCase();

    if (text.includes("дедлайн") || text.includes("срок")) {
      return "Начните с ближайшего дедлайна: разбейте задание на небольшие шаги и выделите на каждый конкретное время в календаре.";
    }
    if (text.includes("конспект") || text.includes("запомн")) {
      return "Для запоминания лучше всего работают краткие конспекты своими словами и повторение через 1, 3 и 7 дней.";
    }
    if (text.includes("курс")) {
      return "Выбирая курс, сверьте программу с вашей целью, посмотрите объём практики и отзывы выпускников.";
    }

    return "Спасибо за вопрос! Могу помочь с планированием учёбы, дедлайнами, конспектами и выбором курсов. Расскажите подробнее, что нужно.";
  }

  private getMockInsights(context: StudyContext): string {
    const next = context.upcomingDeadlines[0];
    return `Ваша учебная ситуация:

Активных курсов: ${context.activeCourses.length}, завершено: ${context.completedCourses}
${next ? `Ближайший дедлайн: «${next.title}» — ${next.dueDate.toLocaleDateString("ru-RU")}` : "Ближайших дедлайнов нет"}

Рекомендации:
1. Выделите постоянное время для учёбы, лучше короткими сессиями
2. Начинайте с задач с ближайшим сроком
3. Записывайте конспекты в библиотеку, чтобы возвращаться к ним
4. Не берите больше 2-3 курсов одновременно`;
  }

  private evictOldSessions(userId: string): void {
    const own = this.getChatSessions(userId);
    if (own.length > MAX_SESSIONS_PER_USER) {
      own.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      for (const s of own.slice(0, own.length - MAX_SESSIONS_PER_USER)) this.sessions.delete(s.sessionId);
    }
    while (this.sessions.size > MAX_SESSIONS_TOTAL) {
      const oldest = this.sessions.keys().next().value;
      if (oldest === undefined) break;
      this.sessions.delete(oldest);
    }
  }
}

export const aiService = new AIService();
