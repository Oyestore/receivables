import { z } from 'zod';

export const assessCreditSchema = z.object({
  body: z.object({
    customer_id: z.string().uuid('Invalid customer ID'),
    assessment_type: z.enum(['initial', 'periodic', 'transaction_based']),
    transaction_amount: z.number().positive().optional(),
    financial_data: z.object({
      annual_revenue: z.number().nonnegative().optional(),
      monthly_revenue: z.number().nonnegative().optional(),
      outstanding_debt: z.number().nonnegative().optional(),
      credit_utilization: z.number().min(0).max(1).optional(),
      payment_history_score: z.number().min(0).max(100).optional(),
    }).optional(),
  }),
});

export const getCreditScoreSchema = z.object({
  params: z.object({
    customerId: z.string().uuid('Invalid customer ID'),
  }),
});

export const listCreditAssessmentsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    customer_id: z.string().uuid().optional(),
    risk_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
  }),
});

export const updateCreditLimitSchema = z.object({
  params: z.object({
    customerId: z.string().uuid('Invalid customer ID'),
  }),
  body: z.object({
    credit_limit: z.number().positive('Credit limit must be positive'),
    reason: z.string().min(1, 'Reason is required'),
  }),
});

export const getRiskAlertsSchema = z.object({
  query: z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
    customer_id: z.string().uuid().optional(),
  }),
});
