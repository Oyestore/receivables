import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface SendTimePrediction {
    optimalHour: number;
    optimalDay: number; // 0-6 (Sun-Sat)
    confidenceScore: number;
    predictedOpenRate: number;
    reasoning: string[];
}

export interface PredictTimingDto {
    customerId: string;
    tenantId: string;
    invoiceAmount?: number;
}

export const MLDistributionService = {
    /**
     * Predict optimal send time for a customer
     */
    predictOptimalSendTime: async (data: PredictTimingDto): Promise<SendTimePrediction> => {
        try {
            const response = await axios.post(`${API_URL}/ml-timing/predict`, data);
            return response.data;
        } catch (error) {
            console.error('Error predicting send time:', error);
            throw error;
        }
    },

    /**
     * Get customer response patterns
     */
    getCustomerPatterns: async (customerId: string, tenantId: string) => {
        try {
            const response = await axios.get(`${API_URL}/ml-timing/patterns/${customerId}`, {
                params: { tenantId }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching customer patterns:', error);
            throw error;
        }
    }
};
