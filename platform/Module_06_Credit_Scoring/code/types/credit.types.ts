export type CreditRiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown';

export interface ICreditProfile {
  id: string;
  tenant_id: string;
  customer_id: string;
  current_score: number;
  risk_level: CreditRiskLevel;
  credit_limit?: number;
  available_credit?: number;
  last_assessed_at?: Date;
  external_credit_data?: any;
  score_history?: ICreditScore[];
  created_at: Date;
  updated_at: Date;
}

export interface ICreditScore {
  id: string;
  tenant_id: string;
  customer_id: string;
  profile_id: string;
  model_version: string;
  score: number;
  risk_level: CreditRiskLevel;
  confidence_score: number;
  factors: any;
  calculated_by: string;
  created_at: Date;
}

export interface ICreditScoreRequest {
  customer_id: string;
  include_external_data?: boolean;
  model_version?: string;
}

export interface IRiskAlert {
  id: string;
  tenant_id: string;
  customer_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by?: string;
  acknowledged_at?: Date;
  resolved_at?: Date;
  notes?: string;
  created_at: Date;
}

export interface ICreditAssessment {
  customer_id: string;
  score: number;
  risk_level: CreditRiskLevel;
  recommendation: string;
  factors: {
    payment_history: number;
    invoice_history: number;
    credit_utilization: number;
    business_age: number;
    industry_risk: number;
  };
}
