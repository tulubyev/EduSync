import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { aiService } from '../services/aiService.js';
import { config } from '../../config/environment';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

/**
 * AI ASSISTANT ROUTES MODULE
 * Extracted from main routes.ts for modular architecture
 * 
 * Routes:
 * - POST /chat/session - Create new AI chat session
 * - POST /chat/message - Send message to AI assistant
 * - GET /insights - Get study insights from AI
 * - GET /chat/sessions - Get user's chat sessions
 * - POST /chat - Direct chat with AI assistant (Claude 3.5 Sonnet)
 */

// Create new AI chat session
router.post('/chat/session', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const session = await aiService.createChatSession(req.user!.id);
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка создания сессии чата' });
  }
});

// Send message to AI assistant
router.post('/chat/message', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ message: 'SessionId и сообщение обязательны' });
    }

    const reply = await aiService.sendMessage(req.user!.id, sessionId, message);
    res.json({ reply });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Ошибка обработки сообщения' });
  }
});

// Get study insights from AI
router.get('/insights', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const insights = await aiService.getStudyInsights(req.user!.id);
    res.json({ insights });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения рекомендаций' });
  }
});

// Get user's chat sessions
router.get('/chat/sessions', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const sessions = aiService.getChatSessions(req.user!.id);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения сессий чата' });
  }
});

// Direct chat with AI assistant (Claude 3.5 Sonnet via OpenRouter)
router.post('/chat', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, context = [] } = req.body;
    
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ 
        message: 'AI сервис временно недоступен - отсутствует API ключ' 
      });
    }

    // Формируем контекст для AI
    const systemPrompt = `Ты - ИИ-помощник платформы My EPA, агрегатора онлайн-обучения для российских пользователей.

Твоя основная специализация:
- Помощь в учёбе: объяснение материала курсов простым языком
- Планирование обучения, расстановка приоритетов, работа с дедлайнами
- Советы по конспектированию, запоминанию и самоорганизации
- Помощь в выборе курсов и направлений обучения, карьерные советы
- Вопросы по использованию платформы: подключение платформ, дедлайны, библиотека, запись вебинаров

Дополнительные возможности:
- Общие познавательные вопросы и поддержка беседы
- Обсуждение технологий и трендов

Принципы работы:
- Отвечай на русском языке
- Будь дружелюбным, понимающим и профессиональным
- Давай конкретные и практичные советы
- Не выдумывай содержание курсов, сроки и данные пользователя, если их нет в разговоре
- Если не знаешь ответ, честно скажи об этом

Если вопрос про данные пользователя (курсы, дедлайны), предложи посмотреть их в соответствующих разделах приложения.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'My EPA AI Assistant'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: messages,
        max_tokens: config.ai.maxTokens,
        temperature: config.ai.temperature,
        top_p: config.ai.topP,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      console.error('OpenRouter API error:', response.status, await response.text());
      return res.status(500).json({ 
        message: 'Ошибка AI сервиса. Попробуйте позже.' 
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'Извините, не смог обработать ваш запрос.';

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ 
      message: 'Произошла ошибка при обработке запроса' 
    });
  }
});

export default router;