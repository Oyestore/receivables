import { Controller, Post, Body, Get, Query, Param } from '@nestjs/common';
import { AiRiskDetectionService } from './ai-risk-detection.service';
import { CreateCreditAssessmentDto } from './create-credit-assessment.dto';
import { RiskAssessmentDto } from './risk-assessment.dto';

@Controller('credit-scoring')
export class CreditScoringController {
    constructor(
        private readonly riskService: AiRiskDetectionService
    ) { }

    @Post('assess-risk')
    async assessRisk(@Body() dto: CreateCreditAssessmentDto): Promise<RiskAssessmentDto> {
        const indicators = await this.riskService.detectRisks(dto.buyerId, dto.tenantId);

        // Simple aggregation logic for overall risk (could be moved to service)
        const highRiskCount = indicators.filter(i => i.riskLevel === 'HIGH' || i.riskLevel === 'CRITICAL').length;
        let overallRisk = 'LOW';
        if (highRiskCount > 0) overallRisk = 'HIGH';
        else if (indicators.length > 0) overallRisk = 'MEDIUM';

        return {
            buyerId: dto.buyerId,
            indicators: indicators.map(i => ({
                type: i.type,
                description: i.description,
                riskLevel: i.riskLevel,
                confidence: i.confidence
            })),
            overallRisk: overallRisk as any
        };
    }
}
