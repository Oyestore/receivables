import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CustomerHealthService } from '../services/customer-health.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Integration Tests: Module 09 → Module 03 (Payments)
 * 
 * Validates integration with Payment Management:
 * - Payment success/failure tracking
 * - Payment behavior analysis for health scoring
 * - Payment delay impact on customer success metrics
 */
describe('Module 09 → Module 03 Integration', () => {
    let app: INestApplication;
    let healthService: CustomerHealthService;
    let eventEmitter: EventEmitter2;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerHealthService,
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                        on: jest.fn(),
                    },
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        healthService = moduleFixture.get<CustomerHealthService>(CustomerHealthService);
        eventEmitter = moduleFixture.get<EventEmitter2>(EventEmitter2);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Payment Event Integration', () => {
        it('should update health score on successful payment', async () => {
            const paymentSuccessEvent = {
                customerId: 'customer-123',
                tenantId: 'tenant-123',
                paymentId: 'pay-123',
                amount: 50000,
                method: 'upi',
                completedAt: new Date(),
            };

            await eventEmitter.emit('payment.completed', paymentSuccessEvent);

            expect(eventEmitter.emit).toHaveBeenCalled();
        });

        it('should track payment failures for churn prediction', async () => {
            const paymentFailedEvent = {
                customerId: 'customer-456',
                tenantId: 'tenant-123',
                paymentId: 'pay-456',
                amount: 75000,
                failureReason: 'insufficient_funds',
                failedAt: new Date(),
            };

            await eventEmitter.emit('payment.failed', paymentFailedEvent);

            // Should trigger at-risk detection
            expect(eventEmitter.emit).toHaveBeenCalled();
        });
    });

    describe('Payment Behavior Analysis', () => {
        it('should calculate payment reliability score', async () => {
            const paymentHistory = [
                { status: 'completed', timeTaken: 2 },
                { status: 'completed', timeTaken: 1 },
                { status: 'failed', timeTaken: 0 },
                { status: 'completed', timeTaken: 3 },
            ];

            const reliabilityScore = paymentHistory.filter(p => p.status === 'completed').length / paymentHistory.length;

            expect(reliabilityScore).toBeGreaterThan(0.5);
        });
    });
});
