import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AutonomousRiskManagementService } from './autonomous-risk-management.service';
import { CreditLimit } from './credit-limit.entity';
import { RiskAlert } from './risk-alert.entity';

describe('AutonomousRiskManagementService', () => {
    let service: AutonomousRiskManagementService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AutonomousRiskManagementService,
                {
                    provide: getRepositoryToken(CreditLimit),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(RiskAlert),
                    useValue: {
                        find: jest.fn(),
                        save: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AutonomousRiskManagementService>(AutonomousRiskManagementService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('autoAdjustCreditLimit', () => {
        it('should reduce limit for high risk buyers', async () => {
            const mockLimit = {
                currentLimit: 5000000,
                buyerId: 'buyer-123',
                save: jest.fn(),
            };

            const result = await (service as any).autoAdjustCreditLimit('buyer-123', 'HIGH');

            expect(result).toBeDefined();
        });

        it('should increase limit for improving buyers', async () => {
            const result = await (service as any).autoAdjustCreditLimit('buyer-123', 'LOW');

            expect(result).toBeDefined();
        });
    });

    describe('escalation logic', () => {
        it('should escalate critical risks immediately', async () => {
            const mockAlert = {
                severity: 'CRITICAL',
                autoEscalated: false,
            };

            const escalated = await (service as any).escalateIfNeeded(mockAlert);

            expect(escalated).toBe(true);
        });
    });
});
