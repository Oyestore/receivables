import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface CreditDecisionRequest {
    pan: string;
    score: number;
    enquiryCount: number;
    dpd30Count: number;
    dpd60Count: number;
    dpd90Count: number;
    activeDefaults: number;
    requestedAmount: number;
}

export interface CreditReport {
    reportId: string;
    score: number;
    scoreType: string;
    pan: string;
    name: string; // Added to match frontend needs
}

/**
 * Fetch credit report for a given PAN
 * Calls the Module 06 Credit Scoring API
 */
fetchCreditReport: async (pan: string, consentId: string, purpose: string = 'LENDING'): Promise<CreditReport> => {
    try {
        // Mapping frontend request to Module 06 DTO
        const response = await axios.post(`${API_URL}/credit-scoring/assess-risk`, {
            buyerId: pan, // Treating PAN as Buyer ID
            tenantId: 'default', // TODO: Get from context
            metadata: { consentId, purpose },
            financialData: { pan }
        });

        // Transform Module 06 response (RiskAssessmentDto) to CreditReport
        return {
            reportId: response.data.buyerId,
            score: response.data.overallRisk === 'LOW' ? 850 : 650, // Mock score mapping
            scoreType: 'AI_RISK_SCORE',
            pan: pan,
            name: 'Verified Entity'
        };
    } catch (error) {
        console.error('Error fetching credit report:', error);
        throw error;
    }
},

    /**
     * Calculate credit decision based on report data
     */
    calculateDecision: async (data: CreditDecisionRequest) => {
        try {
            const response = await axios.post(`${API_URL}/credit-score/decision`, data);
            return response.data;
        } catch (error) {
            console.error('Error calculating decision:', error);
            throw error;
        }
    }
};
