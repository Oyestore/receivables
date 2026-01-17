import { Test, TestingModule } from '@nestjs/testing';
import { DynamicTermsManagementService } from './dynamic-terms-management.service';

describe('DynamicTermsManagementService', () => {
    let service: DynamicTermsManagementService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DynamicTermsManagementService],
        }).compile();

        service = module.get<DynamicTermsManagementService>(DynamicTermsManagementService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('calculateDynamicTerms', () => {
        it('should offer favorable terms for low risk buyers', async () => {
            const terms = await service.calculateTerms('buyer-123', 'LOW', 850);

            expect(terms.paymentDays).toBeGreaterThanOrEqual(45);
            expect(terms.interestRate).toBeLessThan(2);
        });

        it('should offer conservative terms for high risk buyers', async () => {
            const terms = await service.calculateTerms('buyer-123', 'HIGH', 450);

            expect(terms.paymentDays).toBeLessThanOrEqual(30);
            expect(terms.interestRate).toBeGreaterThan(3);
        });
    });

    describe('early payment discounts', () => {
        it('should calculate discount for early payment', () => {
            const discount = (service as any).calculateEarlyPaymentDiscount(30, 15);

            expect(discount).toBeGreaterThan(0);
            expect(discount).toBeLessThanOrEqual(5);
        });
    });

    describe('risk-based pricing', () => {
        it('should adjust pricing based on risk score', () => {
            const pricing = (service as any).calculateRiskPricing(750);

            expect(pricing.rate).toBeDefined();
            expect(pricing.discount).toBeDefined();
        });
    });
});
