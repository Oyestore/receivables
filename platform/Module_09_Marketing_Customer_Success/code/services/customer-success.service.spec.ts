import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomerSuccessService } from './customer-success.service';
import { CustomerHealth } from '../entities/customer-health.entity';
import { Repository } from 'typeorm';

const mockHealthRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
};

describe('CustomerSuccessService', () => {
    let service: CustomerSuccessService;
    let repository: Repository<CustomerHealth>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerSuccessService,
                {
                    provide: getRepositoryToken(CustomerHealth),
                    useValue: mockHealthRepository,
                },
            ],
        }).compile();

        service = module.get<CustomerSuccessService>(CustomerSuccessService);
        repository = module.get<Repository<CustomerHealth>>(getRepositoryToken(CustomerHealth));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('calculateHealthScore', () => {
        it('should calculate health score for new customer', async () => {
            const customerId = 'cust-1';
            const metrics = {
                loginCount: 10, // 50 pts
                invoiceCount: 20, // 40 pts
                paymentDelayDays: 0, // 100 pts
                supportTickets: 0, // 100 pts
            };

            // Engagement: 50, Usage: 40, Payment: 100, Support: 100
            // Overall: (50*0.3) + (40*0.3) + (100*0.3) + (100*0.1)
            // = 15 + 12 + 30 + 10 = 67

            mockHealthRepository.findOne.mockResolvedValue(null);
            mockHealthRepository.create.mockReturnValue({ customerId });
            mockHealthRepository.save.mockImplementation((health) => Promise.resolve(health));

            const result = await service.calculateHealthScore(customerId, metrics);

            expect(result.overallScore).toBe(67);
            expect(result.engagementScore).toBe(50);
        });

        it('should identify risk factors', async () => {
            const customerId = 'cust-2';
            const metrics = {
                loginCount: 1, // 5 pts (Low Engagement)
                invoiceCount: 5, // 10 pts
                paymentDelayDays: 20, // 40 pts (Payment Delays)
                supportTickets: 5, // 50 pts
            };

            mockHealthRepository.findOne.mockResolvedValue(null);
            mockHealthRepository.create.mockReturnValue({ customerId });
            mockHealthRepository.save.mockImplementation((health) => Promise.resolve(health));

            const result = await service.calculateHealthScore(customerId, metrics);

            expect(result.riskFactors).toContain('Low Engagement');
            expect(result.riskFactors).toContain('Payment Delays');
        });
    });
});
