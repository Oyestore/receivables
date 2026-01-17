/**
 * Natural Language Processing Service
 * 
 * Provides NLP capabilities for Module 10:
 * - Query understanding and intent detection
 * - Entity extraction
 * - Context management
 * - Conversational state tracking
 */

import { Injectable, Logger } from '@nestjs/common';
import { AIIntelligenceService } from './ai-intelligence.service';

export interface NLPQuery {
    query: string;
    tenantId: string;
    userId: string;
    context?: Record<string, any>;
}

export interface NLPResponse {
    intent: string;
    entities: Record<string, any>;
    answer: string;
    suggestions: string[];
    confidence: number;
    requiresClarification: boolean;
    followUpQuestions?: string[];
}

@Injectable()
export class NLPService {
    private readonly logger = new Logger(NLPService.name);

    // Store conversation context (in production, use Redis)
    private conversationContexts = new Map<string, Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
    }>>();

    constructor(
        private readonly aiService: AIIntelligenceService,
    ) { }

    /**
     * Process natural language query
     */
    async processQuery(query: NLPQuery, orchestrationContext: any): Promise<NLPResponse> {
        try {
            // Get conversation history
            const conversationKey = `${query.tenantId}:${query.userId}`;
            const history = this.conversationContexts.get(conversationKey) || [];

            // Process query through AI
            const aiResponse = await this.aiService.processNaturalLanguageQuery(
                query.query,
                {
                    tenantId: query.tenantId,
                    constraints: orchestrationContext.constraints,
                    workflows: orchestrationContext.workflows,
                    recommendations: orchestrationContext.recommendations
                }
            );

            // Detect intent
            const intent = await this.detectIntent(query.query);

            // Extract entities
            const entities = await this.extractEntities(query.query);

            // Update conversation history
            history.push(
                { role: 'user', content: query.query, timestamp: new Date() },
                { role: 'assistant', content: aiResponse.answer, timestamp: new Date() }
            );

            // Keep only last 10 exchanges
            if (history.length > 20) {
                history.splice(0, history.length - 20);
            }

            this.conversationContexts.set(conversationKey, history);

            return {
                intent,
                entities,
                answer: aiResponse.answer,
                suggestions: aiResponse.suggestedActions,
                confidence: aiResponse.confidence,
                requiresClarification: aiResponse.confidence < 60,
                followUpQuestions: aiResponse.confidence < 60 ? aiResponse.suggestedActions : undefined
            };

        } catch (error) {
            this.logger.error('NLP query processing failed', error);
            throw new Error(`Failed to process query: ${error.message}`);
        }
    }

    /**
     * Detect user intent from query
     */
    private async detectIntent(query: string): Promise<string> {
        // Simple keyword-based intent detection (can be enhanced with AI)
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('workflow') || lowerQuery.includes('process')) {
            return 'workflow_query';
        }
        if (lowerQuery.includes('constraint') || lowerQuery.includes('bottleneck')) {
            return 'constraint_query';
        }
        if (lowerQuery.includes('recommend') || lowerQuery.includes('suggest') || lowerQuery.includes('should')) {
            return 'recommendation_query';
        }
        if (lowerQuery.includes('status') || lowerQuery.includes('how many') || lowerQuery.includes('count')) {
            return 'status_query';
        }
        if (lowerQuery.includes('why') || lowerQuery.includes('explain')) {
            return 'explanation_query';
        }
        if (lowerQuery.includes('help') || lowerQuery.includes('how to')) {
            return 'help_query';
        }

        return 'general_query';
    }

    /**
     * Extract entities from query
     */
    private async extractEntities(query: string): Promise<Record<string, any>> {
        const entities: Record<string, any> = {};

        // Extract dates (simple regex-based)
        const dateMatch = query.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
        if (dateMatch) {
            entities.date = dateMatch[1];
        }

        // Extract numbers (amounts, counts)
        const numberMatch = query.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
        if (numberMatch) {
            entities.number = parseFloat(numberMatch[1].replace(/,/g, ''));
        }

        // Extract invoice IDs
        const invoiceMatch = query.match(/(?:invoice|inv|bill)[\s#:]*([A-Z0-9-]+)/i);
        if (invoiceMatch) {
            entities.invoiceId = invoiceMatch[1];
        }

        // Extract customer IDs or names
        const customerMatch = query.match(/(?:customer|client)[\s#:]*([A-Z0-9-]+)/i);
        if (customerMatch) {
            entities.customerId = customerMatch[1];
        }

        return entities;
    }

    /**
     * Start multi-turn conversation
     */
    async startConversation(tenantId: string, userId: string, initialMessage: string): Promise<{
        conversationId: string;
        response: NLPResponse;
    }> {
        const conversationId = `${tenantId}:${userId}:${Date.now()}`;

        const response = await this.processQuery(
            { query: initialMessage, tenantId, userId },
            {} // Initial context empty
        );

        return {
            conversationId,
            response
        };
    }

    /**
     * Continue conversation
     */
    async continueConversation(
        conversationId: string,
        message: string,
        context: any
    ): Promise<NLPResponse> {
        const [tenantId, userId] = conversationId.split(':');

        return this.processQuery(
            { query: message, tenantId, userId },
            context
        );
    }

    /**
     * Clear conversation history
     */
    clearConversation(tenantId: string, userId: string): void {
        const conversationKey = `${tenantId}:${userId}`;
        this.conversationContexts.delete(conversationKey);
    }

    /**
     * Get conversation history
     */
    getConversationHistory(tenantId: string, userId: string): Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
    }> {
        const conversationKey = `${tenantId}:${userId}`;
        return this.conversationContexts.get(conversationKey) || [];
    }
}
