/**
 * Machine Learning Pattern Recognition Service
 * 
 * Advanced pattern recognition and predictive analytics:
 * - Historical pattern analysis
 * - Workflow outcome prediction
 * - Constraint pattern recognition
 * - Anomaly detection
 * - Performance forecasting
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIIntelligenceService } from './ai-intelligence.service';

@Injectable()
export class MLPatternRecognitionService {
    private readonly logger = new Logger(MLPatternRecognitionService.name);

    constructor(
        private readonly aiService: AIIntelligenceService,
        // Repositories would be injected for entities
    ) { }

    /**
     * Learn from historical workflow outcomes
     */
    async learnFromWorkflowOutcomes(
        historicalWorkflows: Array<{
            workflowType: string;
            input: any;
            output: any;
            success: boolean;
            duration: number;
            timestamp: Date;
        }>
    ): Promise<{
        patterns: any[];
        successFactors: string[];
        failureFactors: string[];
        recommendations: string[];
    }> {
        try {
            // Group by workflow type
            const workflowsByType = this.groupByType(historicalWorkflows);

            const allPatterns = [];
            const allSuccessFactors = new Map<string, number>();
            const allFailureFactors = new Map<string, number>();

            for (const [type, workflows] of Object.entries(workflowsByType)) {
                // Analyze success vs failure patterns
                const successful = workflows.filter(w => w.success);
                const failed = workflows.filter(w => !w.success);

                // Use AI to identify patterns
                const analysis = await this.aiService.analyzeHistoricalPatterns({
                    timeRange: `${workflows.length} workflows over time`,
                    constraints: [],
                    workflows: workflows as any[],
                    outcomes: workflows.map(w => ({ success: w.success, duration: w.duration }))
                });

                allPatterns.push(...analysis.patterns);

                // Extract success/failure factors
                if (analysis.trends) {
                    analysis.trends.forEach(trend => {
                        if (trend.includes('success') || trend.includes('improve')) {
                            allSuccessFactors.set(trend, (allSuccessFactors.get(trend) || 0) + 1);
                        } else if (trend.includes('fail') || trend.includes('problem')) {
                            allFailureFactors.set(trend, (allFailureFactors.get(trend) || 0) + 1);
                        }
                    });
                }
            }

            return {
                patterns: allPatterns,
                successFactors: Array.from(allSuccessFactors.keys()).slice(0, 5),
                failureFactors: Array.from(allFailureFactors.keys()).slice(0, 5),
                recommendations: this.generateLearningRecommendations(allPatterns)
            };

        } catch (error) {
            this.logger.error('Failed to learn from workflow outcomes', error);
            return {
                patterns: [],
                successFactors: [],
                failureFactors: [],
                recommendations: []
            };
        }
    }

    /**
     * Predict workflow success probability
     */
    async predictWorkflowSuccess(
        workflowType: string,
        inputData: any,
        context: any
    ): Promise<{
        successProbability: number;
        estimatedDuration: number;
        riskFactors: string[];
        confidence: number;
    }> {
        try {
            // This would use trained ML models in production
            // For now, using AI-based analysis

            const prompt = `
      Predict the success probability for this workflow:
      
      Workflow Type: ${workflowType}
      Input Data: ${JSON.stringify(inputData, null, 2)}
      Context: ${JSON.stringify(context, null, 2)}
      
      Provide prediction in JSON format:
      {
        "successProbability": 0-100,
        "estimatedDuration": minutes,
        "riskFactors": ["risk1", "risk2"],
        "confidence": 0-100
      }
      
      Base prediction on:
      1. Input data completeness
      2. Context favorability
      3. Historical patterns
      4. Resource availability
      5. Known failure modes
      `;

            const response = await this.aiService.generate({
                systemPrompt: "You are an expert in workflow analysis and outcome prediction. Provide realistic probability estimates.",
                prompt,
                temperature: 0.3
            });

            const prediction = JSON.parse(response.text);

            return {
                successProbability: prediction.successProbability || 70,
                estimatedDuration: prediction.estimatedDuration || 300,
                riskFactors: prediction.riskFactors || [],
                confidence: prediction.confidence || 60
            };

        } catch (error) {
            this.logger.error('Failed to predict workflow success', error);
            return {
                successProbability: 50,
                estimatedDuration: 600,
                riskFactors: ['Prediction unavailable'],
                confidence: 0
            };
        }
    }

    /**
     * Detect constraint patterns
     */
    async detectConstraintPatterns(
        historicalConstraints: Array<{
            type: string;
            severity: number;
            timestamp: Date;
            resolved: boolean;
            resolutionTime?: number;
        }>
    ): Promise<{
        recurringPatterns: Array<{
            constraintType: string;
            frequency: string;
            averageResolutionTime: number;
            recommendedPreventiveMeasures: string[];
        }>;
        emergingTrends: string[];
        predictions: any[];
    }> {
        try {
            // Group by constraint type
            const byType = new Map<string, typeof historicalConstraints>();

            historicalConstraints.forEach(constraint => {
                if (!byType.has(constraint.type)) {
                    byType.set(constraint.type, []);
                }
                byType.get(constraint.type)!.push(constraint);
            });

            const recurringPatterns = [];

            for (const [type, constraints] of byType.entries()) {
                if (constraints.length >= 3) { // Only consider if seen at least 3 times
                    const resolved = constraints.filter(c => c.resolved);
                    const avgResolutionTime = resolved.length > 0
                        ? resolved.reduce((sum, c) => sum + (c.resolutionTime || 0), 0) / resolved.length
                        : 0;

                    // Calculate frequency from timestamps
                    const timeSpan = constraints[constraints.length - 1].timestamp.getTime() -
                        constraints[0].timestamp.getTime();
                    const days = timeSpan / (1000 * 60 * 60 * 24);
                    const frequency = days > 0 ? `~${Math.round(days / constraints.length)} days` : 'frequent';

                    recurringPatterns.push({
                        constraintType: type,
                        frequency,
                        averageResolutionTime: Math.round(avgResolutionTime),
                        recommendedPreventiveMeasures: this.getPreventiveMeasures(type)
                    });
                }
            }

            // Use AI for trend detection
            const aiAnalysis = await this.aiService.analyzeHistoricalPatterns({
                timeRange: `${historicalConstraints.length} constraints`,
                constraints: historicalConstraints as any[],
                workflows: [],
                outcomes: historicalConstraints.map(c => ({
                    success: c.resolved,
                    duration: c.resolutionTime || 0
                }))
            });

            return {
                recurringPatterns,
                emergingTrends: aiAnalysis.trends || [],
                predictions: aiAnalysis.predictions || []
            };

        } catch (error) {
            this.logger.error('Failed to detect constraint patterns', error);
            return {
                recurringPatterns: [],
                emergingTrends: [],
                predictions: []
            };
        }
    }

    /**
     * Forecast performance metrics
     */
    async forecastPerformance(
        metricName: string,
        historicalData: Array<{ timestamp: Date; value: number }>,
        forecastDays: number
    ): Promise<{
        forecast: Array<{ date: Date; predictedValue: number; confidence: number }>;
        trend: 'improving' | 'declining' | 'stable';
        insights: string[];
    }> {
        try {
            // Simple trend analysis
            if (historicalData.length < 2) {
                return {
                    forecast: [],
                    trend: 'stable',
                    insights: ['Insufficient data for forecasting']
                };
            }

            // Calculate trend
            const values = historicalData.map(d => d.value);
            const recentAvg = values.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, values.length);
            const olderAvg = values.slice(0, Math.max(7, Math.floor(values.length / 2)))
                .reduce((a, b) => a + b, 0) / Math.max(7, Math.floor(values.length / 2));

            let trend: 'improving' | 'declining' | 'stable' = 'stable';
            if (recentAvg > olderAvg * 1.1) trend = 'improving';
            else if (recentAvg < olderAvg * 0.9) trend = 'declining';

            // Generate forecast (simple linear projection)
            const forecast = [];
            const lastValue = values[values.length - 1];
            const dailyChange = (recentAvg - olderAvg) / values.length;

            for (let i = 1; i <= forecastDays; i++) {
                const predictedValue = lastValue + (dailyChange * i);
                const confidence = Math.max(0, 100 - (i * 5)); // Confidence decreases over time

                forecast.push({
                    date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
                    predictedValue: Math.max(0, predictedValue),
                    confidence
                });
            }

            return {
                forecast,
                trend,
                insights: [
                    `${trend === 'improving' ? 'Positive' : trend === 'declining' ? 'Negative' : 'Stable'} trend detected`,
                    `Current average: ${recentAvg.toFixed(2)}`,
                    `${forecastDays}-day forecast generated with decreasing confidence`
                ]
            };

        } catch (error) {
            this.logger.error('Failed to forecast performance', error);
            return {
                forecast: [],
                trend: 'stable',
                insights: ['Forecasting temporarily unavailable']
            };
        }
    }

    // Helper methods

    private groupByType(workflows: any[]): Record<string, any[]> {
        return workflows.reduce((acc, workflow) => {
            const type = workflow.workflowType || 'unknown';
            if (!acc[type]) acc[type] = [];
            acc[type].push(workflow);
            return acc;
        }, {} as Record<string, any[]>);
    }

    private generateLearningRecommendations(patterns: any[]): string[] {
        const recommendations = [];

        if (patterns.length > 0) {
            recommendations.push('Apply identified patterns to improve workflow success rates');
        }

        if (patterns.some(p => p.frequency === 'daily')) {
            recommendations.push('Consider automating frequently occurring workflows');
        }

        if (patterns.some(p => p.impact && p.impact.includes('high'))) {
            recommendations.push('Prioritize high-impact pattern optimization');
        }

        recommendations.push('Continue monitoring patterns for emerging trends');

        return recommendations;
    }

    private getPreventiveMeasures(constraintType: string): string[] {
        const measures: Record<string, string[]> = {
            cash_flow: [
                'Implement early payment discounts',
                'Tighten credit approval process',
                'Increase collection frequency'
            ],
            collection: [
                'Automate reminder workflows',
                'Segment customers by payment behavior',
                'Offer flexible payment options'
            ],
            credit_risk: [
                'Enhance credit scoring models',
                'Implement automatic credit reviews',
                'Set conservative credit limits'
            ],
            operational: [
                'Optimize workflow scheduling',
                'Add resource capacity buffers',
                'Implement preventive automation'
            ]
        };

        return measures[constraintType] || [
            'Monitor closely for early warning signs',
            'Document resolution procedures',
            'Build contingency plans'
        ];
    }
}
