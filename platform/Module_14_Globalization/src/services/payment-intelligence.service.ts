import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentRouteEntity } from '../entities/intelligence.entity';
import { CurrencyService } from './currency.service';

interface RouteOptimizationParams {
    fromCountry: string;
    toCountry: string;
    amount: number;
    currency: string;
    urgency: 'instant' | 'same-day' | 'standard';
}

@Injectable()
export class PaymentIntelligenceService {
    private readonly logger = new Logger(PaymentIntelligenceService.name);

    constructor(
        @InjectRepository(PaymentRouteEntity)
        private routeRepo: Repository<PaymentRouteEntity>,
        private currencyService: CurrencyService
    ) { }

    /**
     * innovative feature: Optimize payment routing to save FX fees
     */
    async optimizePaymentRoute(params: RouteOptimizationParams) {
        // 1. Check existing known high-performance routes
        let knownRoute = await this.routeRepo.findOne({
            where: {
                fromCountry: params.fromCountry,
                toCountry: params.toCountry,
                fromCurrency: params.currency
            },
            order: { avgSavingsPercentage: 'DESC' }
        });

        // 2. Mock external analysis if no known route (Real logic would query Wise/Revolut APIs)
        if (!knownRoute) {
            this.logger.log(`Analyzing new corridor: ${params.fromCountry} -> ${params.toCountry}`);
            knownRoute = await this.simulateExternalAnalysis(params);
        }

        // 3. Calculate dynamic cost comparison
        // Traditional bank wire (approx 3-4% + swift fees)
        const bankFee = Math.max(25, params.amount * 0.035);

        // Optimized route cost
        const optimizedCost = params.amount * (knownRoute.routeOptions?.[0]?.avgCostPercentage || 1.5) / 100;

        const savings = bankFee - optimizedCost;

        return {
            recommendation: {
                provider: knownRoute.recommendedProvider,
                route: knownRoute.routeOptions?.[0]?.intermediaryCurrencies?.length > 0
                    ? [params.currency, ...(knownRoute.routeOptions[0].intermediaryCurrencies || []), 'TARGET']
                    : [params.currency, 'TARGET'],
                totalCost: optimizedCost,
                estimatedTime: `${knownRoute.routeOptions?.[0]?.avgTimeHours || 24} hours`,
                savingsVsDefault: savings > 0 ? savings : 0
            },
            reasoning: `Routing via ${knownRoute.recommendedProvider} saves ${(knownRoute.avgSavingsPercentage).toFixed(1)}% vs standard wire.`,
            alternatives: knownRoute.routeOptions.slice(1)
        };
    }

    private async simulateExternalAnalysis(params: RouteOptimizationParams): Promise<PaymentRouteEntity> {
        // This simulates analyzing a new route and saving it to DB
        // In reality, this would make API calls to providers

        const isMajorCorridor = ['US', 'GB', 'EU', 'IN', 'AE'].includes(params.fromCountry) &&
            ['US', 'GB', 'EU', 'IN', 'AE'].includes(params.toCountry);

        const provider = isMajorCorridor ? 'Wise' : 'SWIFT';
        const costPct = isMajorCorridor ? 0.6 : 2.5; // 0.6% vs 2.5% cost

        const entity = this.routeRepo.create({
            fromCountry: params.fromCountry,
            toCountry: params.toCountry,
            fromCurrency: params.currency,
            toCurrency: 'ANY', // Simplified
            recommendedProvider: provider,
            avgSavingsPercentage: 3.5 - costPct, // Assuming 3.5% baseline
            routeOptions: [
                {
                    provider: provider,
                    intermediaryCurrencies: isMajorCorridor ? [] : ['USD'],
                    avgCostPercentage: costPct,
                    avgTimeHours: isMajorCorridor ? 4 : 48,
                    reliability: 99
                },
                {
                    provider: 'Standard Wire',
                    intermediaryCurrencies: [],
                    avgCostPercentage: 3.5,
                    avgTimeHours: 72,
                    reliability: 95
                }
            ]
        });

        return await this.routeRepo.save(entity);
    }
}
