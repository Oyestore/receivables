import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreditLimitService } from './credit-limit.service';
import { CreditLimit } from './credit-limit.entity';
import { BuyerProfile } from './buyer-profile.entity';

describe('CreditLimitService', () => {
    let service: CreditLimitService;
    let limitRepo: Repository<CreditLimit>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreditLimitService,
                {
                    provide: getRepositoryToken(CreditLimit),
                    useValue: {
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

        service = module.get<CreditLimitService>(CreditLimitService);
        limitRepo = module.get<Repository<CreditLimit>>(getRepositoryToken(CreditLimit));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('calculateLimit', () => {
        it('should calculate limit based on revenue and risk', async () => {
            const mockBuyer = {
                annualRevenue: 50000000,
                creditScore: 780,
                riskLevel: 'LOW',
            };

            const limit = await (service as any).calculateLimit(mockBuyer);

            expect(limit).toBeGreaterThan(0);
            expect(limit).toBeLessThanOrEqual(mockBuyer.annualRevenue * 0.3);
        });

        it('should apply conservative limit for high risk', async () => {
            const mockBuyer = {
                annualRevenue: 50000000,
                creditScore: 450,
                riskLevel: 'HIGH',
            };

            const limit = await (service as any).calculateLimit(mockBuyer);

            expect(limit).toBeLessThan(mockBuyer.annualRevenue * 0.1);
        });
    });

    describe('utilization monitoring', () => {
        it('should flag high utilization', () => {
            const utilization = 95;
            const flagged = (service as any).checkUtilization(utilization);

            expect(flagged).toBe(true);
        });

        it('should not flag normal utilization', () => {
            const utilization = 60;
            const flagged = (service as any).checkUtilization(utilization);

            expect(flagged).toBe(false);
        });
    });
});
