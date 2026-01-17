import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * DeepSeek R1 AI Service
 * 
 * Integration with locally hosted DeepSeek R1 model
 * Provides AI-powered business intelligence generation
 * 
 * Features:
 * - Business insight generation
 * - Pattern analysis
 * - Natural language understanding
 * - Predictive analytics
 * - Recommendation engine
 */
@Injectable()
export class DeepSeekAIService {
    private readonly logger = new Logger(DeepSeekAIService.name);
    private httpClient: AxiosInstance;
    private readonly baseUrl: string;

    constructor() {
        // DeepSeek R1 local API endpoint
        this.baseUrl = process.env.DEEPSEEK_API_URL || 'http://localhost:11434';

        this.httpClient = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.logger.log(`DeepSeek AI Service initialized - Endpoint: ${this.baseUrl}`);
    }

    /**
     * Generate business insights from data
     */
    async generateBusinessInsights(context: {
        tenantId: string;
        metrics: any;
        events: any[];
        timeframe: string;
    }): Promise<{
        insights: string[];
        opportunities: string[];
        risks: string[];
        recommendations: string[];
    }> {
        try {
            const prompt = this.buildInsightPrompt(context);
            const response = await this.callDeepSeek(prompt);

            return this.parseInsightResponse(response);
        } catch (error) {
            this.logger.error(`Failed to generate insights: ${error.message}`);
            return {
                insights: [],
                opportunities: [],
                risks: [],
                recommendations: [],
            };
        }
    }

    /**
     * Analyze cash flow and predict future trends
     */
    async analyzeCashFlow(data: {
        historical: Array<{ date: string; amount: number }>;
        pending: Array<{ dueDate: string; amount: number; probability: number }>;
        expenses: Array<{ date: string; amount: number }>;
    }): Promise<{
        prediction: Array<{ date: string; amount: number; confidence: number }>;
        analysis: string;
        recommendations: string[];
    }> {
        try {
            const prompt = `
You are a CFO analyzing cash flow for an SME business.

Historical Cash Flow (last 30 days):
${data.historical.map(h => `${h.date}: ₹${h.amount}`).join('\n')}

Pending Receivables:
${data.pending.map(p => `Due ${p.dueDate}: ₹${p.amount} (${p.probability}% likely)`).join('\n')}

Analyze the data and provide:
1. Next 7 days cash flow prediction with confidence levels
2. Key insights about cash flow patterns
3. 3 specific recommendations to improve cash position

Format your response as JSON:
{
  "predictions": [{"date": "2026-01-16", "amount": 1000000, "confidence": 85}],
  "analysis": "Your analysis here",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}
`;

            const response = await this.callDeepSeek(prompt);
            return this.parseCashFlowResponse(response);
        } catch (error) {
            this.logger.error(`Cash flow analysis failed: ${error.message}`);
            return {
                prediction: [],
                analysis: 'Unable to generate prediction at this time',
                recommendations: [],
            };
        }
    }

    /**
     * Predict when an invoice will be paid
     */
    async predictPaymentTiming(invoice: {
        invoiceId: string;
        customerId: string;
        amount: number;
        dueDate: Date;
        customerHistory: Array<{ invoiceAmount: number; daysToPayment: number }>;
    }): Promise<{
        predictedDate: Date;
        confidence: number;
        factors: string[];
        recommendation: string;
    }> {
        try {
            const prompt = `
Analyze payment behavior and predict when this invoice will be paid:

Invoice Details:
- Amount: ₹${invoice.amount}
- Due Date: ${invoice.dueDate.toISOString().split('T')[0]}

Customer Payment History:
${invoice.customerHistory.map(h =>
                `Invoice ₹${h.invoiceAmount} paid in ${h.daysToPayment} days`
            ).join('\n')}

Provide prediction as JSON:
{
  "daysToPayment": 25,
  "confidence": 82,
  "factors": ["Customer typically pays 5 days late", "Similar amount paid in 23 days"],
  "recommendation": "Send reminder 2 days before due date"
}
`;

            const response = await this.callDeepSeek(prompt);
            return this.parsePaymentPrediction(response, invoice.dueDate);
        } catch (error) {
            this.logger.error(`Payment prediction failed: ${error.message}`);

            // Fallback: Use average from history
            const avgDays = invoice.customerHistory.length > 0
                ? invoice.customerHistory.reduce((sum, h) => sum + h.daysToPayment, 0) / invoice.customerHistory.length
                : 30;

            const predictedDate = new Date(invoice.dueDate);
            predictedDate.setDate(predictedDate.getDate() + avgDays);

            return {
                predictedDate,
                confidence: 60,
                factors: ['Based on historical average'],
                recommendation: 'Follow up before due date',
            };
        }
    }

    /**
     * Process natural language query
     */
    async processNaturalLanguageQuery(query: string, context: any): Promise<{
        answer: string;
        data?: any;
        visualizationType?: string;
        actions?: Array<{ label: string; action: string }>;
    }> {
        try {
            const prompt = `
You are a business intelligence assistant for an SME receivables platform.

User Question: "${query}"

Business Context:
${JSON.stringify(context, null, 2)}

Provide a helpful, actionable answer with specific data points.
If relevant, suggest actions the user can take.

Format as JSON:
{
  "answer": "Your detailed answer here",
  "data": {any relevant data to visualize},
  "actions": [{"label": "Take Action", "action": "send-reminders"}]
}
`;

            const response = await this.callDeepSeek(prompt);
            return this.parseNLPResponse(response);
        } catch (error) {
            this.logger.error(`NLP query processing failed: ${error.message}`);
            return {
                answer: "I'm having trouble answering that right now. Please try rephrasing your question.",
            };
        }
    }

