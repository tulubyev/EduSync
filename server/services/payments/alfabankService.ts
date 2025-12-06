import { db } from '../../db';
import { subscriptionPlans, subscriptions, payments, users } from '../../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { IPaymentGateway, CreatePaymentOptions, PaymentResult, SubscriptionPlan, UserSubscription } from './paymentGateway';

const ALFABANK_API_URL = 'https://ecommerce.alfabank.ru/api/v1';

interface AlfabankPayment {
  orderId: string;
  orderStatus: number;
  amount: number;
  currency: string;
  formUrl?: string;
  errorCode?: number;
  errorMessage?: string;
}

class AlfabankService implements IPaymentGateway {
  readonly providerName: string = 'alfabank';
  private merchantLogin: string;
  private merchantPassword: string;
  private isConfigured: boolean = false;

  constructor() {
    this.merchantLogin = process.env.ALFABANK_USERNAME || '';
    this.merchantPassword = process.env.ALFABANK_PASSWORD || '';
    this.isConfigured = !!(this.merchantLogin && this.merchantPassword);

    if (!this.isConfigured) {
      console.warn('⚠️ AlfabankService: Not configured. Set ALFABANK_USERNAME and ALFABANK_PASSWORD');
    } else {
      console.log('✅ AlfabankService: Configured and ready');
    }
  }

