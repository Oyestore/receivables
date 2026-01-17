import axios, { AxiosInstance } from 'axios';

/**
 * Module 10: Orchestration Hub API Client
 * Centralized API service for all Module 10 endpoints
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

class Module10API {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: `${API_BASE_URL}/api/v1`,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 seconds
        });

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response.data,
            (error) => {
                console.error('API Error:', error.response?.data || error.message);
                throw error;
            }
        );
    }

    // ========================================
    // Explainability APIs
    // ========================================

    /**
     * Get SHAP explanation for a prediction
     */
    async getSHAPExplanation(params: {
        entityId: string;
        tenantId: string;
        type: 'payment' | 'collection' | 'dispute';
    }) {
        return this.client.get(`/explainability/prediction/${params.entityId}`, {
            params: { tenantId: params.tenantId, type: params.type },
        });
    }

    /**
     * Generate counterfactual recommendations
     */
    async generateCounterfactual(params: {
        tenantId: string;
        entityId: string;
        entityType: 'invoice' | 'customer';
        desiredOutcome: string;
    }) {
        return this.client.post('/explainability/counterfactual', params);
    }

    /**
     * Simulate what-if scenario
     */
    async simulateScenario(params: {
        tenantId: string;
        entityId: string;
        entityType: 'invoice' | 'customer';
        featureChanges: Record<string, number>;
    }) {
        return this.client.post('/explainability/simulate', params);
    }

    /**
     * Get sensitivity analysis
     */
    async getSensitivityAnalysis(params: {
        entityId: string;
        tenantId: string;
    }) {
        return this.client.get(`/explainability/sensitivity/${params.entityId}`, {
            params: { tenantId: params.tenantId },
        });
    }

    // ========================================
    // Graph Intelligence APIs
    // ========================================

    /**
     * Build customer relationship graph
     */
    async buildGraph(tenantId: string) {
        return this.client.post('/graph/build', { tenantId });
    }

    /**
     * Predict payment cascade
     */
    async predictCascade(params: {
        tenantId: string;
        originNodeId: string;
        scenario: 'late_payment' | 'default';
    }) {
        return this.client.post('/graph/predict-cascade', params);
    }

    /**
     * Get key customers by PageRank
     */
    async getKeyCustomers(params: {
        tenantId: string;
        topN?: number;
    }) {
        return this.client.get('/graph/key-customers', { params });
    }

    /**
     * Detect fraud patterns
     */
    async getFraudPatterns(tenantId: string) {
        return this.client.get('/graph/fraud-patterns', {
            params: { tenantId },
        });
    }

    /**
     * Detect communities
     */
    async getCommunities(tenantId: string) {
        return this.client.get('/graph/communities', {
            params: { tenantId },
        });
    }

    // ========================================
    // Causal Inference APIs
    // ========================================

    /**
     * Analyze A/B test
     */
    async analyzeABTest(params: {
        tenantId: string;
        testId: string;
        variantAData: number[];
        variantBData: number[];
        confidenceLevel?: number;
    }) {
        return this.client.post('/causal/analyze-ab-test', params);
    }

    /**
     * Calculate uplift scores
     */
    async calculateUpliftScores(params: {
        tenantId: string;
        treatmentId: string;
        customers: Array<{
            customerId: string;
            segment: string;
            features: Record<string, number>;
        }>;
    }) {
        return this.client.post('/causal/uplift-scores', params);
    }

    /**
     * Estimate treatment effect
     */
    async estimateTreatmentEffect(params: {
        tenantId: string;
        treatmentId: string;
        data: Array<{
            customerId: string;
            treated: boolean;
            outcome: number;
            covariates: Record<string, number>;
        }>;
    }) {
        return this.client.post('/causal/treatment-effect', params);
    }

    /**
     * Optimize policy
     */
    async optimizePolicy(params: {
        tenantId: string;
        targetMetric: string;
        segments: string[];
        possibleActions: string[];
        historicalData: Array<{
            segment: string;
            action: string;
            outcome: number;
        }>;
    }) {
        return this.client.post('/causal/optimize-policy', params);
    }

    /**
     * Get causal DAG
     */
    async getCausalDAG() {
        return this.client.get('/causal/dag');
    }

    // ========================================
    // Reinforcement Learning APIs
    // ========================================

    /**
     * Select action using Q-learning
     */
    async selectAction(params: {
        tenantId: string;
        state: {
            customerId: string;
            segment: string;
            daysOverdue: number;
            amount: number;
            previousContacts: number;
            paymentHistory: number;
        };
    }) {
        return this.client.post('/rl/select-action', params);
    }

    /**
     * Get RL performance metrics
     */
    async getRLPerformance() {
        return this.client.get('/rl/performance-metrics');
    }

    /**
     * Get bandit statistics
     */
    async getBanditStats() {
        return this.client.get('/rl/bandit-stats');
    }
}

// Export singleton instance
export const module10API = new Module10API();

// Export types for better TypeScript support
export interface SHAPExplanation {
    entityId: string;
    prediction: number;
    baseValue: number;
    shapValues: Array<{
        feature: string;
        value: number;
        shapValue: number;
        contribution: number;
    }>;
    topFeatures: Array<{
        feature: string;
        importance: number;
        percentContribution: number;
    }>;
}

export interface CounterfactualRecommendation {
    feature: string;
    currentValue: number | string;
    recommendedValue: number | string;
    feasibility: 'easy' | 'moderate' | 'hard';
    reasoning: string;
}

export interface PaymentCascade {
    originNode: string;
    affectedNodes: Array<{
        nodeId: string;
        probability: number;
        estimatedImpact: number;
        depth: number;
    }>;
    totalRiskAmount: number;
    criticalPath: string[];
}

export interface NodeImportance {
    nodeId: string;
    pageRank: number;
    betweenness: number;
    closeness: number;
    degree: number;
    centralityScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ABTestResult {
    testId: string;
    variantA: { name: string; sampleSize: number; mean: number; stdDev: number };
    variantB: { name: string; sampleSize: number; mean: number; stdDev: number };
    difference: number;
    relativeLift: number;
    pValue: number;
    confidenceInterval: { lower: number; upper: number };
    statisticallySignificant: boolean;
    confidenceLevel: number;
}

export interface FraudPattern {
    patternType: 'circular_dependency' | 'collusion_ring' | 'suspicious_routing' | 'fake_supplier';
    nodes: string[];
    confidence: number;
    evidence: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
}
