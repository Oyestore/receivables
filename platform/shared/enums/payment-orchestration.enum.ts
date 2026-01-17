/**
 * Payment Orchestration Enums
 * Shared enumerations for payment processing, gateway management, and orchestration
 */

export enum PaymentGateway {
    RAZORPAY = 'RAZORPAY',
    PAYU = 'PAYU',
    PHONEPE = 'PHONEPE',
    GOOGLE_PAY = 'GOOGLE_PAY',
    PAYTM = 'PAYTM',
    CASHFREE = 'CASHFREE',
    INSTAMOJO = 'INSTAMOJO'
}

export enum PaymentMethod {
    CREDIT_CARD = 'CREDIT_CARD',
    DEBIT_CARD = 'DEBIT_CARD',
    UPI = 'UPI',
    NET_BANKING = 'NET_BANKING',
    WALLET = 'WALLET',
    EMI = 'EMI',
    CASH = 'CASH',
    BANK_TRANSFER = 'BANK_TRANSFER',
    BNPL = 'BNPL'
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
    REFUNDED = 'REFUNDED',
    PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
    BLOCKED = 'BLOCKED'
}

export enum TransactionType {
    PAYMENT = 'PAYMENT',
    REFUND = 'REFUND',
    CHARGEBACK = 'CHARGEBACK',
    SETTLEMENT = 'SETTLEMENT'
}

export enum RoutingStrategy {
    COST_OPTIMIZATION = 'COST_OPTIMIZATION',
    SUCCESS_RATE = 'SUCCESS_RATE',
    LOAD_BALANCING = 'LOAD_BALANCING',
    FAILOVER = 'FAILOVER',
    GEOGRAPHIC = 'GEOGRAPHIC',
    CUSTOM = 'CUSTOM'
}

export enum RiskLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export enum ComplianceStandard {
    PCI_DSS = 'PCI_DSS',
    GDPR = 'GDPR',
    RBI_GUIDELINES = 'RBI_GUIDELINES',
    ISO_27001 = 'ISO_27001'
}

export enum MonitoringMetric {
    SUCCESS_RATE = 'SUCCESS_RATE',
    RESPONSE_TIME = 'RESPONSE_TIME',
    ERROR_RATE = 'ERROR_RATE',
    THROUGHPUT = 'THROUGHPUT',
    UPTIME = 'UPTIME'
}
