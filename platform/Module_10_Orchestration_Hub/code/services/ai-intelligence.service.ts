/**
 * AI Intelligence Service for Module 10
 * 
 * Full DeepSeek R1 integration for orchestration intelligence:
 * - NLP for natural language queries
 * - ML-based constraint prediction
 * - Strategic analysis and recommendations
 * - Pattern recognition and anomaly detection
 * - Conversational interface
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

export interface AIRequest {
    systemPrompt?: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
}

export interface AIResponse {
    text: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    finishReason: string;
}

@Injectable()
export class AIIntelligenceService {
    private readonly logger = new Logger(AIIntelligenceService.name);
    private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    private readonly defaultModel = 'deepseek/deepseek-r1:free';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Core AI generation method using DeepSeek R1 via OpenRouter
     */
    async generate(request: AIRequest): Promise<AIResponse> {
        const apiKey = this.configService.get<string>('OPENROUTER_API_KEY') ||
            this.configService.get<string>('DEEPSEEK_API_KEY');

        if (!apiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        const payload = {
            model: request.model || this.defaultModel,
            messages: [
                ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
                { role: 'user', content: request.prompt }
            ],
            temperature: request.temperature || 0.7,
            max_tokens: request.maxTokens || 2000,
            response_format: { type: 'text' }
        };

        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://sme-platform.com',
            'X-Title': 'SME Orchestration Hub'
        };

        try {
            const response = await this.httpService.axiosRef.post(this.apiUrl, payload, { headers });

            const choice = response.data.choices[0];
            const usage = response.data.usage;

            return {
                text: choice.message.content,
                usage: {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens
                },
                model: response.data.model,
                finishReason: choice.finish_reason
            };
        } catch (error) {
            this.logger.error('DeepSeek API call failed', error.response?.data || error.message);
            throw new Error(`AI service unavailable: ${error.message}`);
        }
    }

    /**
     * Predict future constraints based on current data patterns
     */
    async predictConstraints(currentData: {
        invoices: any[];
        payments: any[];
        customers: any[];
        creditProfiles: any[];
    }): Promise<{
        predictedConstraints: Array<{
            type: string;
            probability: number;
            timeframe: string;
            severity: 'low' | 'medium' | 'high' | 'critical';
            preventiveMeasures: string[];
        }>;
        confidence: number;
        analysis: string;
    }> {
        const prompt = `
    Analyze the following business data and predict future constraints or bottlenecks:
    
    Current Invoices: ${currentData.invoices.length} invoices
    Recent Payments: ${currentData.payments.length} payments
    Active Customers: ${currentData.customers.length} customers
    Credit Profiles: ${currentData.creditProfiles.length} profiles
    
    Detailed Metrics:
    ${JSON.stringify({
            invoices: currentData.invoices.slice(0, 10), // Sample
            payments: currentData.payments.slice(0, 10),
            customers: currentData.customers.slice(0, 5)
        }, null, 2)}
    
    Provide constraint predictions in JSON format:
    {
      "predictedConstraints": [
        {
          "type": "cash_flow|collection|credit_risk|operational",
          "probability": 0-100,
          "timeframe": "1 week|2 weeks|1 month|3 months",
          "severity": "low|medium|high|critical",
          "preventiveMeasures": ["measure1", "measure2"]
        }
      ],
      "confidence": 0-100,
      "analysis": "detailed explanation of predictions"
    }
    
    Focus on:
    1. Cash flow trends
    2. Payment delays patterns
    3. Credit risk accumulation
    4. Operational bottlenecks
    5. Dr. Barnard's Theory of Constraints
    `;

        const response = await this.generate({
            systemPrompt: "You are an expert in business analytics, predictive modeling, and Dr. Eliyahu M. Goldratt's Theory of Constraints. Analyze patterns and predict future bottlenecks.",
            prompt,
            temperature: 0.4
        });

        try {
            return JSON.parse(response.text);
        } catch (error) {
            this.logger.warn('Failed to parse AI constraint prediction', response.text);
            return {
                predictedConstraints: [],
                confidence: 0,
                analysis: 'Unable to generate predictions at this time'
            };
        }
    }

    /**
     * Process natural language query about orchestration state
     */
    async processNaturalLanguageQuery(query: string, context: {
        tenantId: string;
        constraints?: any[];
        workflows?: any[];
        recommendations?: any[];
    }): Promise<{
        answer: string;
        suggestedActions: string[];
        relatedMetrics: string[];
        confidence: number;
    }> {
        const contextData = `
    Current Context:
    - Active Constraints: ${context.constraints?.length || 0}
    - Running Workflows: ${context.workflows?.length || 0}
    - Pending Recommendations: ${context.recommendations?.length || 0}
    
    Constraint Details: ${JSON.stringify(context.constraints || [], null, 2)}
    `;

        const prompt = `
    User Query: "${query}"
    
    Context:
    ${contextData}
    
    Provide a comprehensive response in JSON format:
    {
      "answer": "clear, detailed answer to the query",
      "suggestedActions": ["action1", "action2", "action3"],
      "relatedMetrics": ["metric1", "metric2"],
      "confidence": 0-100
    }
    
    Guidelines:
    1. Answer in business-friendly language
    2. Provide actionable insights
    3. Reference specific data when available
    4. Suggest next steps
    5. Be precise and helpful
    `;

        const response = await this.generate({
            systemPrompt: "You are an intelligent business assistant specializing in receivables management, workflow orchestration, and strategic guidance. Provide clear, actionable answers.",
            prompt,
            temperature: 0.6
        });

        try {
            return JSON.parse(response.text);
        } catch (error) {
            this.logger.warn('Failed to parse NLP query response', response.text);
            return {
                answer: response.text || 'I apologize, but I could not process your query at this time.',
                suggestedActions: [],
                relatedMetrics: [],
                confidence: 50
            };
        }
    }

    /**
     * Generate strategic insights using AI analysis
     */
    async generateStrategicInsights(businessData: {
        constraints: any[];
        workflows: any[];
        performance: any; tenantMetrics: any;
    }): Promise<{
        insights: Array<{
            category: string;
            insight: string;
            priority: 'low' | 'medium' | 'high';
            impact: string;
            actionItems: string[];
        }>;
        keyFindings: string[];
        opportunityScore: number;
    }> {
        const prompt = `
    Analyze this business data and generate strategic insights:
    
    Constraints: ${JSON.stringify(businessData.constraints, null, 2)}
    Workflow Performance: ${JSON.stringify(businessData.performance, null, 2)}
    Tenant Metrics: ${JSON.stringify(businessData.tenantMetrics, null, 2)}
    
    Provide strategic insights in JSON format:
    {
      "insights": [
        {
          "category": "category",
          "insight": "detailed insight",
          "priority": "low|medium|high",
          "impact": "expected impact",
          "actionItems": ["action1", "action2"]
        }
      ],
      "keyFindings": ["finding1", "finding2", "finding3"],
      "opportunityScore": 0-100
    }
    
    Focus on:
    1. Constraint theory applications
    2. Process optimization opportunities
    3. Revenue protection strategies
    4. Operational excellence
    5. Customer relationship enhancement
    `;

        const response = await this.generate({
            systemPrompt: "You are a strategic business consultant specializing in receivables management, process optimization, and Dr. Barnard's Theory of Constraints.",
            prompt,
            temperature: 0.5
        });

        try {
            return JSON.parse(response.text);
        } catch (error) {
            this.logger.warn('Failed to parse strategic insights', response.text);
            return {
                insights: [],
                keyFindings: ['Unable to generate insights at this time'],
                opportunityScore: 0
            };
        }
    }

    /**
     * Detect anomalies in platform operations
     */
    async detectAnomalies(metricsData: {
        workflows: any[];
        constraints: any[];
        events: any[];
        performance: any;
    }): Promise<{
        anomalies: Array<{
            type: string;
            severity: 'low' | 'medium' | 'high' | 'critical';
            description: string;
            affectedArea: string;
            recommendation: string;
            confidence: number;
        }>;
        overallHealth: number;
        requiresAttention: boolean;
    }> {
        const prompt = `
    Analyze these platform metrics for anomalies and unusual patterns:
    
    Workflow Metrics: ${JSON.stringify(metricsData.workflows, null, 2)}
    Constraint History: ${JSON.stringify(metricsData.constraints, null, 2)}
    Event Stream: ${JSON.stringify(metricsData.events.slice(0, 20), null, 2)}
    Performance Data: ${JSON.stringify(metricsData.performance, null, 2)}
    
    Detect anomalies and provide analysis in JSON format:
    {
      "anomalies": [
        {
          "type": "performance|pattern|data|configuration",
          "severity": "low|medium|high|critical",
          "description": "what's abnormal",
          "affectedArea": "which component/module",
          "recommendation": "how to address",
          "confidence": 0-100
        }
      ],
      "overallHealth": 0-100,
      "requiresAttention": true|false
    }
    
    Look for:
    1. Unusual workflow execution patterns
    2. Constraint accumulation
    3. Performance degradation
    4. Event flooding or silence
    5. Resource bottlenecks
    `;

        const response = await this.generate({
            systemPrompt: "You are an expert in system monitoring, anomaly detection, and operational intelligence for business platforms.",
            prompt,
            temperature: 0.3
        });

        try {
            return JSON.parse(response.text);
        } catch (error) {
            this.logger.warn('Failed to parse anomaly detection', response.text);
            return {
                anomalies: [],
                overallHealth: 100,
                requiresAttention: false
            };
        }
    }

    /**
     * Optimize recommendation quality using AI refinement
     */
    async refineRecommendations(recommendations: any[]): Promise<{
        optimizedRecommendations: any[];
        consolidationAdvice: string[];
        priorityAdjustments: Array<{ id: string; newPriority: number; reason: string }>;
    }> {
        const prompt = `
    Review and optimize these strategic recommendations:
    
    ${JSON.stringify(recommendations, null, 2)}
    
    Provide optimization in JSON format:
    {
      "optimizedRecommendations": [/* refined recommendations */],
      "consolidationAdvice": ["advice1", "advice2"],
      "priorityAdjustments": [
        {
          "id": "rec_id",
          "newPriority": 1-10,
          "reason": "why priority changed"
        }
      ]
    }
    
    Optimization criteria:
    1. Remove redundancies
    2. Consolidate related recommendations
    3. Adjust priorities based on impact
    4. Ensure actionability
    5. Apply Dr. Barnard's "One Thing to Focus On"
    `;

        const response = await this.generate({
            systemPrompt: "You are an expert in strategic planning, prioritization, and recommendation optimization using Theory of Constraints principles.",
            prompt,
            temperature: 0.4
        });

        try {
            return JSON.parse(response.text);
        } catch (error) {
            this.logger.warn('Failed to parse recommendation optimization', response.text);
            return {
                optimizedRecommendations: recommendations,
                consolidationAdvice: [],
                priorityAdjustments: []
            };
        }
    }

    /**
     * Generate conversational responses for chat interface
     */
    async generateConversationalResponse(
        userMessage: string,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        context: any
    ): Promise<{
        response: string;
        suggestions: string[];
        followUpQuestions: string[];
        confidence: number;
    }> {
        const historyText = conversationHistory
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');

        const prompt = `
    Previous Conversation:
    ${historyText}
    
    Current Context:
    ${JSON.stringify(context, null, 2)}
    
    User Message: "${userMessage}"
    
    Provide a helpful, conversational response in JSON format:
    {
      "response": "your response",
      "suggestions": ["suggestion1", "suggestion2"],
      "followUpQuestions": ["question1", "question2"],
      "confidence": 0-100
    }
    
    Guidelines:
    1. Be conversational and friendly
    2. Reference previous context
    3. Provide actionable guidance
    4. Ask clarifying questions when needed
    5. Keep responses concise but helpful
    `;

        const response = await this.generate({
            systemPrompt: "You are a helpful AI assistant for the SME platform, specializing in receivables management and business optimization. Be conversational, precise, and actionable.",
            prompt,
            temperature: 0.7
        });

        try {
            return JSON.parse(response.text);
        } catch (error) {
            this.logger.warn('Failed to parse conversational response', response.text);
            return {
                response: response.text || 'I apologize, but I encountered an issue. Could you rephrase your question?',
                suggestions: [],
                followUpQuestions: [],
                confidence: 50
            };
        }
    }

    /**
     * Analyze patterns in historical data
     */
    async analyzeHistoricalPatterns(historicalData: {
        timeRange: string;
        constraints: any[];
        workflows: any[];
        outcomes: any[];
    }): Promise<{
        patterns: Array<{
            name: string;
            frequency: string;
            impact: string;
            recommendation: string;
        }>;
        trends: string[];
        seasonality: any;
        predictions: string[];
    }> {
        const prompt = `
    Analyze historical patterns in this data:
    
    Time Range: ${historicalData.timeRange}
    Constraints: ${JSON.stringify(historicalData.constraints, null, 2)}
    Workflow History: ${JSON.stringify(historicalData.workflows, null, 2)}
    Outcomes: ${JSON.stringify(historicalData.outcomes, null, 2)}
    
    Identify patterns in JSON format:
    {
      "patterns": [
        {
          "name": "pattern name",
          "frequency": "daily|weekly|monthly",
          "impact": "description",
          "recommendation": "what to do"
        }
      ],
      "trends": ["trend1", "trend2"],
      "seasonality": {
        "detected": true|false,
        "period": "period if detected",
        "description": "details"
      },
      "predictions": ["prediction1", "prediction2"]
    }
    
    Look for:
    1. Recurring constraint patterns
    2. Seasonal variations
    3. Correlation between events
    4. Success/failure patterns
    5. Optimization opportunities
    `;

        const response = await this.generate({
            systemPrompt: "You are an expert in time-series analysis, pattern recognition, and predictive analytics for business data.",
            prompt,
            temperature: 0.4
        });

        try {
            return JSON.parse(response.text);
        } catch (error) {
            this.logger.warn('Failed to parse pattern analysis', response.text);
            return {
                patterns: [],
                trends: [],
                seasonality: { detected: false },
                predictions: []
            };
        }
    }
}
