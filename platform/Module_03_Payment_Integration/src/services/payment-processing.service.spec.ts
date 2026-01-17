import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProcessingService } from '../services/payment-processing.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentTransaction, TransactionStatus, TransactionType } from '../entities/payment-transaction.entity';
import { PaymentGatewayFactory } from '../services/payment-gateway-factory.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

describe('PaymentProcessingService', () => {
    let service: PaymentProcessingService;
    let repositoryMock: any;
    let gatewayFactoryMock: any;
    let eventEmitterMock: any;
    let configServiceMock: any;

    beforeEach(async () => {
        repositoryMock = {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
        };

        gatewayFactoryMock = {
            getGateway: jest.fn(),
        };

        eventEmitterMock = {
            emit: jest.fn(),
        };

        configServiceMock = {
            get: jest.fn((key) => {
                if (key === 'PAYMENT_CURRENCY') return 'INR';
                return null;
            })
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentProcessingService,
                {
                    provide: getRepositoryToken(PaymentTransaction),
                    useValue: repositoryMock,
                },
                {
                    provide: PaymentGatewayFactory,
                    useValue: gatewayFactoryMock,
                },
                {
                    provide: EventEmitter2,
                    useValue: eventEmitterMock,
                },
                {
                    provide: ConfigService,
                    useValue: configServiceMock
                }
            ],
        }).compile();

        service = module.get<PaymentProcessingService>(PaymentProcessingService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('initiatePayment', () => {
        it('should initiate a payment successfully', async () => {
            const mockTransaction = {
                id: 'txn-123',
                transactionReference: 'REF123',
                status: TransactionStatus.PENDING,
            };

            repositoryMock.create.mockReturnValue(mockTransaction);
            repositoryMock.save.mockResolvedValue(mockTransaction);
            gatewayFactoryMock.getGateway.mockReturnValue({
                initiatePayment: jest.fn().mockResolvedValue({
                    transactionId: 'gateway-txn-123',
                    paymentUrl: 'http://test-gateway.com/pay',
                }),
            });

            const result = await service.initiatePayment(
                'org-1',
                'method-1',
                1000,
                'INR'
            );

            expect(result).toBeDefined();
            expect(result.transaction).toEqual(mockTransaction);
            expect(repositoryMock.save).toHaveBeenCalled();
            expect(eventEmitterMock.emit).toHaveBeenCalledWith(
                'payment.initiated',
                expect.anything()
            );
        });
    });
});
