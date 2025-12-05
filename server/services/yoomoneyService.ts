import crypto from 'crypto';
import { PaymentFormBuilder, QuickPayForm, PaymentType, NotificationChecker } from 'yoomoney-sdk';
import { db } from '../db';
import { subscriptionPlans, subscriptions, payments, users } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

interface PaymentNotification {
  notification_type: string;
  operation_id: string;
  amount: string;
  currency: string;
  datetime: string;
  sender: string;
  label: string;
  sha1_hash: string;
  codepro?: string;
  withdraw_amount?: string;
}

interface CreatePaymentOptions {
  userId: string;
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  returnUrl: string;
}

interface PaymentResult {
  success: boolean;
  paymentUrl?: string;
  paymentLabel?: string;
  error?: string;
}

class YoomoneyService {
  private isConfigured: boolean;
  private walletNumber: string;
  private notificationSecret: string;

  constructor() {
    this.walletNumber = process.env.YOOMONEY_WALLET_NUMBER || '';
    this.notificationSecret = process.env.YOOMONEY_NOTIFICATION_SECRET || '';
    this.isConfigured = !!(this.walletNumber && this.notificationSecret);

    if (!this.isConfigured) {
      console.warn('⚠️ YoomoneyService: Not configured. Set YOOMONEY_WALLET_NUMBER and YOOMONEY_NOTIFICATION_SECRET');
    } else {
      console.log('✅ YoomoneyService: Configured and ready');
    }
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
      console.error('YoomoneyService: Error fetching subscription plans:', error);
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
      console.error('YoomoneyService: Error fetching user subscription:', error);
      throw error;
    }
  }

  async createPaymentLink(options: CreatePaymentOptions): Promise<PaymentResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Yoomoney не настроен. Обратитесь к администратору.',
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

      const paymentLabel = `sub_${options.userId}_${options.planId}_${Date.now()}`;
      
      const payment = new PaymentFormBuilder({
        receiver: this.walletNumber,
        quickPayForm: QuickPayForm.Button,
        sum: price,
        targets: `Подписка ${selectedPlan.name} (${options.billingPeriod === 'yearly' ? 'Годовая' : 'Месячная'})`,
        paymentType: PaymentType.FromCard,
        label: paymentLabel,
        successURL: options.returnUrl,
      });

      await db.insert(payments).values({
        userId: options.userId,
        yoomoneyLabel: paymentLabel,
        amount: price.toString(),
        currency: 'RUB',
        status: 'pending',
        description: `Подписка ${selectedPlan.name} - ${options.billingPeriod === 'yearly' ? 'Годовая' : 'Месячная'}`,
        metadata: {
          planId: options.planId,
          billingPeriod: options.billingPeriod,
          planName: selectedPlan.name,
        },
      });

      return {
        success: true,
        paymentUrl: payment.url,
        paymentLabel,
      };
    } catch (error) {
      console.error('YoomoneyService: Error creating payment link:', error);
      return {
        success: false,
        error: 'Ошибка создания платежа. Попробуйте позже.',
      };
    }
  }

  verifyNotification(notification: PaymentNotification): boolean {
    if (!this.isConfigured) {
      console.warn('YoomoneyService: Cannot verify - not configured');
      return false;
    }

    const {
      notification_type,
      operation_id,
      amount,
      currency,
      datetime,
      sender,
      codepro,
      label,
      sha1_hash,
    } = notification;

    const hashString = `${notification_type}&${operation_id}&${amount}&${currency}&${datetime}&${sender}&${codepro || 'false'}&${this.notificationSecret}&${label}`;
    
    const calculatedHash = crypto
      .createHash('sha1')
      .update(hashString)
      .digest('hex');

    return calculatedHash === sha1_hash;
  }

  async processPaymentNotification(notification: PaymentNotification): Promise<boolean> {
    try {
      if (!this.verifyNotification(notification)) {
        console.warn('YoomoneyService: Invalid notification signature');
        return false;
      }

      const existingPayment = await db
        .select()
        .from(payments)
        .where(eq(payments.yoomoneyLabel, notification.label))
        .limit(1);

      if (!existingPayment[0]) {
        console.warn('YoomoneyService: Payment not found for label:', notification.label);
        return false;
      }

      const paymentRecord = existingPayment[0];

      if (paymentRecord.status === 'completed') {
        console.log('YoomoneyService: Payment already processed:', notification.label);
        return true;
      }

      await db
        .update(payments)
        .set({
          status: 'completed',
          yoomoneyOperationId: notification.operation_id,
          processedAt: new Date(),
          metadata: {
            ...(paymentRecord.metadata as object || {}),
            notificationType: notification.notification_type,
            sender: notification.sender,
            datetime: notification.datetime,
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

      console.log('YoomoneyService: Payment processed successfully:', notification.label);
      return true;
    } catch (error) {
      console.error('YoomoneyService: Error processing notification:', error);
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

    console.log(`YoomoneyService: Subscription activated for user ${userId}, plan ${planId}`);
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
      console.error('YoomoneyService: Error cancelling subscription:', error);
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
      console.error('YoomoneyService: Error fetching payment history:', error);
      throw error;
    }
  }

  async initializeDefaultPlans(): Promise<void> {
    try {
      const existingPlans = await db.select().from(subscriptionPlans);
      
      if (existingPlans.length > 0) {
        console.log('YoomoneyService: Subscription plans already exist');
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
      console.log('YoomoneyService: Default subscription plans created');
    } catch (error) {
      console.error('YoomoneyService: Error initializing default plans:', error);
    }
  }
}

export const yoomoneyService = new YoomoneyService();
