import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export enum DatasetType {
    INVOICES = 'INVOICES',
    PAYMENTS = 'PAYMENTS',
    CASH_FLOW = 'CASH_FLOW',
    TAX_LIABILITY = 'TAX_LIABILITY'
}

export interface PowerBIDataset {
    type: DatasetType;
    name: string;
    description: string;
    columns: string[];
}

export interface PowerBIWorkspace {
    id: string;
    name: string;
    isReadOnly: boolean;
}

export interface EmbedTokenResult {
    token: string;
    expiration: Date;
    embedUrl: string;
}

export const PowerBIService = {
    /**
     * Get available datasets
     */
    getDatasets: async (tenantId: string): Promise<PowerBIDataset[]> => {
        try {
            const response = await axios.get(`${API_URL}/powerbi/datasets`, {
                params: { tenantId }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching PowerBI datasets:', error);
            return []; // Fallback to empty
        }
    },

    /**
     * Get workspaces
     */
    getWorkspaces: async (): Promise<PowerBIWorkspace[]> => {
        try {
            const response = await axios.get(`${API_URL}/powerbi/workspaces`);
            return response.data;
        } catch (error) {
            console.error('Error fetching PowerBI workspaces:', error);
            return [];
        }
    },

    /**
     * Export data to workspace
     */
    exportToWorkspace: async (tenantId: string, workspaceId: string, datasetType: DatasetType) => {
        try {
            const response = await axios.post(`${API_URL}/powerbi/export`, {
                tenantId,
                workspaceId,
                datasetType
            });
            return response.data;
        } catch (error) {
            console.error('Error exporting to PowerBI:', error);
            throw error;
        }
    },

    /**
     * Generate embed token
     */
    generateEmbedToken: async (workspaceId: string, reportId: string): Promise<EmbedTokenResult> => {
        try {
            const response = await axios.post(`${API_URL}/powerbi/embed-token`, {
                workspaceId,
                reportId
            });
            return response.data;
        } catch (error) {
            console.error('Error generating embed token:', error);
            throw error;
        }
    }
};
