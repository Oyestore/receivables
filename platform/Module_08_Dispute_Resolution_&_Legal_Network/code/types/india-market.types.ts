export type GSTReturnType = 'GSTR1' | 'GSTR3B' | 'GSTR9';
export type GSTReturnStatus = 'draft' | 'filed' | 'accepted' | 'rejected';
export type MSMECaseStatus = 'registered' | 'under_review' | 'resolved' | 'rejected' | 'withdrawn';
export type EInvoiceStatus = 'generated' | 'cancelled' | 'expired';

export interface IGSTInvoice {
  id: string;
  tenant_id: string;
  invoice_id: string;
  gstin: string;
  place_of_supply: string;
  reverse_charge: boolean;
  invoice_type: string;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  total_tax_amount: number;
  irn?: string;
  ack_no?: string;
  ack_date?: Date;
  qr_code?: string;
  e_invoice_status?: EInvoiceStatus;
  created_at: Date;
  updated_at: Date;
}

export interface IEInvoice {
  id: string;
  tenant_id: string;
  gst_invoice_id: string;
  irn: string;
  ack_no: string;
  ack_date: Date;
  qr_code: string;
  status: EInvoiceStatus;
  cancelled_at?: Date;
  cancellation_reason?: string;
  created_at: Date;
}

export interface IGSTReturn {
  id: string;
  tenant_id: string;
  return_period: string;
  return_type: GSTReturnType;
  gstin: string;
  total_taxable_value: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_cess: number;
  total_tax: number;
  status: GSTReturnStatus;
  filed_at?: Date;
  arn?: string; // Application Reference Number
  created_at: Date;
  updated_at: Date;
}

export interface IMSMESamadhaan {
  id: string;
  tenant_id: string;
  reference_number: string;
  invoice_ids: string[];
  buyer_name: string;
  buyer_gstin: string;
  total_amount: number;
  delay_days: number;
  description: string;
  status: MSMECaseStatus;
  resolution_date?: Date;
  resolution_details?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ITDSCertificate {
  id: string;
  tenant_id: string;
  invoice_id: string;
  tds_rate: number;
  tds_amount: number;
  certificate_number: string;
  certificate_date: Date;
  deductor_tan: string;
  created_at: Date;
}

export interface IUdyamRegistration {
  id: string;
  tenant_id: string;
  udyam_number: string;
  business_name: string;
  business_type: string;
  registration_date: Date;
  is_verified: boolean;
  created_at: Date;
}
