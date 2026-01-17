import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Current Tenant ID (Mock for now, should come from Auth Context)
const CURRENT_TENANT_ID = 'TENANT_1';

export interface GlobalTradeConfig {
    enabled: boolean;
    lutNumber?: string;
    filingFrequency?: 'monthly' | 'quarterly';
    autoExchangeRateFetch?: boolean;
}

export const AdminConfigService = {
    /**
     * Get Global Trade Configuration from Tenant Metadata
     */
    getGlobalTradeConfig: async (): Promise<GlobalTradeConfig> => {
        try {
            const response = await axios.get(`${API_URL}/v1/admin/tenants/${CURRENT_TENANT_ID}`);
            const metadata = response.data.metadata || {};
            return metadata.globalTrade || {
                enabled: false,
                lutNumber: '',
                filingFrequency: 'monthly',
                autoExchangeRateFetch: true
            };
        } catch (error) {
            console.error('Error fetching global trade config:', error);
            // Return default if failed (e.g. 404 or network error)
            return {
                enabled: false,
                lutNumber: '',
                filingFrequency: 'monthly',
                autoExchangeRateFetch: true
            };
        }
    },

    /**
     * Save Global Trade Configuration
     */
    saveGlobalTradeConfig: async (config: GlobalTradeConfig): Promise<void> => {
        try {
            // First get current metadata to preserve other keys
            const currentResponse = await axios.get(`${API_URL}/v1/admin/tenants/${CURRENT_TENANT_ID}`);
            const currentMetadata = currentResponse.data.metadata || {};

            // Update metadata with new config
            const updatedMetadata = {
                ...currentMetadata,
                globalTrade: config
            };

            await axios.put(`${API_URL}/v1/admin/tenants/${CURRENT_TENANT_ID}`, {
                settings: {
                    metadata: updatedMetadata
                }
            });
        } catch (error) {
            console.error('Error saving global trade config:', error);
            throw error;
        }
    }
};
