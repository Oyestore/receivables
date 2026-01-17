export interface IPartner {
    id: string;
    partnerCode: string;
    partnerName: string;
    partnerType: 'reseller' | 'referral' | 'integration' | 'affiliate';
    contactEmail: string;
    contactPhone?: string;
    contactPerson?: string;
    companyDetails?: any;
    status: 'pending' | 'active' | 'suspended' | 'terminated';
    onboardedAt?: Date;
    createdAt: Date;
}

export interface IPartnerContract {
    id: string;
    partnerId: string;
    contractNumber: string;
    contractType: 'reseller' | 'referral' | 'revenue_share' | 'affiliate';
    commissionRate?: number;
    revenueShareRate?: number;
    flatFeePerReferral?: number;
    minimumCommitment: number;
    contractStart: Date;
    contractEnd?: Date;
    terms?: any;
    paymentTerms: 'net-15' | 'net-30' | 'net-45' | 'net-60';
    status: 'draft' | 'active' | 'expired' | 'terminated';
}

export interface IPartnerReferral {
    id: string;
    partnerId: string;
    referralCode: string;
    referredTenantId?: string;
    referredEmail: string;
    referredCompany?: string;
    referralDate: Date;
    conversionDate?: Date;
    firstPaymentDate?: Date;
    firstPaymentAmount?: number;
    status: 'pending' | 'contacted' | 'qualified' | 'converted' | 'paid' | 'cancelled';
    rejectionReason?: string;
    metadata?: any;
}

export interface IPartnerCommission {
    id: string;
    partnerId: string;
    contractId: string;
    referralId?: string;
    tenantId?: string;
    commissionType: 'referral' | 'revenue_share' | 'flat_fee' | 'recurring';
    baseAmount: number;
    commissionRate?: number;
    commissionAmount: number;
    currency: string;
    periodStart?: Date;
    periodEnd?: Date;
    commissionDate: Date;
    payoutDate?: Date;
    payoutStatus: 'pending' | 'approved' | 'processing' | 'paid' | 'failed' | 'cancelled';
    payoutReference?: string;
}

export interface IPartnerPayout {
    id: string;
    partnerId: string;
    payoutBatchNumber: string;
    totalAmount: number;
    currency: string;
    commissionCount: number;
    periodStart: Date;
    periodEnd: Date;
    payoutMethod?: 'bank_transfer' | 'paypal' | 'stripe' | 'check' | 'wire';
    payoutDetails?: any;
    status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled';
    initiatedAt: Date;
    completedAt?: Date;
    failureReason?: string;
}

export interface IPartnerPerformance {
    partnerId: string;
    metricDate: Date;
    referralsCount: number;
    conversionsCount: number;
    conversionRate: number;
    totalRevenue: number;
    totalCommissions: number;
    activeCustomers: number;
    churnedCustomers: number;
    averageCustomerValue: number;
}