    /**
     * Detect anomalies in business metrics
     */
    async detectAnomalies(data: {
        metric: string;
        values: Array<{ date: string; value: number }>;
        threshold?: number;
    }): Promise<{
        anomalies: Array<{
            date: string;
            value: number;
            severity: 'low' | 'medium' | 'high';
            explanation: string;
        }>;
        pattern: string;
    }> {
        try {
            const prompt = `
Analyze this business metric for anomalies:

Metric: ${data.metric}
Data Points:
${data.values.map(v => `${v.date}: ${v.value}`).join('\n')}

Identify:
1. Unusual spikes or drops
2. Pattern changes
3. Potential causes

Format as JSON:
{
  "anomalies": [
    {"date": "2026-01-10", "value": 5000, "severity": "high", "explanation": "50% drop from average"}
  ],
  "pattern": "Overall trend description"
}
`;

            const response = await this.callDeepSeek(prompt);
            return this.parseAnomalyResponse(response);
        } catch (error) {
            this.logger.error(`Anomaly detection failed: ${error.message}`);
            return {
                anomalies: [],
                pattern: 'Unable to detect patterns',
            };
        }
    }

    // ==========================================
    // PRIVATE HELPER METHODS
    // ==========================================

    /**
     * Call DeepSeek API
     */
    private async callDeepSeek(prompt: string): Promise<string> {
        try {
            // DeepSeek/Ollama API format
            const response = await this.httpClient.post('/api/generate', {
                model: 'deepseek-r1:latest',
                prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                },
            });

            return response.data.response || '';
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                this.logger.warn('DeepSeek API not available - using fallback');
                return this.getFallbackResponse(prompt);
            }
            throw error;
        }
    }

    /**
     * Build insight generation prompt
     */
    private buildInsightPrompt(context: any): string {
        return `
You are a CFO analyzing business performance for an SME.

Current Metrics:
- Revenue: ₹${context.metrics?.revenue || 0}
- Outstanding: ₹${context.metrics?.outstanding || 0}
- Overdue: ₹${context.metrics?.overdue || 0}

Recent Events (${context.timeframe}):
${context.events.slice(0, 10).map(e => `- ${e.event_type}: ${JSON.stringify(e.event_data)}`).join('\n')}

Provide:
1. Top 3 business insights
2. Top 2 revenue opportunities
3. Top 2 risks to mitigate
4. 3 specific actionable recommendations

Be specific with numbers and actions.
`;
    }

    /**
     * Parse insight response
     */
    private parseInsightResponse(response: string): any {
        try {
            // Try to parse as JSON first
            const json = JSON.parse(response);
            return json;
        } catch {
            // Parse natural language response
            return {
                insights: this.extractBulletPoints(response, 'insights'),
                opportunities: this.extractBulletPoints(response, 'opportunities'),
                risks: this.extractBulletPoints(response, 'risks'),
                recommendations: this.extractBulletPoints(response, 'recommendations'),
            };
        }
    }

    /**
     * Parse cash flow response
     */
    private parseCashFlowResponse(response: string): any {
        try {
            return JSON.parse(response);
        } catch {
            return {
                prediction: [],
                analysis: response.substring(0, 200),
                recommendations: [],
            };
        }
    }

    /**
     * Parse payment prediction
     */
    private parsePaymentPrediction(response: string, dueDate: Date): any {
        try {
            const json = JSON.parse(response);
            const predictedDate = new Date(dueDate);
            predictedDate.setDate(predictedDate.getDate() + json.daysToPayment);

            return {
                predictedDate,
                confidence: json.confidence,
                factors: json.factors || [],
                recommendation: json.recommendation || '',
            };
        } catch {
            const predictedDate = new Date(dueDate);
            predictedDate.setDate(predictedDate.getDate() + 30);

            return {
                predictedDate,
                confidence: 50,
                factors: ['Unable to analyze'],
                recommendation: response.substring(0, 100),
            };
        }
    }

    /**
     * Parse NLP response
     */
    private parseNLPResponse(response: string): any {
        try {
            return JSON.parse(response);
        } catch {
            return {
                answer: response,
            };
        }
    }

    /**
     * Parse anomaly response
     */
    private parseAnomalyResponse(response: string): any {
        try {
            return JSON.parse(response);
        } catch {
            return {
                anomalies: [],
                pattern: response.substring(0, 200),
            };
        }
    }

    /**
     * Extract bullet points from text
     */
    private extractBulletPoints(text: string, section: string): string[] {
        const lines = text.split('\n');
        const points: string[] = [];
        let inSection = false;

        for (const line of lines) {
            if (line.toLowerCase().includes(section)) {
                inSection = true;
                continue;
            }

            if (inSection && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))) {
                points.push(line.replace(/^[-•\d.]\s*/, '').trim());
            }

            if (inSection && points.length >= 3) break;
        }

        return points.slice(0, 3);
    }

    /**
     * Fallback response when DeepSeek is unavailable
     */
    private getFallbackResponse(prompt: string): string {
        this.logger.warn('Using fallback AI response');

        // Return structured fallback based on prompt type
        if (prompt.includes('cash flow')) {
            return JSON.stringify({
                predictions: [
                    { date: new Date().toISOString().split('T')[0], amount: 1000000, confidence: 70 }
                ],
                analysis: 'Cash flow analysis unavailable - AI service offline',
                recommendations: ['Enable AI service for detailed predictions'],
            });
        }

        return JSON.stringify({
            insights: ['AI service temporarily unavailable'],
            opportunities: [],
            risks: [],
            recommendations: ['Please check DeepSeek API connection'],
        });
    }

    /**
     * Check if DeepSeek is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            await this.httpClient.get('/api/tags');
            return true;
        } catch {
            return false;
        }
    }
}
