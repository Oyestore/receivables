import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiRiskDetectionService } from './ai-risk-detection.service';
import { RiskIndicator } from './risk-indicator.entity';
import { BuyerProfile } from './buyer-profile.entity';

describe('AiRiskDetectionService', () => {
    let service: AiRiskDetectionService;
    let riskRepo: Repository<RiskIndicator>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiRiskDetectionService,
                {
                    provide: getRepositoryToken(RiskIndicator),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        save: jest.fn(),
                        create: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(BuyerProfile),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AiRiskDetectionService>(AiRiskDetectionService);
        riskRepo = module.get<Repository<RiskIndicator>>(getRepositoryToken(RiskIndicator));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('detectRisks', () => {
        it('should detect high payment delay risk', async () => {
            const mockBuyer = {
                id: 'buyer-123',
                paymentHistory: { avgDaysToPay: 65 },
            };

            jest.spyOn(service as any, 'analyzePaymentPatterns').mockResolvedValue([
                { type: 'PAYMENT_DELAY', severity: 'HIGH', score: 85 },
            ]);

            const risks = await (service as any).detectRisks(mockBuyer);

            expect(risks).toHaveLength(1);
            expect(risks[0].type).toBe('PAYMENT_DELAY');
            expect(risks[0].severity).toBe('HIGH');
        });

        it('should detect multiple risk factors', async () => {
            const mockBuyer = {
                id: 'buyer-123',
                paymentHistory: { avgDaysToPay: 65, disputeRate: 15 },
            };

            jest.spyOn(service as any, 'analyzePaymentPatterns').mockResolvedValue([
                { type: 'PAYMENT_DELAY', severity: 'HIGH' },
                { type: 'DISPUTE_FREQUENCY', severity: 'MEDIUM' },
            ]);

            const risks = await (service as any).detectRisks(mockBuyer);

            expect(risks.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('calculateRiskScore', () => {
        it('should calculate correct risk score', () => {
            const indicators = [
                { severity: 'HIGH', weight: 40, score: 85 },
                { severity: 'MEDIUM', weight: 30, score: 60 },
                { severity: 'LOW', weight: 30, score: 40 },
            ];

            const score = (service as any).calculateRiskScore(indicators);

            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(100);
        });
    });

    describe('early warning system', () => {
        it('should trigger alert for critical risk', async () => {
            const mockRisk = {
                severity: 'CRITICAL',
                buyerId: 'buyer-123',
                autoAlert: true,
            };

            jest.spyOn(riskRepo, 'save').mockResolvedValue(mockRisk as any);

            await service.detectRisks('buyer-123');

            // Verify alert was triggered
            expect(riskRepo.save).toHaveBeenCalled();
        });
    });
});
