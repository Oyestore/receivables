import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export enum Currency {
    INR = 'INR',
    USD = 'USD',
    EUR = 'EUR',
    GBP = 'GBP',
    AED = 'AED',
    SGD = 'SGD',
    JPY = 'JPY',
    AUD = 'AUD',
    CAD = 'CAD',
    CHF = 'CHF'
}

export interface ExchangeRate {
    from: Currency;
    to: Currency;
    rate: number;
    timestamp: Date;
}

export const ForexService = {
    /**
     * Get real-time exchange rate
     */
    getExchangeRate: async (from: Currency, to: Currency): Promise<ExchangeRate> => {
        try {
            // Check if backend exposes this via controller
            // Assuming endpoint exists as per standard pattern
            const response = await axios.get(`${API_URL}/forex/rate`, {
                params: { from, to }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching exchange rate:', error);
            throw error;
        }
    },

    /**
     * Convert currency
     */
    convertCurrency: async (amount: number, from: Currency, to: Currency) => {
        try {
            const response = await axios.post(`${API_URL}/forex/convert`, {
                amount,
                from,
                to
            });
            return response.data;
        } catch (error) {
            console.error('Error converting currency:', error);
            throw error;
        }
    }
};
