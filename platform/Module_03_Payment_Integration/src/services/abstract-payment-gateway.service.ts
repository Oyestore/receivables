import { Logger } from '@nestjs/common';
import {
  PaymentGatewayConfig,
  PaymentGatewayService,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaymentRefundRequest,
  PaymentRefundResponse,
  PaymentVerifyRequest,
  PaymentVerifyResponse,
  WebhookPayload,
} from '../interfaces/payment-gateway.interface';
import { PaymentTransaction } from '../entities/payment-transaction.entity';

export abstract class AbstractPaymentGatewayService implements PaymentGatewayService {
  protected config: PaymentGatewayConfig;
  protected logger: Logger;
  protected isInitialized = false;

  constructor(protected readonly gatewayName: string) {
    this.logger = new Logger(`${gatewayName}PaymentGateway`);
  }

  async initialize(config: PaymentGatewayConfig): Promise<boolean> {
    try {
      this.config = config;
      this.validateConfig();
      await this.initializeGateway();
      this.isInitialized = true;
      this.logger.log(`${this.gatewayName} payment gateway initialized successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize ${this.gatewayName} payment gateway: ${error.message}`, error.stack);
      return false;
    }
  }

  protected abstract validateConfig(): void;

  protected abstract initializeGateway(): Promise<void>;

  abstract initiatePayment(request: PaymentInitiateRequest): Promise<PaymentInitiateResponse>;

  abstract verifyPayment(request: PaymentVerifyRequest): Promise<PaymentVerifyResponse>;

  abstract processRefund(request: PaymentRefundRequest): Promise<PaymentRefundResponse>;

  abstract processWebhook(payload: WebhookPayload): Promise<PaymentTransaction | null>;

  async checkHealth(): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn(`${this.gatewayName} payment gateway is not initialized`);
      return false;
    }

    try {
      return await this.checkGatewayHealth();
    } catch (error) {
      this.logger.error(`Health check failed for ${this.gatewayName} payment gateway: ${error.message}`, error.stack);
      return false;
    }
  }

  protected abstract checkGatewayHealth(): Promise<boolean>;

  getGatewayName(): string {
    return this.gatewayName;
  }

  abstract getSupportedPaymentMethods(): string[];

  abstract getSupportedCurrencies(): string[];

  abstract getTransactionFees(amount: number, currency: string, paymentMethod: string): { percentage: number; fixed: number };

  protected handleError(error: any, operation: string): never {
    const errorMessage = error.message || 'Unknown error';
    const errorCode = error.code || 'UNKNOWN_ERROR';
    
    this.logger.error(`${this.gatewayName} ${operation} failed: ${errorMessage}`, error.stack);
    
    throw {
      message: `${this.gatewayName} ${operation} failed: ${errorMessage}`,
      code: errorCode,
      originalError: error,
    };
  }
}
