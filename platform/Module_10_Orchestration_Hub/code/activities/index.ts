/**
 * Workflow Activities
 * 
 * Reusable activity functions that can be called from Temporal workflows
 * Each activity represents an atomic operation that can be retried independently
 */

import { Context } from '@temporalio/activity';
import axios, { AxiosInstance } from 'axios';
import { ModuleName } from '../types/orchestration.types';

// ============================================================================
// Activity Context and Configuration
// ============================================================================

interface ActivityContext {
    tenantId: string;
    userId: string;
    correlationId: string;
}

const axiosInstances: Map<ModuleName, AxiosInstance> = new Map();

/**
 * Get or create axios instance for a module
 */
function getModuleClient(module: ModuleName): AxiosInstance {
    if (!axiosInstances.has(module)) {
        const baseURL = getModuleBaseUrl(module);
        const instance = axios.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add interceptors for logging and error handling
        instance.interceptors.response.use(
            response => response,
            error => {
                Context.current().log.error('Module API error', {
                    module,
                    error: error.message,
                    status: error.response?.status,
                });
                throw error;
            }
        );

        axiosInstances.set(module, instance);
    }

    return axiosInstances.get(module)!;
}

/**
 * Get module base URL from environment
 */
function getModuleBaseUrl(module: ModuleName): string {
    const urlMap: Record<ModuleName, string> = {
        [ModuleName.INVOICE_MANAGEMENT]: process.env.MODULE_01_URL || 'http://localhost:3001',
        [ModuleName.CUSTOMER_COMMUNICATION]: process.env.MODULE_02_URL || 'http://localhost:3002',
        [ModuleName.PAYMENT_INTEGRATION]: process.env.MODULE_03_URL || 'http://localhost:3003',
        [ModuleName.ANALYTICS_REPORTING]: process.env.MODULE_04_URL || 'http://localhost:3004',
        [ModuleName.MILESTONE_WORKFLOWS]: process.env.MODULE_05_URL || 'http://localhost:3005',
        [ModuleName.CREDIT_SCORING]: process.env.MODULE_06_URL || 'http://localhost:3006',
        [ModuleName.FINANCING_FACTORING]: process.env.MODULE_07_URL || 'http://localhost:3007',
        [ModuleName.DISPUTE_RESOLUTION]: process.env.MODULE_08_URL || 'http://localhost:3008',
        [ModuleName.MARKETING_CUSTOMER_SUCCESS]: process.env.MODULE_09_URL || 'http://localhost:3009',
    };

    return urlMap[module];
}

// ============================================================================
// Invoice Management Activities (Module 01)
// ============================================================================

export async function getInvoiceDetails(context: ActivityContext, invoiceId: string): Promise<any> {
    Context.current().log.info('Getting invoice details', { invoiceId, tenantId: context.tenantId });

    const client = getModuleClient(ModuleName.INVOICE_MANAGEMENT);
    const response = await client.get(`/api/invoices/${invoiceId}`, {
        headers: { 'X-Tenant-ID': context.tenantId },
    });

    return response.data;
}

export async function getOverdueInvoices(context: ActivityContext): Promise<any[]> {
    Context.current().log.info('Getting overdue invoices', { tenantId: context.tenantId });

    const client = getModuleClient(ModuleName.INVOICE_MANAGEMENT);
    const response = await client.get('/api/invoices/overdue', {
        headers: { 'X-Tenant-ID': context.tenantId },
    });

    return response.data;
}

export async function updateInvoiceStatus(
    context: ActivityContext,
    invoiceId: string,
    status: string
): Promise<void> {
    Context.current().log.info('Updating invoice status', { invoiceId, status });

    const client = getModuleClient(ModuleName.INVOICE_MANAGEMENT);
    await client.patch(
        `/api/invoices/${invoiceId}/status`,
        { status },
        { headers: { 'X-Tenant-ID': context.tenantId } }
    );
}

// ============================================================================
// Customer Communication Activities (Module 02)
// ============================================================================

export async function sendEmailNotification(
    context: ActivityContext,
    params: {
        to: string;
        subject: string;
        template: string;
        data: Record<string, any>;
    }
): Promise<void> {
    Context.current().log.info('Sending email notification', {
        to: params.to,
        template: params.template,
    });

    const client = getModuleClient(ModuleName.CUSTOMER_COMMUNICATION);
    await client.post(
        '/api/communications/email',
        params,
        { headers: { 'X-Tenant-ID': context.tenantId } }
    );
}

