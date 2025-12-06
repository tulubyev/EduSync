import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Check, 
  Crown, 
  Zap, 
  Star,
  Calendar,
  AlertCircle,
  Loader2,
  ExternalLink,
  History
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  maxCourses: number | null;
  maxPlatforms: number | null;
  hasAnalytics: boolean;
  hasAdvancedReminders: boolean;
  hasPrioritySupport: boolean;
  features: Record<string, any>;
}

interface UserSubscription {
  subscription: {
    id: string;
    status: string;
    billingPeriod: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    autoRenewalEnabled?: boolean;
    yoomoneyPaymentMethodId?: string | null;
    alfabankPaymentMethodId?: string | null;
    paymentProvider?: string | null;
  };
  plan: SubscriptionPlan;
}

interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
  processedAt: string | null;
  paymentProvider?: string;
}

interface PaymentProviderInfo {
  available: boolean;
  name: string;
  description: string;
}

interface PaymentProvidersStatus {
  yoomoneyConfigured: boolean;
  alfabankConfigured: boolean;
  providers: {
    yookassa: PaymentProviderInfo;
    alfabank: PaymentProviderInfo;
  };
}

export function SubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [yoomoneyConfigured, setYoomoneyConfigured] = useState(false);
  const [alfabankConfigured, setAlfabankConfigured] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'yookassa' | 'alfabank'>('yookassa');
  const [showHistory, setShowHistory] = useState(false);
  const [autoRenewalLoading, setAutoRenewalLoading] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Refetch data when page becomes visible (user returns from payment)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Aggressive refresh for 30 seconds when returning from payment
        let count = 0;
        const aggressiveInterval = setInterval(() => {
          fetchData();
          count++;
          if (count >= 15) { // 15 checks * 2 seconds = 30 seconds
            clearInterval(aggressiveInterval);
          }
        }, 2000);
      }
    };
    
    // Auto-refresh every 30 seconds to catch webhook updates
    const refreshInterval = setInterval(fetchData, 30000);
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      // Add cache busting to ensure fresh data
      const cacheBuster = `?_t=${Date.now()}`;
      
      const [plansRes, subRes, statusRes, historyRes] = await Promise.all([
        fetch(`/api/subscriptions/plans${cacheBuster}`),
        fetch(`/api/subscriptions/current${cacheBuster}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
          },
        }),
        fetch(`/api/subscriptions/status${cacheBuster}`),
        fetch(`/api/subscriptions/history${cacheBuster}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
          },
        }),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        console.log('📊 Updated subscription data:', subData);
        setCurrentSubscription(subData);
      } else {
        console.log('⚠️ Subscription endpoint returned:', subRes.status);
      }

      if (statusRes.ok) {
        const statusData: PaymentProvidersStatus = await statusRes.json();
        setYoomoneyConfigured(statusData.yoomoneyConfigured);
        setAlfabankConfigured(statusData.alfabankConfigured);
        if (!statusData.yoomoneyConfigured && statusData.alfabankConfigured) {
          setSelectedProvider('alfabank');
        }
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setPayments(historyData);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    const providerAvailable = selectedProvider === 'alfabank' ? alfabankConfigured : yoomoneyConfigured;
    if (!providerAvailable) {
      alert('Выбранная платежная система временно недоступна. Пожалуйста, выберите другую или попробуйте позже.');
      return;
    }

    try {
      setProcessingPlan(planId);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/subscriptions/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId,
          billingPeriod,
          provider: selectedProvider,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.paymentUrl, '_blank');
        
        // Start aggressive polling to catch payment completion
        let pollCount = 0;
        const pollInterval = setInterval(() => {
          fetchData();
          pollCount++;
          if (pollCount >= 30) { // 30 checks * 2 seconds = 60 seconds max
            clearInterval(pollInterval);
          }
        }, 2000);
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка создания платежа');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Ошибка соединения. Попробуйте позже.');
    } finally {
      setProcessingPlan(null);
    }
  };

  const toggleAutoRenewal = async (enabled: boolean) => {
    try {
      setAutoRenewalLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/subscriptions/toggle-auto-renewal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        fetchData();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка при изменении автопродления');
      }
    } catch (error) {
      console.error('Error toggling auto renewal:', error);
      alert('Ошибка соединения');
    } finally {
      setAutoRenewalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Вы уверены, что хотите отменить подписку? Вы сохраните доступ до конца оплаченного периода.')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('Подписка будет отменена в конце текущего периода');
        fetchData();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка отмены подписки');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Ошибка соединения');
    }
  };

  const getPlanIcon = (code: string) => {
    switch (code) {
      case 'premium':
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 'standard':
        return <Zap className="w-6 h-6 text-blue-500" />;
      default:
        return <Star className="w-6 h-6 text-gray-400" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return num === 0 ? 'Бесплатно' : `${num.toLocaleString('ru-RU')} ₽`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-purple-600" />
          Подписка
        </h1>
        <p className="text-gray-600 mt-1">Управление тарифным планом и платежами</p>
      </div>

      {currentSubscription && currentSubscription.plan.code !== 'free' && (
        <Card className="mb-8 border-green-200 bg-gradient-to-r from-green-50 to-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getPlanIcon(currentSubscription.plan.code)}
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">Ваш текущий план: {currentSubscription.plan.name}</CardTitle>
                    <Badge className="bg-green-500">✓ АКТИВНА</Badge>
                  </div>
                  <CardDescription>
                    {currentSubscription.subscription.billingPeriod === 'yearly' ? 'Годовая подписка' : 'Месячная подписка'}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <div>
                  <p className="text-xs text-gray-500">Активна до</p>
                  <p className="font-medium text-gray-800">{formatDate(currentSubscription.subscription.currentPeriodEnd)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <div>
                  <p className="text-xs text-gray-500">Следующий платеж</p>
                  <p className="font-medium text-gray-800">{formatDate(currentSubscription.subscription.currentPeriodEnd)}</p>
                </div>
              </div>
            </div>
            {currentSubscription.subscription.yoomoneyPaymentMethodId && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200 mb-3">
                <input
                  type="checkbox"
                  checked={currentSubscription.subscription.autoRenewalEnabled || false}
                  onChange={(e) => toggleAutoRenewal(e.target.checked)}
                  disabled={autoRenewalLoading}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm text-green-900">Автоматическое продление</p>
                  <p className="text-xs text-green-700">Подписка будет автоматически продлеваться</p>
                </div>
              </div>
            )}
            {currentSubscription.subscription.cancelAtPeriodEnd && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg flex items-center gap-2 text-orange-700">
                <AlertCircle className="w-5 h-5" />
                <span>Подписка будет отменена {formatDate(currentSubscription.subscription.currentPeriodEnd)}</span>
              </div>
            )}
          </CardContent>
          {!currentSubscription.subscription.cancelAtPeriodEnd && (
            <CardFooter>
              <Button variant="outline" onClick={handleCancelSubscription} className="text-red-600 hover:bg-red-50">
                Отменить подписку
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      <div className="flex items-center justify-center gap-4 mb-8">
        <span className={`text-sm font-medium transition-colors min-w-fit ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
          Ежемесячно
        </span>
        <button
          onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
          className={`relative w-16 h-8 rounded-full transition-all flex-shrink-0 ${
            billingPeriod === 'yearly' ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${
              billingPeriod === 'yearly' ? 'translate-x-8' : 'translate-x-0'
            }`}
          />
        </button>
        <div className="flex items-center gap-2 min-w-fit">
          <span className={`text-sm font-medium transition-colors ${billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
            Ежегодно
          </span>
          {billingPeriod === 'yearly' && (
            <Badge className="bg-green-100 text-green-700">-20%</Badge>
          )}
        </div>
      </div>

      {(yoomoneyConfigured || alfabankConfigured) && (
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="text-sm text-gray-600">Способ оплаты:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedProvider('yookassa')}
              disabled={!yoomoneyConfigured}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedProvider === 'yookassa'
                  ? 'bg-purple-600 text-white'
                  : yoomoneyConfigured
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              YooKassa
            </button>
            <button
              onClick={() => setSelectedProvider('alfabank')}
              disabled={!alfabankConfigured}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedProvider === 'alfabank'
                  ? 'bg-red-600 text-white'
                  : alfabankConfigured
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Альфа-Банк
            </button>
          </div>
        </div>
      )}

      {!yoomoneyConfigured && !alfabankConfigured && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <span className="text-yellow-800">Платежные системы в процессе настройки. Оплата временно недоступна.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription?.plan.code === plan.code;
          const price = billingPeriod === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const isFree = parseFloat(plan.priceMonthly) === 0;

          return (
            <Card 
              key={plan.id} 
              className={`relative overflow-hidden transition-shadow hover:shadow-lg flex flex-col ${
                plan.code === 'standard' ? 'border-blue-300 shadow-blue-100' : ''
              } ${plan.code === 'premium' ? 'border-yellow-300 shadow-yellow-100' : ''
              } ${isCurrentPlan ? 'ring-2 ring-purple-500' : ''}`}
            >
              {plan.code === 'standard' && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-bl-lg">
                  Популярный
                </div>
              )}
              {plan.code === 'premium' && (
                <div className="absolute top-0 right-0 bg-yellow-600 text-white text-xs px-3 py-1 rounded-bl-lg">
                  Лучший
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  {getPlanIcon(plan.code)}
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-grow">
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-800">
                    {formatPrice(price)}
                  </span>
                  {!isFree && (
                    <span className="text-gray-500 text-sm">
                      /{billingPeriod === 'yearly' ? 'год' : 'мес'}
                    </span>
                  )}
                </div>

                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>
                      {plan.maxCourses === null ? 'Безлимит курсов' : `До ${plan.maxCourses} курсов`}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>
                      {plan.maxPlatforms === null ? 'Все платформы' : `До ${plan.maxPlatforms} платформ`}
                    </span>
                  </li>
                  {plan.hasAnalytics && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Расширенная аналитика</span>
                    </li>
                  )}
                  {plan.hasAdvancedReminders && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Умные напоминания</span>
                    </li>
                  )}
                  {plan.hasPrioritySupport && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Приоритетная поддержка</span>
                    </li>
                  )}
                </ul>
              </CardContent>

              <CardFooter className="mt-auto">
                {isCurrentPlan ? (
                  <Button disabled className="w-full" variant="outline">
                    Текущий план
                  </Button>
                ) : isFree ? (
                  <Button disabled className="w-full" variant="outline">
                    Базовый план
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${plan.code === 'standard' ? 'bg-blue-600 hover:bg-blue-700' : ''} ${plan.code === 'premium' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={processingPlan === plan.id || !yoomoneyConfigured}
                  >
                    {processingPlan === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      <>
                        Оформить
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              История платежей
              {payments.length > 0 && (
                <Badge variant="outline">{payments.length}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? 'Скрыть' : 'Показать'}
            </Button>
          </div>
        </CardHeader>
        
        {showHistory && (
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Нет платежей</p>
            ) : (
              <div className="space-y-3">
                {/* Сначала показываем оплаченные платежи */}
                {payments
                  .filter(p => p.status === 'completed')
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((payment) => (
                  <div 
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{payment.description}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-700">{formatPrice(payment.amount)}</p>
                      <Badge className="bg-green-500">
                        ✓ Оплачено
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {/* Затем показываем ожидающие платежи */}
                {payments
                  .filter(p => p.status === 'pending')
                  .map((payment) => (
                  <div 
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{payment.description}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-yellow-700">{formatPrice(payment.amount)}</p>
                      <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
                        ⏳ Ожидание платежа
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {/* И остальные статусы в конце */}
                {payments
                  .filter(p => p.status !== 'completed' && p.status !== 'pending')
                  .map((payment) => (
                  <div 
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{payment.description}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(payment.amount)}</p>
                      <Badge variant="secondary" className="bg-red-200 text-red-800">
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
