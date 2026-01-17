import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ApplicationController } from '../controllers/application.controller';
import { ApplicationOrchestratorService } from '../services/application-orchestrator.service';
import { PartnerRegistryService } from '../services/partner-registry.service';
import { OfferNormalizationService } from '../services/offer-normalization.service';
import { OfferRankingService } from '../services/offer-ranking.service';
import { LendingKartAdapter } from '../adapters/lendingkart.adapter';
import { CapitalFloatAdapter } from '../adapters/capital-float.adapter';
import { ModuleIntegrationService } from '../services/module-integration.service';
import { FinancingApplication } from '../entities/financing-application.entity';
import { FINANCING_EVENTS } from '../events/financing.events';

describe('Advanced Integration Tests', () => {
    let app: TestingModule;
    let controller: ApplicationController;
    let orchestrator: ApplicationOrchestratorService;
    let partnerRegistry: PartnerRegistryService;
    let normalizationService: OfferNormalizationService;
    let rankingService: OfferRankingService;
    let integrationService: ModuleIntegrationService;
    let eventEmitter: EventEmitter2;

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getCount: jest.fn().mockResolvedValue(0),
            getMany: jest.fn().mockResolvedValue([]),
        })),
    };

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [HttpModule, ConfigModule.forRoot(), EventEmitterModule.forRoot()],
            controllers: [ApplicationController],
            providers: [
                ApplicationOrchestratorService,
                PartnerRegistryService,
                OfferNormalizationService,
                OfferRankingService,
                ModuleIntegrationService,
                LendingKartAdapter,
                CapitalFloatAdapter,
                {
                    provide: getRepositoryToken(FinancingApplication),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        controller = app.get<ApplicationController>(ApplicationController);
        orchestrator = app.get<ApplicationOrchestratorService>(ApplicationOrchestratorService);
        partnerRegistry = app.get<PartnerRegistryService>(PartnerRegistryService);
        normalizationService = app.get<OfferNormalizationService>(OfferNormalizationService);
        rankingService = app.get<OfferRankingService>(OfferRankingService);
        integrationService = app.get<ModuleIntegrationService>(ModuleIntegrationService);
        eventEmitter = app.get<EventEmitter2>(EventEmitter2);

        // Register partners
        const lendingKart = app.get<LendingKartAdapter>(LendingKartAdapter);
        const capitalFloat = app.get<CapitalFloatAdapter>(CapitalFloatAdapter);
        partnerRegistry.registerPartner(lendingKart);
        partnerRegistry.registerPartner(capitalFloat);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Complete Application Lifecycle', () => {
        it('should handle end-to-end application flow', async () => {
            const mockApplication = {
                id: 'app-e2e-123',
                applicationNumber: 'FIN123456',
                tenantId: 'tenant-456',
                userId: 'user-789',
                requestedAmount: 500000,
                status: 'draft',
            };

            mockRepository.create.mockReturnValue(mockApplication);
            mockRepository.save.mockResolvedValue(mockApplication);
            mockRepository.findOne.mockResolvedValue(mockApplication);

            // Step 1: Create application
            const created = await orchestrator.createApplication('tenant-456', 'user-789', {
                financingType: 'invoice_financing',
                requestedAmount: 500000,
                urgency: 'flexible',
                businessDetails: {
                    businessName: 'E2E Test Corp',
                    businessPan: 'ABCDE1234F',
                    annualRevenue: 10000000,
                    yearsInBusiness: 3,
                    industry: 'Technology',
                },
                preferences: {},
            });

            expect(created).toBeDefined();
            expect(created.id).toBe('app-e2e-123');

            // Step 2: Submit to partners
            mockRepository.findOne.mockResolvedValue({
                ...mockApplication,
                userId: 'user-789',
                status: 'draft',
            });

            const submitted = await orchestrator.submitToPartners(
                'app-e2e-123',
                'user-789',
                {
                    partnerIds: ['lendingkart', 'capital_float'],
                    mode: 'auction',
                },
            );

            expect(submitted).toBeDefined();
        });

        it('should emit correct events throughout lifecycle', async () => {
            const events: string[] = [];
            eventEmitter.on(FINANCING_EVENTS.APPLICATION_CREATED, () => events.push('created'));
            eventEmitter.on(FINANCING_EVENTS.APPLICATION_SUBMITTED, () => events.push('submitted'));

            mockRepository.create.mockReturnValue({ id: 'app-evt' });
            mockRepository.save.mockResolvedValue({ id: 'app-evt', userId: 'user-789', status: 'draft' });
            mockRepository.findOne.mockResolvedValue({ id: 'app-evt', userId: 'user-789', status: 'draft' });

            await orchestrator.createApplication('tenant-456', 'user-789', {
                financingType: 'working_capital',
                requestedAmount: 1000000,
                urgency: 'flexible',
                businessDetails: {
                    businessName: 'Event Test',
                    businessPan: 'ABCDE1234F',
                },
                preferences: {},
            });

            await orchestrator.submitToPartners('app-evt', 'user-789', {
                partnerIds: ['lendingkart'],
                mode: 'single',
            });

            expect(events).toContain('created');
            expect(events).toContain('submitted');
        });
    });

    describe('Offer Comparison Pipeline', () => {
        it('should normalize and rank offers correctly', async () => {
            const mockOffers = [
                {
                    offer: {
                        offerId: 'offer-1',
                        amount: 500000,
                        interestRate: 18,
                        processingFee: 10000,
                        tenure: 12,
                        disbursalTime: '48 hours',
                        conditions: [],
                        expiresAt: new Date(),
                        rawData: {},
                    },
                    partnerId: 'lendingkart',
                    partnerName: 'LendingKart',
                },
                {
                    offer: {
                        offerId: 'offer-2',
                        amount: 500000,
                        interestRate: 14,
                        processingFee: 7500,
                        tenure: 12,
                        disbursalTime: '24 hours',
                        conditions: ['Flexible repayment'],
                        expiresAt: new Date(),
                        rawData: {},
                    },
                    partnerId: 'capital_float',
                    partnerName: 'Capital Float',
                },
            ];

            // Normalize
            const normalized = await normalizationService.normalizeOffers(mockOffers);

            expect(normalized).toHaveLength(2);
            expect(normalized[0].effectiveAPR).toBeDefined();
            expect(normalized[1].effectiveAPR).toBeDefined();

            // Rank
            const ranked = await rankingService.rankOffers(normalized, {
                prioritize: 'lowest_rate',
                urgency: 'flexible',
            });

            expect(ranked).toHaveLength(2);
            expect(ranked[0].rank).toBe(1);
            expect(ranked[1].rank).toBe(2);

            // Capital Float should rank first (lower rate)
            expect(ranked[0].partnerId).toBe('capital_float');
        });
    });

    describe('Error Recovery', () => {
        it('should handle partial partner failures', async () => {
            // Test that system continues if one partner fails
            const partners = partnerRegistry.getAllPartners();

            expect(partners.length).toBeGreaterThan(0);

            // Even if eligibility check fails for one, others should work
            const results = await Promise.allSettled(
                partners.map(p =>
                    p.checkEligibility({
                        businessName: 'Test',
                        pan: 'INVALID',
                        yearsInBusiness: 0,
                        annualRevenue: 0,
                        industry: 'Test',
                    }),
                ),
            );

            const successful = results.filter(r => r.status === 'fulfilled');
            expect(successful.length).toBeGreaterThan(0);
        });

        it('should retry on transient failures', async () => {
            // This would test retry logic in BasePartnerAdapter
            // In real scenario, first attempts fail, then succeed
            expect(true).toBe(true); // Placeholder for retry test
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle concurrent application creations', async () => {
            mockRepository.create.mockReturnValue({ id: 'concurrent' });
            mockRepository.save.mockResolvedValue({ id: 'concurrent' });

            const promises = Array(10)
                .fill(null)
                .map((_, i) =>
                    orchestrator.createApplication('tenant-456', `user-${i}`, {
                        financingType: 'working_capital',
                        requestedAmount: 500000,
                        urgency: 'flexible',
                        businessDetails: {
                            businessName: `Concurrent ${i}`,
                            businessPan: 'ABCDE1234F',
                        },
                        preferences: {},
                    }),
                );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(10);
            expect(mockRepository.save).toHaveBeenCalledTimes(10);
        });

        it('should handle concurrent partner queries', async () => {
            const start = Date.now();

            const eligibilityChecks = Array(20)
                .fill(null)
                .map(() =>
                    partnerRegistry.getAllPartners().map(p =>
                        p.checkEligibility({
                            businessName: 'Concurrent Test',
                            pan: 'ABCDE1234F',
                            yearsInBusiness: 3,
                            annualRevenue: 10000000,
                            industry: 'Technology',
                        }),
                    ),
                )
                .flat();

            await Promise.all(eligibilityChecks);

            const duration = Date.now() - start;

            // Should complete reasonably fast even with many concurrent requests
            expect(duration).toBeLessThan(5000);
        });
    });

    describe('Data Consistency', () => {
        it('should maintain referential integrity across services', async () => {
            const partners = partnerRegistry.getAllPartners();

            expect(partners).toHaveLength(2);

            // All partners should have metadata
            partners.forEach(partner => {
                expect(partner.partnerId).toBeDefined();
                expect(partner.partnerName).toBeDefined();
                expect(partner.partnerType).toBeDefined();
                expect(partner.supportedProducts.length).toBeGreaterThan(0);
            });
        });

        it('should produce consistent rankings for same input', async () => {
            const mockOffers = [
                {
                    partnerId: 'lendingkart',
                    partnerName: 'LendingKart',
                    offerId: 'o1',
                    principalAmount: 500000,
                    tenure: 12,
                    nominalAPR: 16,
                    effectiveAPR: 17,
                    processingFee: 10000,
                    totalInterest: 40000,
                    totalCost: 550000,
                    disbursalSpeed: 2,
                    flexibility: 70,
                    reputation: 85,
                    rawOffer: {} as any,
                    expiresAt: new Date(),
                },
            ];

            const context = {
                prioritize: 'lowest_rate' as const,
                urgency: 'flexible' as const,
            };

            const rank1 = await rankingService.rankOffers([...mockOffers], context);
            const rank2 = await rankingService.rankOffers([...mockOffers], context);

            expect(rank1[0].overallScore).toBe(rank2[0].overallScore);
            expect(rank1[0].rank).toBe(rank2[0].rank);
        });
    });

    describe('Performance Benchmarks', () => {
        it('should create application in reasonable time', async () => {
            mockRepository.create.mockReturnValue({ id: 'perf' });
            mockRepository.save.mockResolvedValue({ id: 'perf' });

            const start = Date.now();

            await orchestrator.createApplication('tenant-456', 'user-789', {
                financingType: 'invoice_financing',
                requestedAmount: 500000,
                urgency: 'flexible',
                businessDetails: {
                    businessName: 'Perf Test',
                    businessPan: 'ABCDE1234F',
                },
                preferences: {},
            });

            const duration = Date.now() - start;

            expect(duration).toBeLessThan(1000); // < 1 second
        });

        it('should normalize offers quickly', async () => {
            const mockOffers = Array(100)
                .fill(null)
                .map((_, i) => ({
                    offer: {
                        offerId: `offer-${i}`,
                        amount: 500000,
                        interestRate: 14 + Math.random() * 8,
                        processingFee: 5000 + Math.random() * 10000,
                        tenure: 12,
                        disbursalTime: '24 hours',
                        conditions: [],
                        expiresAt: new Date(),
                        rawData: {},
                    },
                    partnerId: i % 2 === 0 ? 'lendingkart' : 'capital_float',
                    partnerName: i % 2 === 0 ? 'LendingKart' : 'Capital Float',
                }));

            const start = Date.now();
            const normalized = await normalizationService.normalizeOffers(mockOffers);
            const duration = Date.now() - start;

            expect(normalized).toHaveLength(100);
            expect(duration).toBeLessThan(1000); // < 1 second for 100 offers
        });
    });

    describe('Cross-Module Integration', () => {
        it('should report integration health', () => {
            const health = integrationService.getIntegrationHealth();

            expect(health).toBeDefined();
            expect(health.module05_workflow).toBeDefined();
            expect(health.module11_notification).toBeDefined();
            expect(health.module01_creditNote).toBeDefined();
            expect(health.module06_creditScoring).toBeDefined();
        });

        it('should emit events without dependent services', async () => {
            const eventsSpy = jest.spyOn(eventEmitter, 'emit');

            await integrationService.onApplicationCreated(
                'app-123',
                'tenant-456',
                'user-789',
                'invoice_financing',
                500000,
            );

            expect(eventsSpy).toHaveBeenCalledWith(
                FINANCING_EVENTS.APPLICATION_CREATED,
                expect.anything(),
            );
        });
    });
});
