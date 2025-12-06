# Система Платежей EPA (Агрегатор Онлайн Обучения)

## Содержание
1. [Обзор](#обзор)
2. [Текущая реализация YooKassa](#текущая-реализация-yookassa)
3. [Архитектура платёжной системы](#архитектура-платёжной-системы)
4. [Интеграция новых платёжных шлюзов](#интеграция-новых-платёжных-шлюзов)
5. [Альфа-Банк: Рекомендации по интеграции](#альфа-банк-рекомендации-по-интеграции)

---

## Обзор

Платёжная система EPA поддерживает управление подписками через платёжный шлюз YooKassa с функциями:
- Единовременные платежи за подписки (месячное/годовое)
- Сохранение платёжных методов (карты)
- Автоматическое продление подписок (один раз в день)
- История платежей с отслеживанием статусов
- Webhook обработка уведомлений от YooKassa

---

## Текущая реализация YooKassa

### Схема данных

#### Таблица `subscriptions`
```sql
- id (UUID)                          -- Уникальный ID подписки
- userId (UUID)                      -- Связь с пользователем
- planId (UUID)                      -- Связь с тарифным планом
- status (varchar)                   -- active, cancelled, expired, past_due
- billingPeriod (varchar)            -- monthly, yearly
- currentPeriodStart (timestamp)     -- Начало текущего периода
- currentPeriodEnd (timestamp)       -- Конец текущего периода (дата платежа)
- cancelAtPeriodEnd (boolean)        -- Отмена подписки в конце периода
- cancelledAt (timestamp)            -- Дата отмены
- yoomoneyPaymentMethodId (varchar)  -- ID сохранённого способа оплаты
- autoRenewalEnabled (boolean)       -- Включено ли автопродление
- lastPaymentAt (timestamp)          -- Дата последнего платежа
- nextPaymentAt (timestamp)          -- Дата следующего платежа (для крон-джоба)
- lastAutoPaymentAttemptAt (timestamp) -- Отслеживание попыток автоплатежа
```

#### Таблица `payments`
```sql
- id (UUID)                          -- Уникальный ID платежа
- userId (UUID)                      -- Пользователь, сделавший платёж
- subscriptionId (UUID)              -- Связанная подписка (если есть)
- yoomoneyOperationId (varchar)      -- ID платежа в системе YooKassa
- yoomoneyLabel (varchar)            -- Уникальная метка платежа
- amount (decimal)                   -- Сумма платежа (RUB)
- currency (varchar)                 -- Валюта (RUB)
- status (varchar)                   -- pending, completed, failed, refunded
- paymentType (varchar)              -- AC (карта), PC (кошелёк), SB (SberPay)
- description (text)                 -- Описание платежа
- failureReason (text)               -- Причина отказа
- metadata (jsonb)                   -- Дополнительные данные (planId, billingPeriod, etc.)
- processedAt (timestamp)            -- Время обработки
```

### Основные методы YookassaService

#### createPayment()
```typescript
// Создание платежа с запросом на сохранение карты
// Параметры: userId, planId, billingPeriod, returnUrl
// Возвращает: paymentUrl для редиректа пользователя
```

**Процесс:**
1. Получить тариф и рассчитать сумму
2. Создать платёж в YooKassa с флагом `save_payment_method: true`
3. Сохранить платёж в БД со статусом `pending`
4. Вернуть URL для редиректа пользователя на страницу оплаты

#### processWebhook()
```typescript
// Обработка уведомлений от YooKassa
// События: payment.succeeded, payment.waiting_for_capture, payment.canceled
```

**Процесс:**
1. Получить ID платежа из notification
2. Найти платёж в БД
3. Обновить статус платежа
4. Если статус `succeeded`:
   - Извлечь `payment_method.id` из уведомления
   - Активировать подписку (activateSubscription)
   - Сохранить `payment_method_id`

#### activateSubscription()
```typescript
// Активация/продление подписки после успешного платежа
```

**Процесс:**
1. Рассчитать дату конца периода (текущая дата + 1 месяц/год)
2. Установить `nextPaymentAt = currentPeriodEnd` (для крон-джоба)
3. Если есть активная подписка → обновить её
4. Если нет → создать новую
5. Обновить `planType` в таблице users

#### createAutoPayment()
```typescript
// Списание по сохранённой карте для автопродления
// Параметры: subscriptionId
```

**Процесс:**
1. Получить подписку и её способ оплаты (`yoomoneyPaymentMethodId`)
2. Рассчитать сумму по тарифу и периоду
3. Создать платёж в YooKassa с `payment_method_id`
4. Сохранить платёж в БД
5. Обновить `lastAutoPaymentAttemptAt` для отслеживания

#### processAutoPayments()
```typescript
// Ежедневная обработка автоплатежей (запускается в полночь)
```

**Процесс:**
1. Получить текущую дату (начало дня)
2. Найти все подписки где:
   - status = 'active'
   - autoRenewalEnabled = true
   - cancelAtPeriodEnd = false
   - nextPaymentAt <= today
3. Для каждой подписки вызвать createAutoPayment()
4. Залогировать количество обработанных платежей

### API Endpoints

#### POST `/api/subscriptions/create-payment`
```
Заголовки: Authorization: Bearer {token}
Тело:
{
  planId: string,
  billingPeriod: 'monthly' | 'yearly'
}

Ответ:
{
  success: boolean,
  paymentUrl?: string,
  paymentId?: string,
  message?: string
}
```

#### POST `/api/subscriptions/webhook`
```
Заголовки: Content-Type: application/json
Тело: Webhook от YooKassa (обработать автоматически)

Ответ: { success: true } или { success: false }
```

#### GET `/api/subscriptions/current`
```
Заголовки: Authorization: Bearer {token}

Ответ:
{
  subscription: {
    id: string,
    status: string,
    billingPeriod: string,
    currentPeriodStart: string,
    currentPeriodEnd: string,
    cancelAtPeriodEnd: boolean,
    autoRenewalEnabled?: boolean,
    yoomoneyPaymentMethodId?: string | null
  },
  plan: SubscriptionPlan
}
```

#### POST `/api/subscriptions/toggle-auto-renewal`
```
Заголовки: Authorization: Bearer {token}
Тело:
{
  enabled: boolean
}

Ответ:
{
  success: boolean,
  message: string
}
```

#### POST `/api/subscriptions/cancel`
```
Заголовки: Authorization: Bearer {token}

Ответ:
{
  success: boolean,
  message: string
}
```

#### GET `/api/subscriptions/history`
```
Заголовки: Authorization: Bearer {token}
Параметры: ?limit=10

Ответ:
[
  {
    id: string,
    amount: string,
    currency: string,
    status: string,
    description: string,
    createdAt: string,
    processedAt: string | null
  }
]
```

### Планировщик задач

#### Auto Payment Processor (server/index.ts)
```typescript
// Запускается один раз в день в полночь (00:00)
// Следующий запуск рассчитывается до следующей полночи

scheduleAutoPaymentProcessor():
  - Рассчитать время до следующей полночи
  - Запланировать processAutoPayments() на это время
  - Затем повторять каждые 24 часа
```

---

## Архитектура платёжной системы

### Текущая структура (Monolithic)

```
server/services/yookassaService.ts
└── Один сервис для одной системы платежей
    ├── YooKassa API интеграция
    ├── Логика создания платежей
    ├── Обработка webhooks
    ├── Активация подписок
    └── Автоплатежи
```

**Проблемы при добавлении ещё одной системы:**
- Дублирование логики в разных сервисах
- Сложность выбора платёжной системы
- Сложность миграции подписок между системами
- Нужны разные webhook endpoints для каждой системы

### Рекомендуемая архитектура (Payment Gateway Pattern)

```
server/services/payments/
├── paymentGateway.ts           -- Интерфейс платёжной системы
├── yookassa/
│   ├── yookassaService.ts      -- Реализация YooKassa
│   ├── yookassaWebhook.ts      -- Webhook handler
│   └── yookassaConfig.ts       -- Конфигурация
├── alfabank/
│   ├── alfabankService.ts      -- Реализация Альфа-Банка
│   ├── alfabankWebhook.ts      -- Webhook handler
│   └── alfabankConfig.ts       -- Конфигурация
└── paymentFactory.ts           -- Фабрика для выбора системы
```

### Интерфейс платёжной системы

```typescript
// server/services/payments/paymentGateway.ts
export interface IPaymentGateway {
  // Создание платежа
  createPayment(options: CreatePaymentOptions): Promise<PaymentResult>;
  
  // Получение информации о платеже
  getPayment(paymentId: string): Promise<YookassaPayment | null>;
  
  // Отмена платежа
  cancelPayment(paymentId: string): Promise<boolean>;
  
  // Обработка webhook
  processWebhook(notification: any): Promise<boolean>;
  
  // Создание платежа по сохранённому методу
  createAutoPayment(subscriptionId: string): Promise<PaymentResult>;
  
  // Ежедневная обработка автоплатежей
  processAutoPayments(): Promise<void>;
  
  // Получение доступных подписок
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  
  // Проверка конфигурации
  isReady(): boolean;
}
```

### Фабрика платёжных систем

```typescript
// server/services/payments/paymentFactory.ts
export class PaymentFactory {
  static getGateway(provider: 'yookassa' | 'alfabank'): IPaymentGateway {
    switch (provider) {
      case 'yookassa':
        return new YookassaService();
      case 'alfabank':
        return new AlfabankService();
      default:
        throw new Error(`Unknown payment provider: ${provider}`);
    }
  }
  
  static getDefaultGateway(): IPaymentGateway {
    const provider = process.env.DEFAULT_PAYMENT_PROVIDER || 'yookassa';
    return this.getGateway(provider as any);
  }
}
```

---

## Интеграция новых платёжных шлюзов

### Шаг 1: Создать новый сервис, реализующий IPaymentGateway

```typescript
// server/services/payments/alfabank/alfabankService.ts
import { IPaymentGateway, CreatePaymentOptions, PaymentResult } from '../paymentGateway';

export class AlfabankService implements IPaymentGateway {
  private merchantId: string;
  private apiKey: string;
  private isConfigured: boolean = false;

  constructor() {
    this.merchantId = process.env.ALFABANK_MERCHANT_ID || '';
    this.apiKey = process.env.ALFABANK_API_KEY || '';
    this.isConfigured = !!(this.merchantId && this.apiKey);
  }

  async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
    // Реализация создания платежа для Альфа-Банка
  }

  async processWebhook(notification: any): Promise<boolean> {
    // Реализация обработки webhook
  }

  // ... остальные методы интерфейса
}
```

### Шаг 2: Обновить routes для использования фабрики

```typescript
// server/routes/subscriptions.ts
import { PaymentFactory } from '../services/payments/paymentFactory';

const gateway = PaymentFactory.getDefaultGateway();

router.post('/create-payment', async (req, res) => {
  const result = await gateway.createPayment({
    userId: req.user!.id,
    planId: req.body.planId,
    billingPeriod: req.body.billingPeriod,
    returnUrl: req.body.returnUrl,
  });
  
  res.json(result);
});
```

### Шаг 3: Webhook endpoints

```typescript
// server/routes/webhooks/payments.ts
router.post('/yookassa', async (req, res) => {
  const gateway = PaymentFactory.getGateway('yookassa');
  const success = await gateway.processWebhook(req.body);
  res.json({ success });
});

router.post('/alfabank', async (req, res) => {
  const gateway = PaymentFactory.getGateway('alfabank');
  const success = await gateway.processWebhook(req.body);
  res.json({ success });
});
```

---

## Альфа-Банк: Рекомендации по интеграции

### Архитектурные различия

| Параметр | YooKassa | Альфа-Банк |
|----------|----------|-----------|
| **API стиль** | REST с JSON | REST с XML/JSON |
| **Сохранение карт** | Встроено (`payment_method.save`) | Отдельный API для tokenization |
| **Webhook верификация** | MD5 подпись | HMAC SHA256 |
| **Периодические платежи** | Встроено через `payment_method_id` | Через Recurring Payments API |
| **Возврат платежа** | `/payments/{id}/refunds` | Отдельный эндпоинт |

### Реализация для Альфа-Банка

#### 1. Сохранение карт (Tokenization)

```typescript
// Альфа-Банк требует отдельного шага для сохранения карты
async savePaymentMethod(cardToken: string): Promise<string> {
  // Используется cardToken из формы оплаты
  // Альфа-Банк возвращает permanentToken (аналог payment_method_id)
  const response = await fetch('https://api.alfabank.ru/cardBinding/bind', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${this.apiKey}` },
    body: JSON.stringify({
      clientId: clientId,
      ipAddress: ipAddress,
      cardToken: cardToken
    })
  });
  
  const data = await response.json();
  return data.bindingId; // Сохранить в БД
}
```

#### 2. Создание платежа

```typescript
async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
  const paymentData = {
    currency: 810, // RUB
    orderNumber: `order_${Date.now()}`,
    amount: Math.floor(price * 100), // в копейках
    description: `Подписка ${plan.name}`,
    returnUrl: options.returnUrl,
    failUrl: options.failUrl,
    clientId: userId,
    // Для автоплатежей: указать bindingId
    bindingId: subscription.alfabankPaymentMethodId
  };

  const response = await fetch('https://api.alfabank.ru/payment/rest/register.do', {
    method: 'POST',
    body: new URLSearchParams(paymentData),
    headers: { 'Authorization': `Basic ${credentials}` }
  });

  const data = await response.json();
  return {
    success: data.success,
    paymentUrl: data.redirectUrl,
    paymentId: data.orderId
  };
}
```

#### 3. Webhook обработка

```typescript
async processWebhook(notification: any): Promise<boolean> {
  // Альфа-Банк отправляет notification с параметрами:
  // - orderId (ID платежа)
  // - orderNumber (наш reference)
  // - amount
  // - orderStatus (0=регистрирована, 1=оплачена, 2=отмена)
  
  if (notification.orderStatus === 1) { // Платёж успешен
    await this.activateSubscription(
      notification.clientId,
      notification.planId,
      notification.bindingId // сохранённый способ оплаты
    );
  }
  
  return true;
}
```

#### 4. Автоплатежи

```typescript
async createAutoPayment(subscriptionId: string): Promise<PaymentResult> {
  const sub = await getSubscription(subscriptionId);
  
  // Альфа-Банк: используем сохранённый bindingId
  if (!sub.alfabankPaymentMethodId) {
    return { success: false, error: 'No saved payment method' };
  }

  const paymentData = {
    currency: 810,
    orderNumber: `auto_${Date.now()}`,
    amount: Math.floor(price * 100),
    description: `Автопродление: ${plan.name}`,
    clientId: sub.userId,
    bindingId: sub.alfabankPaymentMethodId,
    // Автоматически завершить платёж без redirect
    language: 'ru'
  };

  const response = await fetch(
    'https://api.alfabank.ru/payment/rest/registerPreAuth.do',
    { method: 'POST', body: new URLSearchParams(paymentData) }
  );

  const data = await response.json();
  return { success: data.success, paymentId: data.orderId };
}
```

### Переменные окружения для Альфа-Банка

```env
# Альфа-Банк
ALFABANK_MERCHANT_ID=your_merchant_id
ALFABANK_API_KEY=your_api_key
ALFABANK_API_PASSWORD=your_password
DEFAULT_PAYMENT_PROVIDER=alfabank # или yookassa
```

### Изменения в БД

```typescript
// Добавить в таблицу subscriptions
export const subscriptions = pgTable("subscriptions", {
  // ... существующие поля
  
  // YooKassa
  yoomoneyPaymentMethodId: varchar("yoomoney_payment_method_id", { length: 255 }),
  
  // Альфа-Банк
  alfabankPaymentMethodId: varchar("alfabank_payment_method_id", { length: 255 }),
  
  // Поле для отслеживания, какую систему использует подписка
  paymentProvider: varchar("payment_provider", { length: 50 }).default("yookassa"),
});
```

### Миграция существующих подписок

```typescript
// При переходе на новую систему:
// 1. Старые платежи остаются с yookassaPaymentMethodId
// 2. Новые пользователи создаются с default провайдером
// 3. Существующие пользователи могут переподключить карту в новую систему