  private async apiRequest<T>(
    endpoint: string,
    params: Record<string, string>
  ): Promise<T> {
    const urlParams = new URLSearchParams({
      ...params,
      userName: this.merchantLogin,
      password: this.merchantPassword,
    });

    const response = await fetch(`${ALFABANK_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: urlParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AlfabankService API error:', errorText);
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  isReady(): boolean {
    return this.isConfigured;
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.sortOrder);
      return plans as SubscriptionPlan[];
    } catch (error) {
      console.error('AlfabankService: Error fetching subscription plans:', error);
      throw error;
    }
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
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

      if (!result[0]) {
        return null;
      }

      return {
        subscription: {
          id: result[0].subscription.id,
          status: result[0].subscription.status,
          billingPeriod: result[0].subscription.billingPeriod,
          currentPeriodStart: result[0].subscription.currentPeriodStart,
          currentPeriodEnd: result[0].subscription.currentPeriodEnd,
          cancelAtPeriodEnd: result[0].subscription.cancelAtPeriodEnd,
          autoRenewalEnabled: result[0].subscription.autoRenewalEnabled,
          yoomoneyPaymentMethodId: result[0].subscription.yoomoneyPaymentMethodId,
          alfabankPaymentMethodId: result[0].subscription.alfabankPaymentMethodId,
          paymentProvider: result[0].subscription.paymentProvider,
        },
        plan: result[0].plan as SubscriptionPlan,
      };
    } catch (error) {
      console.error('AlfabankService: Error fetching user subscription:', error);
      throw error;
    }
  }

  async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
    if (!this.isReady()) {
      return { success: false, error: 'Альфа-Банк не настроен' };
    }

    try {
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, options.planId))
        .limit(1);

      const selectedPlan = plans[0];
      if (!selectedPlan) {
        return { success: false, error: 'Тарифный план не найден' };
      }

      const price = options.billingPeriod === 'yearly'
        ? parseFloat(selectedPlan.priceYearly || selectedPlan.priceMonthly)
        : parseFloat(selectedPlan.priceMonthly);

      if (price === 0) {
        return { success: false, error: 'Бесплатный план не требует оплаты' };
      }

      const orderNumber = `EPA_${Date.now()}_${uuidv4().substring(0, 8)}`;
      const description = `Подписка ${selectedPlan.name} - ${options.billingPeriod === 'yearly' ? 'Годовая' : 'Месячная'}`;

      const response = await this.apiRequest<AlfabankPayment>('/register.do', {
        orderNumber,
        amount: Math.round(price * 100).toString(),
        currency: '643',
        returnUrl: options.returnUrl,
        failUrl: `${options.returnUrl}?status=failed`,
        description,
        clientId: options.userId,
        sessionTimeoutSecs: '1200',
        features: 'FORCE_TDS',
      });

      if (response.errorCode && response.errorCode !== 0) {
        return {
          success: false,
          error: response.errorMessage || 'Ошибка создания платежа',
        };
      }

      await db.insert(payments).values({
        userId: options.userId,
        alfabankOrderId: response.orderId,
        paymentProvider: 'alfabank',
        amount: price.toString(),
        currency: 'RUB',
        status: 'pending',
        description,
        metadata: {
          planId: options.planId,
          billingPeriod: options.billingPeriod,
          planName: selectedPlan.name,
          orderNumber,
        },
      });

      return {
        success: true,
        paymentUrl: response.formUrl,
        paymentId: response.orderId,
      };
    } catch (error: any) {
      console.error('AlfabankService: Error creating payment:', error);
      return {
        success: false,
        error: error.message || 'Ошибка создания платежа. Попробуйте позже.',
      };
    }
  }

  async getPayment(paymentId: string): Promise<AlfabankPayment | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      return await this.apiRequest<AlfabankPayment>('/getOrderStatusExtended.do', {
        orderId: paymentId,
      });
    } catch (error) {
      console.error('AlfabankService: Error getting payment:', error);
      return null;
    }
  }

  async cancelPayment(paymentId: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const response = await this.apiRequest<{ errorCode: number }>('/reverse.do', {
        orderId: paymentId,
      });
      return response.errorCode === 0;
    } catch (error) {
      console.error('AlfabankService: Error canceling payment:', error);
      return false;
    }
  }

  async processWebhook(notification: any): Promise<boolean> {
    try {
      const { orderId, orderStatus, operation, mdOrder } = notification;
      const paymentOrderId = orderId || mdOrder;

      console.log('AlfabankService: Processing webhook for order:', paymentOrderId, 'status:', orderStatus);

      if (!paymentOrderId) {
        console.error('AlfabankService: Missing orderId in webhook');
        return false;
      }

      const existingPayment = await db
        .select()
        .from(payments)
        .where(eq(payments.alfabankOrderId, paymentOrderId))
        .limit(1);

      if (!existingPayment[0]) {
        console.log('AlfabankService: Payment not found for orderId:', paymentOrderId);
        return false;
      }

      const paymentRecord = existingPayment[0];

      if (orderStatus === 2) {
        await db
          .update(payments)
          .set({
            status: 'completed',
            processedAt: new Date(),
            metadata: {
              ...(paymentRecord.metadata as object || {}),
              alfabankStatus: orderStatus,
              processedEvent: operation,
            },
          })
          .where(eq(payments.id, paymentRecord.id));

        const metadata = paymentRecord.metadata as { planId: string; billingPeriod: string } | null;
        if (metadata?.planId) {
          const bindingId = notification.bindingInfo?.bindingId;
          
          await this.activateSubscription(
            paymentRecord.userId,
            metadata.planId,
            (metadata.billingPeriod as 'monthly' | 'yearly') || 'monthly',
            paymentRecord.id,
            bindingId
          );
        }

        console.log('AlfabankService: Payment processed successfully:', paymentOrderId);
      } else if (orderStatus === 3 || orderStatus === 6) {
        await db
          .update(payments)
          .set({
            status: 'cancelled',
            metadata: {
              ...(paymentRecord.metadata as object || {}),
              alfabankStatus: orderStatus,
              canceledAt: new Date().toISOString(),
            },
          })
          .where(eq(payments.id, paymentRecord.id));

        console.log('AlfabankService: Payment canceled:', paymentOrderId);
      }

      return true;
    } catch (error) {
      console.error('AlfabankService: Error processing webhook:', error);
      return false;
    }
  }

  private async activateSubscription(
    userId: string,
    planId: string,
    billingPeriod: 'monthly' | 'yearly',
    paymentId: string,
    bindingId?: string
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
          paymentProvider: 'alfabank',
          alfabankPaymentMethodId: bindingId || existingSub[0].alfabankPaymentMethodId,
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
          paymentProvider: 'alfabank',
          alfabankPaymentMethodId: bindingId,
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

    console.log(`AlfabankService: Subscription activated for user ${userId}, plan ${planId}, bindingId: ${bindingId || 'none'}`);
  }

  async createAutoPayment(subscriptionId: string): Promise<PaymentResult> {
    if (!this.isReady()) {
      return { success: false, error: 'Альфа-Банк не настроен' };
    }

    try {
      const sub = await db
        .select({
          subscription: subscriptions,
          plan: subscriptionPlans,
          user: users,
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .innerJoin(users, eq(subscriptions.userId, users.id))
        .where(eq(subscriptions.id, subscriptionId))
        .limit(1);

      if (!sub[0] || !sub[0].subscription.alfabankPaymentMethodId) {
        return { success: false, error: 'Подписка или сохранённый способ оплаты не найден' };
      }

      const { subscription, plan, user } = sub[0];
      const price = subscription.billingPeriod === 'yearly' 
        ? parseFloat(plan.priceYearly || plan.priceMonthly)
        : parseFloat(plan.priceMonthly);

      if (price === 0) {
        return { success: false, error: 'Бесплатный план' };
      }

      const orderNumber = `EPA_AUTO_${Date.now()}_${uuidv4().substring(0, 8)}`;

      const response = await this.apiRequest<AlfabankPayment>('/paymentOrderBinding.do', {
        orderNumber,
        bindingId: subscription.alfabankPaymentMethodId!,
        amount: Math.round(price * 100).toString(),
        currency: '643',
        description: `Автопродление: ${plan.name} (${subscription.billingPeriod === 'yearly' ? 'год' : 'месяц'})`,
        clientId: user.id,
      });

      if (response.errorCode && response.errorCode !== 0) {
        console.error('AlfabankService: Auto payment error:', response.errorMessage);
        
        await db
          .update(subscriptions)
          .set({ lastAutoPaymentAttemptAt: new Date() })
          .where(eq(subscriptions.id, subscriptionId));
        
        return { success: false, error: response.errorMessage || 'Ошибка автоплатежа' };
      }

      await db.insert(payments).values({
        userId: user.id,
        subscriptionId,
        alfabankOrderId: response.orderId,
        paymentProvider: 'alfabank',
        amount: price.toString(),
        currency: 'RUB',
        status: 'pending',
        description: `Auto: ${plan.name}`,
        metadata: {
          planId: plan.id,
          billingPeriod: subscription.billingPeriod,
          autoRenewal: true,
          orderNumber,
        },
      });

      await db
        .update(subscriptions)
        .set({ lastAutoPaymentAttemptAt: new Date() })
        .where(eq(subscriptions.id, subscriptionId));

      return { success: true, paymentId: response.orderId };
    } catch (error: any) {
      console.error('AlfabankService: Auto payment error:', error);
      await db
        .update(subscriptions)
        .set({ lastAutoPaymentAttemptAt: new Date() })
        .where(eq(subscriptions.id, subscriptionId));
      
      return { success: false, error: error.message || 'Ошибка автоплатежа' };
    }
  }

  async processAutoPayments(): Promise<void> {
    if (!this.isReady()) return;

    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const dueSubs = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, 'active'),
            eq(subscriptions.autoRenewalEnabled, true),
            eq(subscriptions.cancelAtPeriodEnd, false),
            eq(subscriptions.paymentProvider, 'alfabank'),
          )
        );

      let processedCount = 0;
      for (const sub of dueSubs) {
        if (sub.nextPaymentAt && new Date(sub.nextPaymentAt) <= now && sub.alfabankPaymentMethodId) {
          console.log(`AlfabankService: Processing auto payment for subscription ${sub.id}`);
          await this.createAutoPayment(sub.id);
          processedCount++;
        }
      }
      
      console.log(`AlfabankService: Daily auto payment processor completed. Processed ${processedCount} subscriptions.`);
    } catch (error) {
      console.error('AlfabankService: Error processing auto payments:', error);
    }
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
      console.error('AlfabankService: Error cancelling subscription:', error);
      return { success: false, error: 'Ошибка отмены подписки' };
    }
  }

  async getPaymentHistory(userId: string, limit = 10): Promise<any[]> {
    try {
      const paymentHistory = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.userId, userId),
            eq(payments.paymentProvider, 'alfabank')
          )
        )
        .orderBy(desc(payments.createdAt))
        .limit(limit);
      
      return paymentHistory;
    } catch (error) {
      console.error('AlfabankService: Error fetching payment history:', error);
      throw error;
    }
  }

  async initializeDefaultPlans(): Promise<void> {
    console.log('AlfabankService: Plans are shared with YooKassa, no separate initialization needed');
  }
}

export const alfabankService = new AlfabankService();
