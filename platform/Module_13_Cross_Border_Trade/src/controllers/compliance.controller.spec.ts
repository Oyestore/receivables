import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceController } from '../controllers/compliance.controller';
import { ComplianceService } from '../services/compliance.service';
import { TestFixtures } from '../../test/fixtures';

describe('ComplianceController', () => {
    let controller: ComplianceController;
    let complianceService: Partial<ComplianceService>;

    beforeEach(async () => {
        complianceService = {
            createComplianceCheck: jest.fn(),
            performComplianceCheck: jest.fn(),
            getPendingChecks: jest.fn(),
            getComplianceAnalytics: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ComplianceController],
            providers: [{ provide: ComplianceService, useValue: complianceService }],
        }).compile();

        controller = module.get<ComplianceController>(ComplianceController);
    });

    describe('POST /compliance/check', () => {
        it('should create compliance check', async () => {
            const mockCheck = TestFixtures.createMockTradeCompliance({ checkStatus: 'pending' });
            (complianceService.createComplianceCheck as jest.Mock).mockResolvedValue(mockCheck);

            const result = await controller.createComplianceCheck({
                transactionId: 'TXN-001',
                buyerCountry: 'AE',
                sellerCountry: 'US',
                goodsDescription: 'Goods',
                hsCode: '123456',
            });

            expect(result.checkStatus).toBe('pending');
        });
    });

    describe('POST /compliance/:id/perform', () => {
        it('should perform compliance check', async () => {
            const mockCheck = TestFixtures.createMockTradeCompliance({ checkStatus: 'approved' });
            (complianceService.performComplianceCheck as jest.Mock).mockResolvedValue(mockCheck);

            const result = await controller.performComplianceCheck('1');

            expect(result.checkStatus).toBe('approved');
        });
    });

    describe('GET /compliance/pending', () => {
        it('should get pending checks', async () => {
            const mockPending = [TestFixtures.createMockTradeCompliance()];
            (complianceService.getPendingChecks as jest.Mock).mockResolvedValue(mockPending);

            const result = await controller.getPendingChecks();

            expect(result).toHaveLength(1);
        });
    });

    describe('GET /compliance/analytics', () => {
        it('should get compliance analytics', async () => {
            const mockAnalytics = { totalChecks: 100, approvalRate: 95 };
            (complianceService.getComplianceAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

            const result = await controller.getComplianceAnalytics();

            expect(result.totalChecks).toBe(100);
        });
    });
});
