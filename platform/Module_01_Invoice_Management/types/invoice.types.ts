export interface IInvoice {
  id: string;
  tenant_id: string;
  customer_id: string;
  template_id?: string;
  invoice_number: string;
  invoice_type: string;
  status: string;
  issue_date: Date;
  due_date: Date;
  payment_terms: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  notes?: string;
  line_items?: IInvoiceLineItem[];
  created_at: Date;
  updated_at: Date;
}

export interface IInvoiceLineItem {
  id?: string;
  invoice_id?: string;
  line_number?: number;
  item_type?: string;
  item_code?: string;
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  discount_amount?: number;
  subtotal?: number;
  total_amount?: number;
}

export interface ICreateInvoiceRequest {
  customer_id: string;
  template_id?: string;
  invoice_type?: string;
  issue_date: Date;
  due_date: Date;
  payment_terms?: number;
  currency?: string;
  notes?: string;
  line_items: IInvoiceLineItem[];
}

export interface IUpdateInvoiceRequest {
  status?: string;
  notes?: string;
  line_items?: IInvoiceLineItem[];
}

export interface IInvoiceFilters {
  status?: string;
  customer_id?: string;
  from_date?: Date;
  to_date?: Date;
  limit?: number;
  offset?: number;
}
