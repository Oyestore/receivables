import { DynamicPricingService } from '../code/services/dynamic-pricing.service';

describe('DynamicPricingService', () => {
    let pricingService: DynamicPricingService;
    let mockPool: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPool = {
            query: jest.fn(),
        };

        jest.spyOn(require('../../../Module_11_Common/code/database/database.service'), 'databaseService').mockReturnValue({
            getPool: () => mockPool,
        });

        pricingService = new DynamicPricingService();
    });

    describe('createModel', () => {
        it('should create a pricing model', async () => {
            const modelData = {
                modelName: 'Pro Plan',
                modelType: 'base' as const,
                basePrice: 99.99,
                currency: 'USD',
                description: 'Professional plan',
            };

            mockPool.query.mockResolvedValue({
                rows: [{
                    id: 'model-123',
                    model_name: modelData.modelName,
                    model_type: modelData.modelType,
                    base_price: modelData.basePrice,
                    currency: modelData.currency,
                    description: modelData.description,
                    is_active: true,
                    created_at: new Date(),
                    updated_at: new Date(),
                }],
            });

            const result = await pricingService.createModel(modelData, 'user-123');

            expect(result.modelName).toBe('Pro Plan');
            expect(result.basePrice).toBe(99.99);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO pricing_models'),
                expect.arrayContaining([modelData.modelName, modelData.modelType, modelData.basePrice])
            );
        });
    });

    describe('calculatePrice', () => {
        it('should calculate base price without discounts', async () => {
            const request = {
                modelId: 'model-123',
            };

            // Mock model query
            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'model-123',
                        model_name: 'Pro Plan',
                        model_type: 'base',
                        base_price: 100.00,
                        currency: 'USD',
                        is_active: true,
                    }],
                })
                .mockResolvedValueOnce({ rows: [] }) // No experiment
                .mockResolvedValueOnce({ rows: [] }); // No discounts

            const result = await pricingService.calculatePrice(request);

            expect(result.basePrice).toBe(100.00);
            expect(result.finalPrice).toBe(100.00);
            expect(result.discounts).toHaveLength(0);
            expect(result.currency).toBe('USD');
        });

        it('should apply volume-based tier pricing', async () => {
            const request = {
                modelId: 'model-123',
                volume: 100,
            };

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'model-123',
                        base_price: 100.00,
                        currency: 'USD',
                        is_active: true,
                    }],
                })
                .mockResolvedValueOnce({ rows: [] }) // No experiment
                .mockResolvedValueOnce({ rows: [{ unit_price: 90.00 }] }) // Tier pricing
                .mockResolvedValueOnce({ rows: [] }); // No discounts

            const result = await pricingService.calculatePrice(request);

            expect(result.basePrice).toBe(90.00);
            expect(result.finalPrice).toBe(90.00);
        });

        it('should apply percentage discount', async () => {
            const request = {
                modelId: 'model-123',
                discountCodes: ['PROMO20'],
            };

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'model-123',
                        base_price: 100.00,
                        currency: 'USD',
                    }],
                })
                .mockResolvedValueOnce({ rows: [] }) // No experiment
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'discount-1',
                        rule_name: 'PROMO20',
                        rule_type: 'promotional',
                        discount_percentage: 20,
                        is_active: true,
                    }],
                })
                .mockResolvedValueOnce({ rows: [] }); // Update discount usage

            const result = await pricingService.calculatePrice(request);

            expect(result.basePrice).toBe(100.00);
            expect(result.discounts).toHaveLength(1);
            expect(result.discounts[0].amount).toBe(20.00);
            expect(result.finalPrice).toBe(80.00);
        });

        it('should apply regional pricing multiplier', async () => {
            const request = {
                modelId: 'model-123',
                region: 'EU',
            };

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'model-123',
                        base_price: 100.00,
                        currency: 'USD',
                    }],
                })
                .mockResolvedValueOnce({ rows: [] }) // No experiment
                .mockResolvedValueOnce({ rows: [{ base_price_multiplier: 1.20 }] }) // Regional pricing
                .mockResolvedValueOnce({ rows: [] }) // No discounts
                .mockResolvedValueOnce({ rows: [{ tax_rate: 20 }] }); // Tax

            const result = await pricingService.calculatePrice(request);

            expect(result.basePrice).toBe(120.00); // 100 * 1.20
            expect(result.taxAmount).toBeGreaterThan(0);
            expect(result.totalPrice).toBe(result.finalPrice + result.taxAmount);
        });
    });

    describe('getPriceRecommendation', () => {
        it('should generate ML-based price recommendation', async () => {
            const modelId = 'model-123';

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: modelId,
                        base_price: 100.00,
                        currency: 'USD',
                    }],
                })
                .mockResolvedValueOnce({
                    rows: [
                        { revenue: 10000, conversions: 50, price_elasticity: 0.3 },
                        { revenue: 11000, conversions: 55, price_elasticity: 0.35 },
                    ],
                })
                .mockResolvedValueOnce({
                    rows: [{ id: 'rec-123', recommended_price: 110.00 }],
                });

            const result = await pricingService.getPriceRecommendation(modelId);

            expect(result).not.toBeNull();
            expect(result?.recommendedPrice).toBeGreaterThan(0);
            expect(result?.confidenceScore).toBeGreaterThanOrEqual(0);
            expect(result?.confidenceScore).toBeLessThanOrEqual(1);
        });

        it('should return null if insufficient data', async () => {
            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'model-123',
                        base_price: 100.00,
                    }],
                })
                .mockResolvedValueOnce({ rows: [] }); // No analytics

            const result = await pricingService.getPriceRecommendation('model-123');

            expect(result).toBeNull();
        });
    });

    describe('createExperiment', () => {
        it('should create A/B pricing experiment', async () => {
            const experimentData = {
                experimentName: 'Price Test 1',
                controlModelId: 'model-control',
                variantModelId: 'model-variant',
                trafficSplit: 50,
                startDate: new Date(),
                hypothesis: 'Higher price will increase revenue',
            };

            // Mock model validation
            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ id: 'model-control' }],
                })
                .mockResolvedValueOnce({
                    rows: [{ id: 'model-variant' }],
                })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'exp-123',
                        experiment_name: experimentData.experimentName,
                        control_model_id: experimentData.controlModelId,
                        variant_model_id: experimentData.variantModelId,
                        traffic_split: experimentData.trafficSplit,
                        start_date: experimentData.startDate,
                        status: 'draft',
                    }],
                });

            const result = await pricingService.createExperiment(experimentData, 'user-123');

            expect(result.experimentName).toBe('Price Test 1');
            expect(result.status).toBe('draft');
            expect(result.trafficSplit).toBe(50);
        });

        it('should throw error if control and variant are same', async () => {
            const experimentData = {
                experimentName: 'Invalid Test',
                controlModelId: 'model-same',
                variantModelId: 'model-same',
                startDate: new Date(),
            };

            await expect(
                pricingService.createExperiment(experimentData, 'user-123')
            ).rejects.toThrow('Control and variant models must be different');
        });
    });

    describe('assignTenantToExperiment', () => {
        it('should assign tenant to variant based on traffic split', async () => {
            const tenantId = 'tenant-123';
            const experimentId = 'exp-456';

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: experimentId,
                        control_model_id: 'model-control',
                        variant_model_id: 'model-variant',
                        traffic_split: 50,
                        status: 'running',
                    }],
                })
                .mockResolvedValueOnce({ rows: [] }) // Not already assigned
                .mockResolvedValueOnce({ rows: [] }); // Insert assignment

            const variant = await pricingService.assignTenantToExperiment(tenantId, experimentId);

            expect(['control', 'variant']).toContain(variant);
        });

        it('should return existing assignment if already assigned', async () => {
            const tenantId = 'tenant-123';
            const experimentId = 'exp-456';

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: experimentId,
                        status: 'running',
                        traffic_split: 50,
                    }],
                })
                .mockResolvedValueOnce({
                    rows: [{ assigned_variant: 'variant' }],
                });

            const variant = await pricingService.assignTenantToExperiment(tenantId, experimentId);

            expect(variant).toBe('variant');
        });
    });

    describe('calculateExperimentResults', () => {
        it('should calculate results with winner determination', async () => {
            const experimentId = 'exp-123';

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: experimentId,
                        control_model_id: 'model-control',
                        variant_model_id: 'model-variant',
                        status: 'running',
                    }],
                })
                .mockResolvedValueOnce({
                    rows: [{
                        total_revenue: 10000,
                        total_conversions: 100,
                    }],
                })
                .mockResolvedValueOnce({
                    rows: [{
                        total_revenue: 15000,
                        total_conversions: 120,
                    }],
                })
                .mockResolvedValueOnce({ rows: [] }); // Update experiment

            const results = await pricingService.calculateExperimentResults(experimentId);

            expect(results).toHaveProperty('winner');
            expect(results).toHaveProperty('controlRevenue');
            expect(results).toHaveProperty('variantRevenue');
            expect(results).toHaveProperty('confidenceLevel');
            expect(['control', 'variant', 'inconclusive']).toContain(results.winner);
        });
    });
});
