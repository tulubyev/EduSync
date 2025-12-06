import { Router, Request, Response } from 'express';
import { logger } from "../services/logger";
import { authenticateToken } from '../middleware/auth';
import { yookassaService } from '../services/yookassaService';
import { PaymentFactory } from '../services/payments/paymentFactory';
import type { PaymentProvider } from '../services/payments/paymentGateway';
import { db } from '../db';
import { subscriptionPlans, subscriptions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null; adminRole?: string | null };
}

/**
 * SUBSCRIPTION ROUTES MODULE
 * Handles subscription plans, payments and YooKassa integration
 * 
 * Routes:
 * - GET /plans - Get available subscription plans
 * - GET /current - Get current user subscription
 * - POST /create-payment - Create payment link for subscription
 * - POST /webhook - YooKassa payment notification webhook
 * - POST /cancel - Cancel subscription
 * - GET /history - Get payment history
 * - POST /initialize-plans - Initialize default plans (admin only)
 */

router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await yookassaService.getSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    logger.error('Error fetching subscription plans:', error);
    res.status(500).json({ message: 'Ошибка получения тарифных планов' });
  }
});

router.get('/current', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const subscription = await yookassaService.getUserSubscription(userId);
    res.json(subscription);
  } catch (error) {
    logger.error('Error fetching user subscription:', error);
    res.status(500).json({ message: 'Ошибка получения подписки' });
  }
});

router.post('/create-payment', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { planId, billingPeriod, provider } = req.body;

    if (!planId) {
      return res.status(400).json({ message: 'Не указан тарифный план' });
    }

    const validPeriods = ['monthly', 'yearly'];
    if (!validPeriods.includes(billingPeriod)) {
      return res.status(400).json({ message: 'Неверный период оплаты' });
    }

    const validProviders = ['yookassa', 'alfabank'];
    const selectedProvider = (provider && validProviders.includes(provider)) 
      ? provider as PaymentProvider 
      : 'yookassa';

    const gateway = PaymentFactory.getGateway(selectedProvider);
    
    if (!gateway.isReady()) {
      return res.status(400).json({ 
        message: selectedProvider === 'alfabank' 
          ? 'Платежи через Альфа-Банк временно недоступны' 
          : 'Платежная система не настроена' 
      });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const returnUrl = `${baseUrl}/subscription/success`;

    const result = await gateway.createPayment({
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
      paymentId: result.paymentId,
      provider: selectedProvider,
    });
  } catch (error) {
    logger.error('Error creating payment:', error);
    res.status(500).json({ message: 'Ошибка создания платежа' });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const notification = req.body;
    
    logger.info('YooKassa webhook received:', {
      event: notification.event,
      type: notification.type,
      paymentId: notification.object?.id,
    });

    const success = await yookassaService.processWebhook(notification);

    if (!success) {
      logger.warn('YooKassa webhook processing failed:', notification.object?.id);
      return res.status(400).send('Invalid notification');
    }

    logger.info('YooKassa webhook processed successfully:', notification.object?.id);
    res.status(200).send('OK');
  } catch (error) {
    logger.error('YooKassa webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/webhook/alfabank', async (req: Request, res: Response) => {
  try {
    const notification = req.body;
    
    logger.info('Alfabank webhook received:', {
      orderId: notification.orderId || notification.mdOrder,
      orderStatus: notification.orderStatus,
      operation: notification.operation,
    });

    const gateway = PaymentFactory.getGateway('alfabank');
    const success = await gateway.processWebhook(notification);

    if (!success) {
      logger.warn('Alfabank webhook processing failed:', notification.orderId);
      return res.status(400).send('Invalid notification');
    }

    logger.info('Alfabank webhook processed successfully:', notification.orderId);
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Alfabank webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/cancel', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await yookassaService.cancelSubscription(userId);

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

router.post('/toggle-auto-renewal', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { enabled } = req.body;

    const sub = await yookassaService.getUserSubscription(userId);
    if (!sub) {
      return res.status(404).json({ message: 'Активная подписка не найдена' });
    }

    const provider = sub.subscription.paymentProvider || 'yookassa';
    const hasPaymentMethod = provider === 'alfabank' 
      ? !!sub.subscription.alfabankPaymentMethodId 
      : !!sub.subscription.yoomoneyPaymentMethodId;

    if (enabled && !hasPaymentMethod) {
      return res.status(400).json({ message: 'Способ оплаты не сохранен. Сделайте новый платеж.' });
    }

    await db
      .update(subscriptions)
      .set({ autoRenewalEnabled: enabled })
      .where(eq(subscriptions.id, sub.subscription.id));

    res.json({ 
      message: enabled ? 'Автопродление включено' : 'Автопродление отключено',
      success: true,
    });
  } catch (error) {
    logger.error('Error toggling auto renewal:', error);
    res.status(500).json({ message: 'Ошибка при изменении автопродления' });
  }
});

router.get('/history', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const payments = await yookassaService.getPaymentHistory(userId, limit);
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

    await yookassaService.initializeDefaultPlans();
    res.json({ message: 'Тарифные планы инициализированы' });
  } catch (error) {
    logger.error('Error initializing plans:', error);
    res.status(500).json({ message: 'Ошибка инициализации планов' });
  }
});

router.get('/status', (req: Request, res: Response) => {
  const yookassaReady = yookassaService.isReady();
  const alfabankGateway = PaymentFactory.getGateway('alfabank');
  const alfabankReady = alfabankGateway.isReady();
  
  res.json({
    yoomoneyConfigured: yookassaReady,
    alfabankConfigured: alfabankReady,
    providers: {
      yookassa: {
        available: yookassaReady,
        name: 'YooKassa',
        description: 'Оплата картой через YooKassa',
      },
      alfabank: {
        available: alfabankReady,
        name: 'Альфа-Банк',
        description: 'Оплата картой через Альфа-Банк',
      },
    },
    message: yookassaReady || alfabankReady
      ? 'Платежная система настроена' 
      : 'Платежные системы не настроены',
  });
});

router.get('/admin/plans', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.adminRole) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const plans = await db
      .select()
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.sortOrder);
    
    res.json(plans);
  } catch (error) {
    logger.error('Error fetching all plans:', error);
    res.status(500).json({ message: 'Ошибка получения планов' });
  }
});

