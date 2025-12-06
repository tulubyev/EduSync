import type { IPaymentGateway, PaymentProvider } from './paymentGateway';
import { yookassaService } from '../yookassaService';

let alfabankServiceInstance: IPaymentGateway | null = null;

export class PaymentFactory {
  private static gateways: Map<PaymentProvider, IPaymentGateway> = new Map();

  static registerGateway(provider: PaymentProvider, gateway: IPaymentGateway): void {
    this.gateways.set(provider, gateway);
  }

  static getGateway(provider: PaymentProvider): IPaymentGateway {
    if (provider === 'yookassa') {
      return yookassaService;
    }

    if (provider === 'alfabank') {
      if (!alfabankServiceInstance) {
        const { alfabankService } = require('./alfabankService');
        alfabankServiceInstance = alfabankService;
      }
      return alfabankServiceInstance!;
    }

    const gateway = this.gateways.get(provider);
    if (!gateway) {
      throw new Error(`Unknown payment provider: ${provider}`);
    }
    return gateway;
  }

  static getDefaultGateway(): IPaymentGateway {
    const provider = (process.env.DEFAULT_PAYMENT_PROVIDER || 'yookassa') as PaymentProvider;
    return this.getGateway(provider);
  }

  static getAllGateways(): IPaymentGateway[] {
    const gateways: IPaymentGateway[] = [yookassaService];
    
    try {
      if (!alfabankServiceInstance) {
        const { alfabankService } = require('./alfabankService');
        alfabankServiceInstance = alfabankService;
      }
      if (alfabankServiceInstance) {
        gateways.push(alfabankServiceInstance);
      }
    } catch (e) {
    }
    
    return gateways;
  }

  static getReadyGateways(): IPaymentGateway[] {
    return this.getAllGateways().filter(g => g.isReady());
  }
}
