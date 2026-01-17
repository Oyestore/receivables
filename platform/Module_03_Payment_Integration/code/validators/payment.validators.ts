import { z } from 'zod';

export const processPaymentSchema = z.object({
  body: z.object({
    invoice_id: z.string().uuid('Invalid invoice ID'),
    amount: z.number().positive('Amount must be positive'),
    payment_method: z.enum(['credit_card', 'debit_card', 'bank_transfer', 'upi', 'wallet']),
    gateway: z.enum(['stripe', 'razorpay', 'paypal']),
    payment_details: z.object({
      card_number: z.string().optional(),
      card_holder_name: z.string().optional(),
      expiry_month: z.number().min(1).max(12).optional(),
      expiry_year: z.number().min(2024).optional(),
      cvv: z.string().optional(),
      upi_id: z.string().optional(),
      bank_account: z.string().optional(),
    }).optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const getPaymentSchema = z.object({
  params: z.object({
    paymentId: z.string().uuid('Invalid payment ID'),
  }),
});

export const listPaymentsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']).optional(),
    invoice_id: z.string().uuid().optional(),
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
  }),
});

export const refundPaymentSchema = z.object({
  params: z.object({
    paymentId: z.string().uuid('Invalid payment ID'),
  }),
  body: z.object({
    amount: z.number().positive('Refund amount must be positive').optional(),
    reason: z.string().min(1, 'Refund reason is required'),
  }),
});

export const reconcilePaymentSchema = z.object({
  params: z.object({
    paymentId: z.string().uuid('Invalid payment ID'),
  }),
  body: z.object({
    gateway_transaction_id: z.string().min(1, 'Gateway transaction ID is required'),
    reconciliation_status: z.enum(['matched', 'mismatched', 'pending']),
    notes: z.string().optional(),
  }),
});
