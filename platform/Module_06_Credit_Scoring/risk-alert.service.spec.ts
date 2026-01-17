import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RiskAlertService } from './risk-alert.service';
import { RiskAlert } from './risk-alert.entity';

describe('RiskAlertService', () => {
    let service: RiskAlertService;
    let alertRepo: Repository<RiskAlert>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RiskAlertService,
                {
                    provide: getRepositoryToken(RiskAlert),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        save: jest.fn(),
                        create: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<RiskAlertService>(RiskAlertService);
        alertRepo = module.get<Repository<RiskAlert>>(getRepositoryToken(RiskAlert));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAlert', () => {
        it('should create high priority alert', async () => {
            const mockAlert = {
                type: 'PAYMENT_DEFAULT',
                severity: 'HIGH',
                buyerId: 'buyer-123',
            };

            jest.spyOn(alertRepo, 'save').mockResolvedValue(mockAlert as any);

            const result = await service.createAlert(mockAlert);

            expect(result).toBeDefined();
            expect(alertRepo.save).toHaveBeenCalled();
        });
    });

    describe('alert deduplication', () => {
        it('should not create duplicate alerts', async () => {
            const existingAlert = {
                type: 'PAYMENT_DEFAULT',
                buyerId: 'buyer-123',
                resolved: false,
            };

            jest.spyOn(alertRepo, 'findOne').mockResolvedValue(existingAlert as any);

            const created = await (service as any).shouldCreateAlert('PAYMENT_DEFAULT', 'buyer-123');

            expect(created).toBe(false);
        });
    });

    describe('alert priority', () => {
        it('should prioritize critical alerts', () => {
            const alerts = [
                { severity: 'LOW', priority: 1 },
                { severity: 'CRITICAL', priority: 5 },
                { severity: 'MEDIUM', priority: 2 },
            ];

            const sorted = (service as any).prioritizeAlerts(alerts);

            expect(sorted[0].severity).toBe('CRITICAL');
        });
    });
});
