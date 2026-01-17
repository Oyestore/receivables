export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CommunicationType = 'campaign' | 'transactional' | 'reminder' | 'promotional';
export type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'push';
export type LeadTier = 'hot' | 'warm' | 'cold' | 'inactive';

export interface ICampaign {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  campaign_type: string;
  target_segment_id?: string;
  start_date: Date;
  end_date?: Date;
  budget?: number;
  message_template: string;
  status: CampaignStatus;
  launched_at?: Date;
  launched_by?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ICustomerSegment {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  criteria: any;
  customer_ids: string[];
  customer_count: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ILeadScore {
  id: string;
  tenant_id: string;
  customer_id: string;
  score: number;
  tier: LeadTier;
  scoring_factors: any;
  created_at: Date;
  updated_at: Date;
}

export interface ICommunication {
  id: string;
  tenant_id: string;
  campaign_id?: string;
  customer_id: string;
  communication_type: CommunicationType;
  subject?: string;
  message: string;
  channel: CommunicationChannel;
  status: string;
  sent_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  sent_by?: string;
  created_at: Date;
}

export interface ICustomerEngagement {
  id: string;
  tenant_id: string;
  customer_id: string;
  engagement_type: string;
  engagement_score: number;
  last_interaction_date: Date;
  interaction_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface IReferralProgram {
  id: string;
  tenant_id: string;
  program_name: string;
  reward_type: string;
  reward_amount: number;
  is_active: boolean;
  created_at: Date;
}

export interface IReferral {
  id: string;
  tenant_id: string;
  program_id: string;
  referrer_customer_id: string;
  referred_customer_id: string;
  status: string;
  reward_claimed: boolean;
  created_at: Date;
}
