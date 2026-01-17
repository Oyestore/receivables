import { z } from 'zod';

export const createInvoiceSchema = z.object({
  body: z.object({
    customer_id: z.string().uuid('Invalid customer ID'),
    invoice_number: z.string().optional(),
    issue_date: z.string().datetime().or(z.date()),
    due_date: z.string().datetime().or(z.date()),
    line_items: z.array(z.object({
      description: z.string().min(1, 'Description is required'),
      quantity: z.number().positive('Quantity must be positive'),
      unit_price: z.number().nonnegative('Unit price must be non-negative'),
      tax_rate: z.number().min(0).max(1).optional(),
    })).min(1, 'At least one line item is required'),
    notes: z.string().optional(),
    payment_terms: z.string().optional(),
  }),
});

export const updateInvoiceSchema = z.object({
  params: z.object({
    invoiceId: z.string().uuid('Invalid invoice ID'),
  }),
  body: z.object({
    due_date: z.string().datetime().or(z.date()).optional(),
    notes: z.string().optional(),
    payment_terms: z.string().optional(),
    status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  }),
});

export const listInvoicesSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
    customer_id: z.string().uuid().optional(),
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
  }),
});

export const getInvoiceSchema = z.object({
  params: z.object({
    invoiceId: z.string().uuid('Invalid invoice ID'),
  }),
});

export const sendInvoiceSchema = z.object({
  params: z.object({
    invoiceId: z.string().uuid('Invalid invoice ID'),
  }),
  body: z.object({
    recipient_email: z.string().email('Invalid email address').optional(),
    message: z.string().optional(),
  }),
});
