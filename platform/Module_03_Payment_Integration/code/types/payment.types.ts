export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export type PaymentMethod = 'card' | 'bank_transfer' | 'upi' | 'wallet' | 'cash' | 'cheque';

export interface IPayment {
  id: string;
  tenant_id: string;
  customer_id: string;
  invoice_id: string;
  gateway_id: string;
  payment_number: string;
  payment_method: PaymentMethod;
  payment_type: string;
  amount: number;
  currency: string;
  fee_amount: number;
  net_amount: number;
  status: PaymentStatus;
  payment_date: Date;
  gateway_transaction_id?: string;
  gateway_response?: any;
  created_at: Date;
  updated_at: Date;
}

export interface IPaymentGateway {
  id: string;
  tenant_id: string;
  provider: string;
  name: string;
  api_key: string;
  api_secret: string;
  webhook_secret?: string;
  fee_type: 'percentage' | 'fixed';
  fee_value: number;
  is_active: boolean;
  configuration: any;
}

export interface ICreatePaymentRequest {
  invoice_id: string;
  gateway_id: string;
  payment_method: PaymentMethod;
  payment_type?: string;
  amount: number;
  currency?: string;
  payment_date?: Date;
  payment_token?: string;
  metadata?: any;
}

export interface IPaymentFilters {
  status?: PaymentStatus;
  invoice_id?: string;
  customer_id?: string;
  payment_method?: PaymentMethod;
  from_date?: Date;
  to_date?: Date;
  limit?: number;
  offset?: number;
}

export interface IRefund {
  id: string;
  payment_id: string;
  amount: number;
  reason: string;
  gateway_refund_id: string;
  status: string;
  processed_by: string;
  created_at: Date;
}
