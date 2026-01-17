// import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity'; // Keep comment but disable logic if possible, or just use any.
// Actually checking line 101 usage


export interface PaymentGatewayConfig {
  apiKey?: string;
  apiSecret?: string;
  merchantId?: string;
  accessToken?: string;
  webhookSecret?: string;
  isSandbox: boolean;
  region?: string;
  [key: string]: any;
}

export interface PaymentInitiateRequest {
  amount: number;
  currency: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
  callbackUrl?: string;
  expiresAt?: Date;
}

export interface PaymentInitiateResponse {
  success: boolean;
  transactionId?: string;
  gatewayTransactionId?: string;
  paymentUrl?: string;
  paymentToken?: string;
  qrCode?: string;
  expiresAt?: Date;
  error?: string;
  errorCode?: string;
  metadata?: Record<string, any>;
}

export interface PaymentVerifyRequest {
  transactionId: string;
  gatewayTransactionId?: string;
  paymentToken?: string;
  metadata?: Record<string, any>;
}

export interface PaymentVerifyResponse {
  success: boolean;
  transactionId?: string;
  gatewayTransactionId?: string;
  status: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  paymentMethodDetails?: Record<string, any>;
  error?: string;
  errorCode?: string;
  metadata?: Record<string, any>;
}

export interface PaymentRefundRequest {
  transactionId: string;
  gatewayTransactionId?: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface PaymentRefundResponse {
  success: boolean;
  refundId?: string;
  gatewayRefundId?: string;
  status: string;
  amount?: number;
  error?: string;
  errorCode?: string;
  metadata?: Record<string, any>;
}

export interface WebhookPayload {
  event: string;
  gatewayTransactionId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface PaymentGatewayService {
  initialize(config: PaymentGatewayConfig): Promise<boolean>;

  initiatePayment(request: PaymentInitiateRequest): Promise<PaymentInitiateResponse>;

  verifyPayment(request: PaymentVerifyRequest): Promise<PaymentVerifyResponse>;

  processRefund(request: PaymentRefundRequest): Promise<PaymentRefundResponse>;

  processWebhook(payload: WebhookPayload): Promise<any | null>;

  checkHealth(): Promise<boolean>;

  getGatewayName(): string;

  getSupportedPaymentMethods(): string[];

  getSupportedCurrencies(): string[];

  getTransactionFees(amount: number, currency: string, paymentMethod: string): { percentage: number; fixed: number };
}
