/**
 * Payment Orchestration Interfaces
 * Shared interfaces for payment processing and orchestration
 */

import { PaymentGateway, PaymentMethod, PaymentStatus, TransactionType, RoutingStrategy, RiskLevel } from '../enums/payment-orchestration.enum';

export interface PaymentOrchestrationInterface {
    id: string;
    tenantId: string;
    status: string;
}

export interface GatewayConfigurationInterface {
    id: string;
    tenantId: string;
    gateway: PaymentGateway;
    isActive: boolean;
    priority: number;
    configuration: Record<string, any>;
    supportedMethods: PaymentMethod[];
    supportedCurrencies: string[];
}

export interface TransactionInterface {
    id: string;
    tenantId: string;
    customerId: string;
    invoiceId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    gateway: PaymentGateway;
    status: PaymentStatus;
    transactionType: TransactionType;
}

export interface RoutingRuleInterface {
    id: string;
    tenantId: string;
    name: string;
    strategy: RoutingStrategy;
    isActive: boolean;
    priority: number;
}

export interface RiskAssessmentInterface {
    id: string;
    transactionId: string;
    tenantId: string;
    customerId: string;
    riskLevel: RiskLevel;
    riskScore: number;
}

export interface ComplianceCheckInterface {
    id: string;
    transactionId: string;
    standardsChecked: string[];
    isCompliant: boolean;
}

export interface PerformanceMetricsInterface {
    id: string;
    tenantId: string;
    gateway: PaymentGateway;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    successRate: number;
}