export async function sendSMSNotification(
    context: ActivityContext,
    params: {
        phoneNumber: string;
        message: string;
    }
): Promise<void> {
    Context.current().log.info('Sending SMS notification', { phoneNumber: params.phoneNumber });

    const client = getModuleClient(ModuleName.CUSTOMER_COMMUNICATION);
    await client.post(
        '/api/communications/sms',
        params,
        { headers: { 'X-Tenant-ID': context.tenantId } }
    );
}

export async function sendWhatsAppMessage(
    context: ActivityContext,
    params: {
        phoneNumber: string;
        template: string;
        parameters: Record<string, any>;
    }
): Promise<void> {
    Context.current().log.info('Sending WhatsApp message', {
        phoneNumber: params.phoneNumber,
        template: params.template,
    });

    const client = getModuleClient(ModuleName.CUSTOMER_COMMUNICATION);
    await client.post(
        '/api/communications/whatsapp',
        params,
        { headers: { 'X-Tenant-ID': context.tenantId } }
    );
}

// ============================================================================
// Payment Processing Activities (Module 03)
// ============================================================================

export async function initiatePaymentReminder(
    context: ActivityContext,
    params: {
        invoiceId: string;
        customerId: string;
        amount: number;
        dueDate: Date;
    }
): Promise<void> {
    Context.current().log.info('Initiating payment reminder', { invoiceId: params.invoiceId });

    const client = getModuleClient(ModuleName.PAYMENT_INTEGRATION);
    await client.post(
        '/api/payments/reminders',
        params,
        { headers: { 'X-Tenant-ID': context.tenantId } }
    );
}

export async function getPaymentStatus(
    context: ActivityContext,
    paymentId: string
): Promise<any> {
    Context.current().log.info('Getting payment status', { paymentId });

    const client = getModuleClient(ModuleName.PAYMENT_INTEGRATION);
    const response = await client.get(`/api/payments/${paymentId}`, {
        headers: { 'X-Tenant-ID': context.tenantId },
    });

    return response.data;
}

export async function processPayment(
    context: ActivityContext,
    params: {
        invoiceId: string;
        amount: number;
        paymentMethod: string;
    }
): Promise<any> {
    Context.current().log.info('Processing payment', { invoiceId: params.invoiceId });

    const client = getModuleClient(ModuleName.PAYMENT_INTEGRATION);
    const response = await client.post(
        '/api/payments/process',
        params,
        { headers: { 'X-Tenant-ID': context.tenantId } }
    );

    return response.data;
}

// ============================================================================
// Credit Scoring Activities (Module 06)
// ============================================================================

export async function getCreditScore(
    context: ActivityContext,
    customerId: string
): Promise<any> {
    Context.current().log.info('Getting credit score', { customerId });

    const client = getModuleClient(ModuleName.CREDIT_SCORING);
    const response = await client.get(`/api/credit/score/${customerId}`, {
        headers: { 'X-Tenant-ID': context.tenantId },
    });

    return response.data;
}

export async function assessCreditRisk(
    context: ActivityContext,
    params: {
        customerId: string;
        requestedAmount: number;
    }
): Promise<any> {
    Context.current().log.info('Assessing credit risk', { customerId: params.customerId });

    const client = getModuleClient(ModuleName.CREDIT_SCORING);
    const response = await client.post(
        '/api/credit/assess-risk',
        params,
        { headers: { 'X-Tenant-ID': context.tenantId } }
    );

    return response.data;
}

// ============================================================================
// Marketing & Customer Success Activities (Module 09)
// ============================================================================

export async function updateCustomerHealth(
    context: ActivityContext,
    customerId: string,
    healthScore: number
): Promise<void> {
    Context.current().log.info('Updating customer health', { customerId, healthScore });

    const client = getModuleClient(ModuleName.MARKETING_CUSTOMER_SUCCESS);
    await client.post(
        `/api/customer-health/${customerId}`,
        { healthScore },
        { headers: { 'X-Tenant-ID': context.tenantId } }
    );
}

export async function trackCustomerInteraction(
    context: ActivityContext,
    params: {
        customerId: string;
        interactionType: string;
        details: Record<string, any>;
    }
): Promise<void> {
    Context.current().log.info('Tracking customer interaction', {
        customerId: params.customerId,
        interactionType: params.interactionType,
    });

    const client = getModuleClient(ModuleName.MARKETING_CUSTOMER_SUCCESS);
    await client.post(
        '/api/interactions',
        params,
        { headers: { 'X-Tenant-ID': context.tenantId } }
    );
}

// ============================================================================
// Delay and Utility Activities
// ============================================================================

export async function sleep(durationMs: number): Promise<void> {
    Context.current().log.info('Sleeping', { durationMs });
    await new Promise(resolve => setTimeout(resolve, durationMs));
}

export async function logActivity(message: string, data?: Record<string, any>): Promise<void> {
    Context.current().log.info(message, data);
}
