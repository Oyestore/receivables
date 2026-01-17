import { Test, TestingModule } from '@nestjs/testing';
import { PortalController } from '../portal.controller';
import { StaticPortalService } from '../../services/static-portal.service';
import { UnauthorizedException } from '@nestjs/common';

const mockPortalService = {
    validateSession: jest.fn(),
    initiatePayment: jest.fn(),
    raiseDispute: jest.fn()
};

describe('PortalController', () => {
    let controller: PortalController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PortalController],
            providers: [
                { provide: StaticPortalService, useValue: mockPortalService }
            ]
        }).compile();

        controller = module.get<PortalController>(PortalController);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Dashboard Access', () => {
        it('should return dashboard data for valid token', async () => {
            const mockSession = { invoiceId: 'INV_1', customerName: 'John' };
            mockPortalService.validateSession.mockResolvedValue(mockSession);

            const result = await controller.getDashboard('valid-token');
            expect(result).toBe(mockSession);
        });

        it('should return 401 for invalid token', async () => {
            mockPortalService.validateSession.mockRejectedValue(new UnauthorizedException());
            await expect(controller.getDashboard('bad-token')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('Pay Invoice', () => {
        it('should return payment link', async () => {
            const mockPayment = { url: 'https://pay.com' };
            mockPortalService.initiatePayment.mockResolvedValue(mockPayment);

            const result = await controller.payInvoice(
                'token',
                { amount: 100, method: 'UPI' }
            );

            expect(result).toBe(mockPayment);
            expect(mockPortalService.initiatePayment).toHaveBeenCalledWith('token', 100, 'UPI');
        });
    });

    describe('Raise Dispute', () => {
        it('should create dispute ticket', async () => {
            const mockTicket = { id: 'TICKET_1' };
            mockPortalService.raiseDispute.mockResolvedValue(mockTicket);

            const result = await controller.raiseDispute(
                'token',
                { reason: 'Wrong', priority: 'High' }
            );

            expect(result).toBe(mockTicket);
        });
    });
});
