
import { Test, TestingModule } from '@nestjs/testing';
import { IndiaMarketService } from '../../code/services/india-market.service';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';

/**
 * Deterministic Harness for India Market Service (Module 08)
 * 
 * Scenarios:
 * 1. GST Calculation (Intra vs Inter State)
 * 2. Validation Logic (Language, UPI)
 * 3. GSTIN Format Validation (via public flow or mocked internal)
 */
describe('India Market Service Harness', () => {
    let service: IndiaMarketService;

    const mockPool = {
        connect: jest.fn(),
        query: jest.fn(),
    };

    let module: TestingModule;

    beforeAll(async () => {
        // Mock database service before service instantiation if possible
        jest.spyOn(databaseService, 'getPool').mockReturnValue(mockPool as any);

        module = await Test.createTestingModule({
            providers: [IndiaMarketService],
        }).compile();

        service = module.get<IndiaMarketService>(IndiaMarketService);
    });

    afterAll(async () => {
        if (module) {
            await module.close();
        }
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GST Calculation', () => {
        it('should calculate Intra-State GST (CGST + SGST)', async () => {
            const amount = 1000;
            const rate = 0.18; // 18%
            const result = await service.calculateGST(amount, rate, 'INTRA_STATE');

            // 180 total tax -> 90 CGST, 90 SGST
            expect(result.cgst).toBe(90);
            expect(result.sgst).toBe(90);
            expect(result.igst).toBe(0);
            expect(result.total_tax).toBe(180);
        });

        it('should calculate Inter-State GST (IGST)', async () => {
            const amount = 1000;
            const rate = 0.18;
            const result = await service.calculateGST(amount, rate, 'INTER_STATE');

            expect(result.cgst).toBe(0);
            expect(result.sgst).toBe(0);
            expect(result.igst).toBe(180);
            expect(result.total_tax).toBe(180);
        });
    });

    describe('Validations', () => {
        it('should validate supported languages', () => {
            expect(service.isSupportedLanguage('en')).toBe(true);
            expect(service.isSupportedLanguage('hi')).toBe(true);
            expect(service.isSupportedLanguage('fr')).toBe(false); // French not supported in this list
        });

        it('should validate supported UPI providers', () => {
            expect(service.isSupportedUPIProvider('GooglePay')).toBe(true);
            expect(service.isSupportedUPIProvider('UnknownPay')).toBe(false);
        });
    });

    describe('Translation Mock', () => {
        it('should return mock translation for supported language', async () => {
            const result = await service.translate('Hello', 'hi');
            expect(result.translated).toBe('[hi] Hello');
        });

        it('should throw error for unsupported language', async () => {
            await expect(service.translate('Hello', 'xx')).rejects.toThrow('Unsupported language');
        });
    });
});
