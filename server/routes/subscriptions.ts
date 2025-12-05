import { Router, Request, Response } from 'express';
import { logger } from "../services/logger";
import { authenticateToken } from '../middleware/auth';
import { yoomoneyService } from '../services/yoomoneyService';

const router = Router();

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null; adminRole?: string | null };
}

/**
 * SUBSCRIPTION ROUTES MODULE
 * Handles subscription plans, payments and Yoomoney integration
 * 
 * Routes:
 * - GET /plans - Get available subscription plans
 * - GET /current - Get current user subscription
 * - POST /create-payment - Create payment link for subscription
 * - POST /webhook - Yoomoney payment notification webhook
 * - POST /cancel - Cancel subscription
 * - GET /history - Get payment history
 * - POST /initialize-plans - Initialize default plans (admin only)
 */

router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await yoomoneyService.getSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    logger.error('Error fetching subscription plans:', error);
    res.status(500).json({ message: 'Ошибка получения тарифных планов' });
  }
});

router.get('/current', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const subscription = await yoomoneyService.getUserSubscription(userId);
    res.json(subscription);
  } catch (error) {
    logger.error('Error fetching user subscription:', error);
    res.status(500).json({ message: 'Ошибка получения подписки' });
  }
});

router.post('/create-payment', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { planId, billingPeriod } = req.body;

    if (!planId) {
      return res.status(400).json({ message: 'Не указан тарифный план' });
    }

    const validPeriods = ['monthly', 'yearly'];
    if (!validPeriods.includes(billingPeriod)) {
      return res.status(400).json({ message: 'Неверный период оплаты' });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const returnUrl = `${baseUrl}/subscription/success`;

    const result = await yoomoneyService.createPaymentLink({
      userId,
      planId,
      billingPeriod,
      returnUrl,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    res.json({
      paymentUrl: result.paymentUrl,
      paymentLabel: result.paymentLabel,
    });
  } catch (error) {
    logger.error('Error creating payment:', error);
    res.status(500).json({ message: 'Ошибка создания платежа' });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const notification = req.body;
    
    logger.info('Yoomoney webhook received:', {
      notification_type: notification.notification_type,
      label: notification.label,
      amount: notification.amount,
    });

    const success = await yoomoneyService.processPaymentNotification(notification);

    if (!success) {
      logger.warn('Yoomoney webhook processing failed:', notification.label);
      return res.status(400).send('Invalid notification');
    }

    logger.info('Yoomoney webhook processed successfully:', notification.label);
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Yoomoney webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/cancel', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await yoomoneyService.cancelSubscription(userId);

    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    res.json({ 
      message: 'Подписка будет отменена в конце текущего периода',
      success: true,
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({ message: 'Ошибка отмены подписки' });
  }
});

router.get('/history', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const payments = await yoomoneyService.getPaymentHistory(userId, limit);
    res.json(payments);
  } catch (error) {
    logger.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Ошибка получения истории платежей' });
  }
});

router.post('/initialize-plans', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.adminRole) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    await yoomoneyService.initializeDefaultPlans();
    res.json({ message: 'Тарифные планы инициализированы' });
  } catch (error) {
    logger.error('Error initializing plans:', error);
    res.status(500).json({ message: 'Ошибка инициализации планов' });
  }
});

router.get('/status', (req: Request, res: Response) => {
  res.json({
    yoomoneyConfigured: yoomoneyService.isReady(),
    message: yoomoneyService.isReady() 
      ? 'Платежная система настроена' 
      : 'Платежная система не настроена',
  });
});

export default router;
