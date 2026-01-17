import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingService } from '../services/shipping.service';
import { ShippingOrder } from '../entities/shipping-order.entity';
import { TestFixtures } from '../../test/fixtures';
import { createMockRepository } from '../../test/setup';

describe('ShippingService', () => {
    let service: ShippingService;
    let shippingRepo: Partial<Repository<ShippingOrder>>;

    beforeEach(async () => {
        shippingRepo = createMockRepository<ShippingOrder>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ShippingService,
                {
                    provide: getRepositoryToken(ShippingOrder),
                    useValue: shippingRepo,
                },
            ],
        }).compile();

        service = module.get<ShippingService>(ShippingService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createShippingOrder', () => {
        it('should create shipping order successfully', async () => {
            const request = {
                carrier: 'DHL',
                origin: 'Dubai, UAE',
                destination: 'New York, USA',
                packageDetails: { weight: 10, dimensions: '10x10x10' },
                estimatedDelivery: new Date(),
            };

            const mockOrder = TestFixtures.createMockShippingOrder({
                ...request,
                trackingNumber: 'TRACK-001',
            });

            (shippingRepo.create as jest.Mock).mockReturnValue(mockOrder);
            (shippingRepo.save as jest.Mock).mockResolvedValue(mockOrder);

            const result = await service.createShippingOrder(request, 'test-user');

            expect(result.trackingNumber).toBeDefined();
            expect(result.carrier).toBe('DHL');
            expect(shippingRepo.save).toHaveBeenCalled();
        });

        it('should generate unique tracking number', async () => {
            const request = {
                carrier: 'FedEx',
                origin: 'Dubai',
                destination: 'London',
                packageDetails: {},
                estimatedDelivery: new Date(),
            };

            const mockOrder = TestFixtures.createMockShippingOrder();

            (shippingRepo.create as jest.Mock).mockReturnValue(mockOrder);
            (shippingRepo.save as jest.Mock).mockResolvedValue(mockOrder);

            const result = await service.createShippingOrder(request, 'test-user');

            expect(result.trackingNumber).toMatch(/^TRACK-/);
        });
    });

    describe('trackShipment', () => {
        it('should return tracking information', async () => {
            const mockOrder = TestFixtures.createMockShippingOrder({
                trackingNumber: 'TRACK-001',
                status: 'in_transit',
            });

            (shippingRepo.findOne as jest.Mock).mockResolvedValue(mockOrder);

            const result = await service.trackShipment('TRACK-001');

            expect(result.trackingNumber).toBe('TRACK-001');
            expect(result.status).toBe('in_transit');
        });

        it('should throw error for invalid tracking number', async () => {
            (shippingRepo.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.trackShipment('INVALID')).rejects.toThrow();
        });
    });

    describe('updateShippingStatus', () => {
        it('should update status successfully', async () => {
            const mockOrder = TestFixtures.createMockShippingOrder({
                status: 'pending',
            });

            const updatedOrder = { ...mockOrder, status: 'in_transit' };

            (shippingRepo.findOneBy as jest.Mock).mockResolvedValue(mockOrder);
            (shippingRepo.save as jest.Mock).mockResolvedValue(updatedOrder);

            const result = await service.updateShippingStatus('1', 'in_transit');

            expect(result.status).toBe('in_transit');
        });
    });

    describe('getDelayedShipments', () => {
        it('should return delayed shipments', async () => {
            const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const mockDelayed = [
                TestFixtures.createMockShippingOrder({
                    estimatedDelivery: pastDate,
                    actualDelivery: null,
                }),
            ];

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockDelayed),
            };

            (shippingRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            const result = await service.getDelayedShipments();

            expect(result).toHaveLength(1);
        });
    });

    describe('calculateShippingRates', () => {
        it('should calculate rates for all carriers', async () => {
            const request = {
                origin: 'Dubai, UAE',
                destination: 'New York, USA',
                weight: 10,
                dimensions: '10x10x10',
            };

            const result = await service.calculateShippingRates(request);

            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('carrier');
            expect(result[0]).toHaveProperty('cost');
        });

        it('should include express shipping option', async () => {
            const request = {
                origin: 'Dubai',
                destination: 'London',
                weight: 5,
                dimensions: '5x5x5',
            };

            const result = await service.calculateShippingRates(request);

            const hasExpress = result.some(r => r.serviceLevel === 'express');
            expect(hasExpress).toBe(true);
        });
    });
});