router.get('/admin/plans/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.adminRole) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, req.params.id))
      .limit(1);

    if (!plan[0]) {
      return res.status(404).json({ message: 'План не найден' });
    }

    res.json(plan[0]);
  } catch (error) {
    logger.error('Error fetching plan:', error);
    res.status(500).json({ message: 'Ошибка получения плана' });
  }
});

router.post('/admin/plans', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.adminRole) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const {
      code,
      name,
      description,
      priceMonthly,
      priceYearly,
      maxCourses,
      maxPlatforms,
      hasAnalytics,
      hasAdvancedReminders,
      hasPrioritySupport,
      sortOrder,
      features,
      isActive,
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ message: 'Код и название обязательны' });
    }

    const existingPlan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.code, code))
      .limit(1);

    if (existingPlan[0]) {
      return res.status(400).json({ message: 'План с таким кодом уже существует' });
    }

    const [newPlan] = await db
      .insert(subscriptionPlans)
      .values({
        code,
        name,
        description: description || '',
        priceMonthly: priceMonthly || '0',
        priceYearly: priceYearly || '0',
        maxCourses: maxCourses ?? null,
        maxPlatforms: maxPlatforms ?? null,
        hasAnalytics: hasAnalytics ?? false,
        hasAdvancedReminders: hasAdvancedReminders ?? false,
        hasPrioritySupport: hasPrioritySupport ?? false,
        sortOrder: sortOrder ?? 0,
        features: features || {},
        isActive: isActive ?? true,
      })
      .returning();

    logger.info('Created subscription plan:', { planId: newPlan.id, code });
    res.status(201).json(newPlan);
  } catch (error) {
    logger.error('Error creating plan:', error);
    res.status(500).json({ message: 'Ошибка создания плана' });
  }
});

router.put('/admin/plans/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.adminRole) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const {
      code,
      name,
      description,
      priceMonthly,
      priceYearly,
      maxCourses,
      maxPlatforms,
      hasAnalytics,
      hasAdvancedReminders,
      hasPrioritySupport,
      sortOrder,
      features,
      isActive,
    } = req.body;

    const existingPlan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, req.params.id))
      .limit(1);

    if (!existingPlan[0]) {
      return res.status(404).json({ message: 'План не найден' });
    }

    if (code && code !== existingPlan[0].code) {
      const duplicatePlan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.code, code))
        .limit(1);

      if (duplicatePlan[0]) {
        return res.status(400).json({ message: 'План с таким кодом уже существует' });
      }
    }

    const [updatedPlan] = await db
      .update(subscriptionPlans)
      .set({
        code: code ?? existingPlan[0].code,
        name: name ?? existingPlan[0].name,
        description: description ?? existingPlan[0].description,
        priceMonthly: priceMonthly ?? existingPlan[0].priceMonthly,
        priceYearly: priceYearly ?? existingPlan[0].priceYearly,
        maxCourses: maxCourses !== undefined ? maxCourses : existingPlan[0].maxCourses,
        maxPlatforms: maxPlatforms !== undefined ? maxPlatforms : existingPlan[0].maxPlatforms,
        hasAnalytics: hasAnalytics ?? existingPlan[0].hasAnalytics,
        hasAdvancedReminders: hasAdvancedReminders ?? existingPlan[0].hasAdvancedReminders,
        hasPrioritySupport: hasPrioritySupport ?? existingPlan[0].hasPrioritySupport,
        sortOrder: sortOrder ?? existingPlan[0].sortOrder,
        features: features ?? existingPlan[0].features,
        isActive: isActive ?? existingPlan[0].isActive,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPlans.id, req.params.id))
      .returning();

    logger.info('Updated subscription plan:', { planId: req.params.id });
    res.json(updatedPlan);
  } catch (error) {
    logger.error('Error updating plan:', error);
    res.status(500).json({ message: 'Ошибка обновления плана' });
  }
});

router.delete('/admin/plans/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.adminRole) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const existingPlan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, req.params.id))
      .limit(1);

    if (!existingPlan[0]) {
      return res.status(404).json({ message: 'План не найден' });
    }

    if (existingPlan[0].code === 'free') {
      return res.status(400).json({ message: 'Нельзя удалить бесплатный план' });
    }

    await db
      .delete(subscriptionPlans)
      .where(eq(subscriptionPlans.id, req.params.id));

    logger.info('Deleted subscription plan:', { planId: req.params.id });
    res.json({ message: 'План удален', success: true });
  } catch (error) {
    logger.error('Error deleting plan:', error);
    res.status(500).json({ message: 'Ошибка удаления плана' });
  }
});

export default router;
