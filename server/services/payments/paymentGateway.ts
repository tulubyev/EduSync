export interface CreatePaymentOptions {
  userId: string;
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  returnUrl: string;
}

export interface PaymentResult {
  success: boolean;
  paymentUrl?: string;
  paymentId?: string;
  error?: string;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: string;
  priceYearly: string | null;
  features: Record<string, any> | null;
  maxCourses: number | null;
  maxPlatforms: number | null;
  hasAnalytics: boolean | null;
  hasAdvancedReminders: boolean | null;
  hasPrioritySupport: boolean | null;
  isActive: boolean | null;
  sortOrder: number | null;
}

export interface UserSubscription {
  subscription: {
    id: string;
    status: string | null;
    billingPeriod: string | null;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean | null;
    autoRenewalEnabled: boolean | null;
    yoomoneyPaymentMethodId: string | null;
    alfabankPaymentMethodId?: string | null;
    paymentProvider?: string | null;
  };
  plan: SubscriptionPlan;
}

export interface IPaymentGateway {
  readonly providerName: string;
  
  isReady(): boolean;
  
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  
  getUserSubscription(userId: string): Promise<UserSubscription | null>;
  
  createPayment(options: CreatePaymentOptions): Promise<PaymentResult>;
  
  getPayment(paymentId: string): Promise<any | null>;
  
  cancelPayment(paymentId: string): Promise<boolean>;
  
  processWebhook(notification: any): Promise<boolean>;
  
  createAutoPayment(subscriptionId: string): Promise<PaymentResult>;
  
  processAutoPayments(): Promise<void>;
  
  cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }>;
  
  getPaymentHistory(userId: string, limit?: number): Promise<any[]>;
  
  initializeDefaultPlans(): Promise<void>;
}

export type PaymentProvider = 'yookassa' | 'alfabank';
