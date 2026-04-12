
export interface SMSResult {
  success: boolean;
  message?: string;
  messageId?: string;
}

export interface SMSBalance {
  success: boolean;
  balance?: number;
  error?: string;
}

export class SMSService {
  private readonly SMS_RU_API_KEY: string;
  private readonly SMS_RU_API_URL = 'https://sms.ru/sms/send';
  private readonly SMS_RU_BALANCE_URL = 'https://sms.ru/my/balance';

  constructor() {
    this.SMS_RU_API_KEY = process.env.SMS_RU_API_KEY || '';
    
    if (!this.SMS_RU_API_KEY) {
      console.warn('⚠️ SMS_RU_API_KEY not configured. SMS sending will be in test mode.');
    }
  }

  /**
   * Отправка SMS с кодом верификации
   */
  async sendVerificationCode(phone: string, code: string): Promise<SMSResult> {
    try {
      // Форматируем номер телефона (убираем +, пробелы и дефисы)
      const formattedPhone = phone.replace(/[\s\-\+]/g, '');
      
      const message = `Ваш код подтверждения FinTrack: ${code}. Действителен 5 минут.`;

      // Если API ключ не настроен - режим разработки
      if (!this.SMS_RU_API_KEY) {
        console.log(`📱 [TEST MODE] SMS to ${formattedPhone}: ${message}`);
        return {
          success: true,
          message: 'SMS отправлен (тестовый режим)',
          messageId: 'test_' + Date.now()
        };
      }

      // Отправка через SMS.RU API
      const response = await fetch(this.SMS_RU_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          api_id: this.SMS_RU_API_KEY,
          to: formattedPhone,
          msg: message,
          json: '1'
        })
      });

      const result = await response.json();

      if (result.status === 'OK') {
        return {
          success: true,
          message: 'SMS успешно отправлен',
          messageId: result.sms?.[formattedPhone]?.sms_id
        };
      } else {
        console.error('SMS.RU error:', result);
        return {
          success: false,
          message: result.status_text || 'Ошибка отправки SMS'
        };
      }

    } catch (error) {
      console.error('SMS Service Error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Ошибка сервиса SMS'
      };
    }
  }

  /**
   * Отправка произвольного SMS сообщения
   */
  async sendSMS(phone: string, message: string): Promise<SMSResult> {
    try {
      const formattedPhone = phone.replace(/[\s\-\+]/g, '');

      if (!this.SMS_RU_API_KEY) {
        console.log(`📱 [TEST MODE] SMS to ${formattedPhone}: ${message}`);
        return {
          success: true,
          message: 'SMS отправлен (тестовый режим)',
          messageId: 'test_' + Date.now()
        };
      }

      const response = await fetch(this.SMS_RU_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          api_id: this.SMS_RU_API_KEY,
          to: formattedPhone,
          msg: message,
          json: '1'
        })
      });

      const result = await response.json();

      if (result.status === 'OK') {
        return {
          success: true,
          message: 'SMS успешно отправлен',
          messageId: result.sms?.[formattedPhone]?.sms_id
        };
      } else {
        console.error('SMS.RU error:', result);
        return {
          success: false,
          message: result.status_text || 'Ошибка отправки SMS'
        };
      }

    } catch (error) {
      console.error('SMS Service Error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Ошибка сервиса SMS'
      };
    }
  }

  /**
   * Проверка баланса SMS.RU
   */
  async checkBalance(): Promise<SMSBalance> {
    try {
      if (!this.SMS_RU_API_KEY) {
        return {
          success: false,
          error: 'SMS_RU_API_KEY не настроен'
        };
      }

      const response = await fetch(this.SMS_RU_BALANCE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          api_id: this.SMS_RU_API_KEY,
          json: '1'
        })
      });

      const result = await response.json();

      if (result.status === 'OK') {
        return {
          success: true,
          balance: parseFloat(result.balance)
        };
      } else {
        return {
          success: false,
          error: result.status_text || 'Ошибка проверки баланса'
        };
      }

    } catch (error) {
      console.error('Balance check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Отправка SMS с кодом сброса пароля
   */
  async sendPasswordResetCode(phone: string, code: string): Promise<SMSResult> {
    const formattedPhone = phone.replace(/[\s\-\+]/g, '');
    const message = `Ваш код для сброса пароля My EPA: ${code}. Действителен 5 минут. Не сообщайте код никому.`;

    if (!this.SMS_RU_API_KEY) {
      console.log(`📱 [TEST MODE] Password reset SMS to ${formattedPhone}: ${message}`);
      return { success: true, message: 'SMS отправлен (тестовый режим)', messageId: 'test_' + Date.now() };
    }

    try {
      const response = await fetch(this.SMS_RU_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          api_id: this.SMS_RU_API_KEY,
          to: formattedPhone,
          msg: message,
          json: '1',
        }),
      });
      const result: any = await response.json();
      console.log('📱 SMS.RU password reset response:', JSON.stringify(result));
      if (result.status === 'OK') {
        const smsStatus = result.sms?.[formattedPhone];
        if (smsStatus?.status === 'OK') {
          return { success: true, message: 'SMS отправлен', messageId: smsStatus.sms_id };
        }
        const errText = smsStatus?.status_text || 'Ошибка доставки SMS';
        console.error(`📱 SMS delivery failed for ${formattedPhone}: [${smsStatus?.status_code}] ${errText}`);
        return { success: false, message: errText };
      }
      return { success: false, message: result.status_text || 'Ошибка отправки SMS' };
    } catch (error) {
      console.error('SMS password reset error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Ошибка SMS сервиса' };
    }
  }

  /**
   * Тестирование SMS сервиса
   */
  async testService(): Promise<{ success: boolean; error?: string }> {
    try {
      const balance = await this.checkBalance();
      return balance;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка тестирования'
      };
    }
  }
}

export const smsService = new SMSService();
