import axios from 'axios';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api/v1';
const TENANT_API_URL = (import.meta as any).env.VITE_API_URL ? (import.meta as any).env.VITE_API_URL.replace('/v1', '/tenant') : 'http://localhost:3000/api/tenant';

// Helper to get tenantId (in a real app this comes from auth context)
const getTenantId = () => 'default-tenant';

export interface Distribution {
    id: string;
    invoiceId: string;
    recipientId: string;
    channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PORTAL';
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'OPENED' | 'CLICKED';
    sentAt?: string;
    deliveredAt?: string;
    invoice?: { invoiceNumber: string };
    recipient?: { recipientName: string };
    options?: { optimize: boolean };
}

export interface CreateDistributionDto {
    invoiceId: string;
    recipientId: string;
    channel: string;
    options?: { optimize: boolean };
}

export const DistributionService = {
    getDistributions: async (organizationId: string): Promise<Distribution[]> => {
        // Backend maps this to 'assignments'
        // Using 'distribution' (singular) as per controller
        const response = await axios.get(`${API_URL}/distribution/assignments`, {
            params: { organizationId }
        });
        return response.data;
    },

    createDistribution: async (data: CreateDistributionDto & { organizationId: string }) => {
        const payload = {
            invoiceId: data.invoiceId,
            customerId: data.recipientId, // Mapping recipientId to customerId for backend compatibility
            targetChannel: data.channel.toLowerCase(),
            metadata: {
                optimize: data.options?.optimize
            }
        };
        const response = await axios.post(`${API_URL}/distribution/assign`, payload);
        return response.data;
    },

    sendDistributionNow: async (id: string) => {
        // Since backend handles immediate send on creation, this might be a re-send or status update
        // Using update status as a proxy for "retry" or "force send" configuration
        const response = await axios.put(`${API_URL}/distribution/assignments/${id}/status`, {
            status: 'pending' // Reset to pending to trigger watcher if exists, or requires new endpoint
        });
        return response.data;
    },

    getRecipients: async (organizationId: string) => {
        const tenantId = getTenantId();
        const response = await axios.get(`${TENANT_API_URL}/${tenantId}/recipients`);
        return response.data;
    },

    getUnsentInvoices: async (organizationId: string) => {
        // Assuming Module 01 endpoint follows standard v1
        const response = await axios.get(`${API_URL}/invoices`, {
            params: { organizationId, status: 'APPROVED' }
        });
        return response.data;
    },

    getEngagementMetrics: async (organizationId: string, startDate: string, endDate: string) => {
        const tenantId = getTenantId();
        const response = await axios.get(`${TENANT_API_URL}/${tenantId}/distribution/analytics/engagement`, {
            params: { startDate, endDate }
        });
        return response.data;
    }
};
