"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const payment_processing_service_1 = require("../services/payment-processing.service");
const typeorm_1 = require("@nestjs/typeorm");
const payment_transaction_entity_1 = require("../entities/payment-transaction.entity");
const payment_gateway_factory_service_1 = require("../services/payment-gateway-factory.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const config_1 = require("@nestjs/config");
describe('PaymentProcessingService', () => {
    let service;
    let repositoryMock;
    let gatewayFactoryMock;
    let eventEmitterMock;
    let configServiceMock;
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
                if (key === 'PAYMENT_CURRENCY')
                    return 'INR';
                return null;
            })
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                payment_processing_service_1.PaymentProcessingService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(payment_transaction_entity_1.PaymentTransaction),
                    useValue: repositoryMock,
                },
                {
                    provide: payment_gateway_factory_service_1.PaymentGatewayFactory,
                    useValue: gatewayFactoryMock,
                },
                {
                    provide: event_emitter_1.EventEmitter2,
                    useValue: eventEmitterMock,
                },
                {
                    provide: config_1.ConfigService,
                    useValue: configServiceMock
                }
            ],
        }).compile();
        service = module.get(payment_processing_service_1.PaymentProcessingService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('initiatePayment', () => {
        it('should initiate a payment successfully', async () => {
            const mockTransaction = {
                id: 'txn-123',
                transactionReference: 'REF123',
                status: payment_transaction_entity_1.TransactionStatus.PENDING,
            };
            repositoryMock.create.mockReturnValue(mockTransaction);
            repositoryMock.save.mockResolvedValue(mockTransaction);
            gatewayFactoryMock.getGateway.mockReturnValue({
                initiatePayment: jest.fn().mockResolvedValue({
                    transactionId: 'gateway-txn-123',
                    paymentUrl: 'http://test-gateway.com/pay',
                }),
            });
            const result = await service.initiatePayment('org-1', 'method-1', 1000, 'INR');
            expect(result).toBeDefined();
            expect(result.transaction).toEqual(mockTransaction);
            expect(repositoryMock.save).toHaveBeenCalled();
            expect(eventEmitterMock.emit).toHaveBeenCalledWith('payment.initiated', expect.anything());
        });
    });
});
//# sourceMappingURL=payment-processing.service.spec.js.map