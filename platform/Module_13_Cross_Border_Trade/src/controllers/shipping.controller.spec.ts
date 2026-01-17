import { Test, TestingModule } from '@nestjs/testing';
import { ShippingController } from '../controllers/shipping.controller';
import { ShippingService } from '../services/shipping.service';
import { TestFixtures } from '../../test/fixtures';

describe('ShippingController', () => {
    let controller: ShippingController;
    let shippingService: Partial<ShippingService>;

    beforeEach(async () => {
        shippingService = {
            createShippingOrder: jest.fn(),
            trackShipment: jest.fn(),
            getShippingById: jest.fn(),
            getDelayedShipments: jest.fn(),
            calculateShippingRates: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ShippingController],
            providers: [{ provide: ShippingService, useValue: shippingService }],
        }).compile();

        controller = module.get<ShippingController>(ShippingController);
    });

    describe('POST /shipping', () => {
        it('should create shipping order', async () => {
            const mockOrder = TestFixtures.createMockShippingOrder();
            (shippingService.createShippingOrder as jest.Mock).mockResolvedValue(mockOrder);

            const result = await controller.createShippingOrder(
                { carrier: 'DHL', origin: 'Dubai', destination: 'NYC', packageDetails: {}, estimatedDelivery: new Date() },
                { user: { id: 'user-1' } } as any
            );

            expect(result.trackingNumber).toBeDefined();
        });
    });

    describe('POST /shipping/track', () => {
        it('should track shipment', async () => {
            const mockOrder = TestFixtures.createMockShippingOrder({ status: 'in_transit' });
            (shippingService.trackShipment as jest.Mock).mockResolvedValue(mockOrder);

            const result = await controller.trackShipment({ trackingNumber: 'TRACK-001' });

            expect(result.status).toBe('in_transit');
        });
    });

    describe('GET /shipping/:id', () => {
        it('should get shipping details', async () => {
            const mockOrder = TestFixtures.createMockShippingOrder();
            (shippingService.getShippingById as jest.Mock).mockResolvedValue(mockOrder);

            const result = await controller.getShippingById('1');

            expect(result).toEqual(mockOrder);
        });
    });

    describe('GET /shipping/delayed', () => {
        it('should get delayed shipments', async () => {
            const mockDelayed = [TestFixtures.createMockShippingOrder()];
            (shippingService.getDelayedShipments as jest.Mock).mockResolvedValue(mockDelayed);

            const result = await controller.getDelayedShipments();

            expect(result).toHaveLength(1);
        });
    });

    describe('POST /shipping/rates', () => {
        it('should calculate shipping rates', async () => {
            const mockRates = [{ carrier: 'DHL', cost: 150, serviceLevel: 'standard' }];
            (shippingService.calculateShippingRates as jest.Mock).mockResolvedValue(mockRates);

            const result = await controller.calculateRates({
                origin: 'Dubai',
                destination: 'NYC',
                weight: 10,
                dimensions: '10x10x10',
            });

            expect(result).toHaveLength(1);
        });
    });
});
