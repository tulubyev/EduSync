import { db } from '../db';
import { subscriptionPlans, subscriptions, payments, users } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

interface CreatePaymentOptions {
  userId: string;
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  returnUrl: string;
}

interface PaymentResult {
  success: boolean;
  paymentUrl?: string;
  paymentId?: string;
  error?: string;
}

interface YookassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: {
    value: string;
    currency: string;
  };
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
  paid: boolean;
}

class YookassaService {
  private shopId: string;
  private secretKey: string;
  private isConfigured: boolean = false;

  constructor() {
    this.shopId = process.env.YOOKASSA_SHOP_ID || '';
    this.secretKey = process.env.YOOKASSA_SECRET_KEY || '';
    this.isConfigured = !!(this.shopId && this.secretKey);

    if (!this.isConfigured) {
      console.warn('⚠️ YookassaService: Not configured. Set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY');
    } else {
      console.log('✅ YookassaService: Configured and ready');
    }
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async apiRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: object,
    idempotenceKey?: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json',
    };

    if (idempotenceKey) {
      headers['Idempotence-Key'] = idempotenceKey;
    }

    const response = await fetch(`${YOOKASSA_API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('YookassaService API error:', errorData);
      throw new Error(errorData.description || `API Error: ${response.status}`);
    }

    return response.json();
  }

  isReady(): boolean {
    return this.isConfigured;
  }

  async getSubscriptionPlans() {
    try {
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.sortOrder);
      return plans;
    } catch (error) {
      console.error('YookassaService: Error fetching subscription plans:', error);
      throw error;
    }
  }

  async getUserSubscription(userId: string) {
    try {
      const result = await db
        .select({
          subscription: subscriptions,
          plan: subscriptionPlans,
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, 'active')
          )
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('YookassaService: Error fetching user subscription:', error);
      throw error;
    }
  }

  async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'YooKassa не настроена. Обратитесь к администратору.',
      };
    }

    try {
      const plan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, options.planId))
        .limit(1);

      if (!plan[0]) {
        return { success: false, error: 'План подписки не найден' };
      }

      const selectedPlan = plan[0];
      const price = options.billingPeriod === 'yearly' 
        ? parseFloat(selectedPlan.priceYearly || selectedPlan.priceMonthly)
        : parseFloat(selectedPlan.priceMonthly);

      if (price === 0) {
        return { success: false, error: 'Бесплатный план не требует оплаты' };
      }

      const idempotenceKey = uuidv4();
      const description = `Подписка ${selectedPlan.name} - ${options.billingPeriod === 'yearly' ? 'Годовая' : 'Месячная'}`;

      const paymentData = {
        amount: {
          value: price.toFixed(2),
          currency: 'RUB',
        },
        confirmation: {
          type: 'redirect',
          return_url: options.returnUrl,
        },
        capture: true,
        description,
        metadata: {
          userId: options.userId,
          planId: options.planId,
          billingPeriod: options.billingPeriod,
          planName: selectedPlan.name,
        },
      };

      const payment = await this.apiRequest<YookassaPayment>(
        'POST',
        '/payments',
        paymentData,
        idempotenceKey
      );

      await db.insert(payments).values({
        userId: options.userId,
        yoomoneyOperationId: payment.id,
        amount: price.toString(),
        currency: 'RUB',
        status: 'pending',
        description,
        metadata: {
          planId: options.planId,
          billingPeriod: options.billingPeriod,
          planName: selectedPlan.name,
          yookassaPaymentId: payment.id,
        },
      });

      const confirmationUrl = payment.confirmation?.confirmation_url;

      if (!confirmationUrl) {
        return {
          success: false,
          error: 'Не удалось получить ссылку на оплату',
        };
      }

      return {
        success: true,
        paymentUrl: confirmationUrl,
        paymentId: payment.id,
      };
    } catch (error: any) {
      console.error('YookassaService: Error creating payment:', error);
      return {
        success: false,
        error: error.message || 'Ошибка создания платежа. Попробуйте позже.',
      };
    }
  }

  async getPayment(paymentId: string): Promise<YookassaPayment | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      return await this.apiRequest<YookassaPayment>('GET', `/payments/${paymentId}`);
    } catch (error) {
      console.error('YookassaService: Error getting payment:', error);
      return null;
    }
  }

  async cancelPayment(paymentId: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const idempotenceKey = uuidv4();
      await this.apiRequest<YookassaPayment>(
        'POST',
        `/payments/${paymentId}/cancel`,
        {},
        idempotenceKey
      );
      return true;
    } catch (error) {
      console.error('YookassaService: Error canceling payment:', error);
      return false;
    }
  }

  async processWebhook(notification: any): Promise<boolean> {
    try {
      const { event, object } = notification;

      console.log('YookassaService: Processing webhook event:', event);

      if (!['payment.succeeded', 'payment.waiting_for_capture', 'payment.canceled'].includes(event)) {
        console.log('YookassaService: Ignoring event:', event);
        return true;
      }

      const paymentId = object.id;
      const status = object.status;

      const existingPayment = await db
        .select()
        .from(payments)
        .where(eq(payments.yoomoneyOperationId, paymentId))
        .limit(1);

      if (!existingPayment[0]) {
        console.warn('YookassaService: Payment not found for id:', paymentId);
        return false;
      }

      const paymentRecord = existingPayment[0];

      if (paymentRecord.status === 'completed') {
        console.log('YookassaService: Payment already processed:', paymentId);
        return true;
      }

      if (event === 'payment.succeeded' && status === 'succeeded') {
        await db
          .update(payments)
          .set({
            status: 'completed',
            processedAt: new Date(),
            metadata: {
              ...(paymentRecord.metadata as object || {}),
              yookassaStatus: status,
              processedEvent: event,
            },
          })
          .where(eq(payments.id, paymentRecord.id));

        const metadata = paymentRecord.metadata as { planId: string; billingPeriod: string } | null;
        if (metadata?.planId) {
          await this.activateSubscription(
            paymentRecord.userId,
            metadata.planId,
            (metadata.billingPeriod as 'monthly' | 'yearly') || 'monthly',
            paymentRecord.id
          );
        }

        console.log('YookassaService: Payment processed successfully:', paymentId);
      } else if (event === 'payment.canceled') {
        await db
          .update(payments)
          .set({
            status: 'cancelled',
            metadata: {
              ...(paymentRecord.metadata as object || {}),
              yookassaStatus: status,
              processedEvent: event,
              canceledAt: new Date().toISOString(),
            },
          })
          .where(eq(payments.id, paymentRecord.id));

        console.log('YookassaService: Payment canceled:', paymentId);
      }

      return true;
    } catch (error) {
      console.error('YookassaService: Error processing webhook:', error);
      return false;
    }
  }

  private async activateSubscription(
    userId: string,
    planId: string,
    billingPeriod: 'monthly' | 'yearly',
    paymentId: string
  ): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now);
    
    if (billingPeriod === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const existingSub = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      )
      .limit(1);

    if (existingSub[0]) {
      await db
        .update(subscriptions)
        .set({
          planId,
          billingPeriod,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          lastPaymentAt: now,
          nextPaymentAt: periodEnd,
          updatedAt: now,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        })
        .where(eq(subscriptions.id, existingSub[0].id));

      await db
        .update(payments)
        .set({ subscriptionId: existingSub[0].id })
        .where(eq(payments.id, paymentId));
    } else {
      const [newSub] = await db
        .insert(subscriptions)
        .values({
          userId,
          planId,
          status: 'active',
          billingPeriod,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          lastPaymentAt: now,
          nextPaymentAt: periodEnd,
        })
        .returning();

      await db
        .update(payments)
        .set({ subscriptionId: newSub.id })
        .where(eq(payments.id, paymentId));
    }

    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1);

    if (plan[0]) {
      await db
        .update(users)
        .set({ planType: plan[0].code })
        .where(eq(users.id, userId));
    }

    console.log(`YookassaService: Subscription activated for user ${userId}, plan ${planId}`);
  }

  async cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const sub = await this.getUserSubscription(userId);
      
      if (!sub) {
        return { success: false, error: 'Активная подписка не найдена' };
      }

      await db
        .update(subscriptions)
        .set({
          cancelAtPeriodEnd: true,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, sub.subscription.id));

      return { success: true };
    } catch (error) {
      console.error('YookassaService: Error cancelling subscription:', error);
      return { success: false, error: 'Ошибка отмены подписки' };
    }
  }

  async getPaymentHistory(userId: string, limit = 10) {
    try {
      const paymentHistory = await db
        .select()
        .from(payments)
        .where(eq(payments.userId, userId))
        .orderBy(desc(payments.createdAt))
        .limit(limit);
      
      return paymentHistory;
    } catch (error) {
      console.error('YookassaService: Error fetching payment history:', error);
      throw error;
    }
  }

  async initializeDefaultPlans(): Promise<void> {
    try {
      const existingPlans = await db.select().from(subscriptionPlans);
      
      if (existingPlans.length > 0) {
        console.log('YookassaService: Subscription plans already exist');
        return;
      }

      const defaultPlans = [
        {
          code: 'free',
          name: 'Бесплатный',
          description: 'Базовый доступ к платформе',
          priceMonthly: '0',
          priceYearly: '0',
          maxCourses: 5,
          maxPlatforms: 3,
          hasAnalytics: false,
          hasAdvancedReminders: false,
          hasPrioritySupport: false,
          sortOrder: 0,
          features: {
            courses: 5,
            platforms: 3,
            storage: '100 MB',
            support: 'Базовая поддержка',
          },
        },
        {
          code: 'premium',
          name: 'Премиум',
          description: 'Расширенные возможности для активного обучения',
          priceMonthly: '299',
          priceYearly: '2990',
          maxCourses: 50,
          maxPlatforms: 10,
          hasAnalytics: true,
          hasAdvancedReminders: true,
          hasPrioritySupport: false,
          sortOrder: 1,
          features: {
            courses: 50,
            platforms: 10,
            storage: '5 GB',
            analytics: true,
            reminders: true,
            support: 'Приоритетная поддержка',
          },
        },
        {
          code: 'pro',
          name: 'Про',
          description: 'Максимальные возможности без ограничений',
          priceMonthly: '599',
          priceYearly: '5990',
          maxCourses: null,
          maxPlatforms: null,
          hasAnalytics: true,
          hasAdvancedReminders: true,
          hasPrioritySupport: true,
          sortOrder: 2,
          features: {
            courses: 'Безлимит',
            platforms: 'Безлимит',
            storage: '50 GB',
            analytics: true,
            reminders: true,
            aiAssistant: true,
            support: 'VIP поддержка 24/7',
          },
        },
      ];

      await db.insert(subscriptionPlans).values(defaultPlans);
      console.log('YookassaService: Default subscription plans created');
    } catch (error) {
      console.error('YookassaService: Error initializing default plans:', error);
    }
  }
}

export const yookassaService = new YookassaService();