// Фильтр в processAutoPayments():
const dueSubs = await db
  .select()
  .from(subscriptions)
  .where(
    and(
      eq(subscriptions.status, 'active'),
      eq(subscriptions.autoRenewalEnabled, true),
      // Обработать обе системы
      or(
        and(
          eq(subscriptions.paymentProvider, 'yookassa'),
          sql`yoomoney_payment_method_id IS NOT NULL`
        ),
        and(
          eq(subscriptions.paymentProvider, 'alfabank'),
          sql`alfabank_payment_method_id IS NOT NULL`
        )
      )
    )
  );

for (const sub of dueSubs) {
  const gateway = PaymentFactory.getGateway(sub.paymentProvider);
  await gateway.createAutoPayment(sub.id);
}
```

### Конфигурация Webhook endpoints

```typescript
// server/routes/webhooks.ts
router.post('/payments/yookassa', async (req, res) => {
  const gateway = PaymentFactory.getGateway('yookassa');
  await gateway.processWebhook(req.body);
  res.json({ success: true });
});

router.post('/payments/alfabank', async (req, res) => {
  const gateway = PaymentFactory.getGateway('alfabank');
  await gateway.processWebhook(req.body);
  res.json({ success: true });
});
```

Регистрируйте оба URL в админ-панели платёжных систем:
- YooKassa: `https://yourdomain.com/api/webhooks/payments/yookassa`
- Альфа-Банк: `https://yourdomain.com/api/webhooks/payments/alfabank`

---

## Лучшие практики

1. **Все платёжные операции логировать** → помощь при отладке
2. **Добавить retry логику** → для нестабильных сетей
3. **Шифровать payment_method_ids** → как и tokens (AES-256-GCM)
4. **Изолировать webhook обработку** → отдельные эндпоинты для каждой системы
5. **Версионировать API** → /api/v1/webhooks/payments/...
6. **Использовать Secrets** → для хранения API ключей (не в `.env`)

