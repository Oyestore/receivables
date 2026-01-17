import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentProcessingService } from '../services/payment-processing.service';
import { PaymentGatewayFactory } from '../services/payment-gateway-factory.service';
import { PaymentTransaction, TransactionStatus, TransactionType } from '../entities/payment-transaction.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { PaymentGateway } from '../entities/payment-gateway.entity';
import { v4 as uuidv4 } from 'uuid';

describe('PaymentProcessingService', () => {
  let service: PaymentProcessingService;
  let transactionRepository: Repository<PaymentTransaction>;
  let paymentMethodRepository: Repository<PaymentMethod>;
  let gatewayFactory: PaymentGatewayFactory;

  const mockPaymentMethod = {
    id: uuidv4(),
    name: 'Test Credit Card',
    type: 'credit_card',
    isEnabled: true,
    isCustomerBearsFee: false,
    organizationId: uuidv4(),
    gateway: {
      id: uuidv4(),
      name: 'Test Gateway',
      type: 'stripe',
      isEnabled: true,
    },
  };

  const mockGatewayService = {
    initiatePayment: jest.fn(),
    verifyPayment: jest.fn(),
    processRefund: jest.fn(),
    getTransactionFees: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentProcessingService,
        {
          provide: getRepositoryToken(PaymentTransaction),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(PaymentMethod),
          useClass: Repository,
        },
        {
          provide: PaymentGatewayFactory,
          useValue: {
            getGatewayService: jest.fn().mockResolvedValue(mockGatewayService),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentProcessingService>(PaymentProcessingService);
    transactionRepository = module.get<Repository<PaymentTransaction>>(
      getRepositoryToken(PaymentTransaction),
    );
    paymentMethodRepository = module.get<Repository<PaymentMethod>>(
      getRepositoryToken(PaymentMethod),
    );
    gatewayFactory = module.get<PaymentGatewayFactory>(PaymentGatewayFactory);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiatePayment', () => {
    it('should successfully initiate a payment', async () => {
      // Arrange
      const organizationId = uuidv4();
      const paymentMethodId = mockPaymentMethod.id;
      const amount = 100;
      const currency = 'INR';
      const invoiceId = uuidv4();
      const customerInfo = {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890',
      };

      jest.spyOn(paymentMethodRepository, 'findOne').mockResolvedValue(mockPaymentMethod as any);
      
      mockGatewayService.getTransactionFees.mockReturnValue({ percentage: 2.5, fixed: 2 });
      
      mockGatewayService.initiatePayment.mockResolvedValue({
        success: true,
        gatewayTransactionId: 'gw_123456',
        paymentUrl: 'https://test-payment.com/pay',
        paymentToken: 'token_123',
        expiresAt: new Date(Date.now() + 3600000),
      });

      jest.spyOn(transactionRepository, 'save').mockImplementation((entity) => Promise.resolve({
        ...entity,
        id: uuidv4(),
      } as any));

      // Act
      const result = await service.initiatePayment(
        organizationId,
        paymentMethodId,
        amount,
        currency,
        invoiceId,
        customerInfo,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.transaction).toBeDefined();
      expect(result.paymentUrl).toBe('https://test-payment.com/pay');
      expect(result.paymentToken).toBe('token_123');
      expect(paymentMethodRepository.findOne).toHaveBeenCalledWith({
        where: { id: paymentMethodId, organizationId, isEnabled: true },
        relations: ['gateway'],
      });
      expect(mockGatewayService.getTransactionFees).toHaveBeenCalledWith(
        amount,
        currency,
        mockPaymentMethod.type,
      );
      expect(mockGatewayService.initiatePayment).toHaveBeenCalled();
      expect(transactionRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if payment method is not found', async () => {
      // Arrange
      jest.spyOn(paymentMethodRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.initiatePayment(
          uuidv4(),
          uuidv4(),
          100,
          'INR',
        ),
      ).rejects.toThrow('Payment method not found or not enabled');
    });

    it('should handle payment initiation failure', async () => {
      // Arrange
      jest.spyOn(paymentMethodRepository, 'findOne').mockResolvedValue(mockPaymentMethod as any);
      
      mockGatewayService.getTransactionFees.mockReturnValue({ percentage: 2.5, fixed: 2 });
      
      mockGatewayService.initiatePayment.mockResolvedValue({
        success: false,
        error: 'Gateway error',
      });

      jest.spyOn(transactionRepository, 'save').mockImplementation((entity) => Promise.resolve({
        ...entity,
        id: uuidv4(),
      } as any));

      // Act & Assert
      await expect(
        service.initiatePayment(
          uuidv4(),
          mockPaymentMethod.id,
          100,
          'INR',
        ),
      ).rejects.toThrow('Gateway error');
      
      expect(transactionRepository.save).toHaveBeenCalledTimes(2);
      expect(transactionRepository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: TransactionStatus.FAILED,
        }),
      );
    });
  });

  describe('verifyPayment', () => {
    it('should successfully verify a payment', async () => {
      // Arrange
      const transactionId = uuidv4();
      const mockTransaction = {
        id: transactionId,
        status: TransactionStatus.INITIATED,
        paymentMethod: mockPaymentMethod,
        gatewayTransactionId: 'gw_123456',
      };

      jest.spyOn(transactionRepository, 'findOne').mockResolvedValue(mockTransaction as any);
      
      mockGatewayService.verifyPayment.mockResolvedValue({
        success: true,
        status: 'completed',
      });

      jest.spyOn(transactionRepository, 'save').mockImplementation((entity) => Promise.resolve({
        ...entity,
        id: transactionId,
      } as any));

      // Act
      const result = await service.verifyPayment(transactionId);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(TransactionStatus.COMPLETED);
      expect(transactionRepository.findOne).toHaveBeenCalledWith({
        where: { id: transactionId },
        relations: ['paymentMethod', 'paymentMethod.gateway'],
      });
      expect(mockGatewayService.verifyPayment).toHaveBeenCalledWith({
        transactionId,
        gatewayTransactionId: 'gw_123456',
      });
      expect(transactionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TransactionStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
      );
    });

    it('should handle payment verification failure', async () => {
      // Arrange
      const transactionId = uuidv4();
      const mockTransaction = {
        id: transactionId,
        status: TransactionStatus.INITIATED,
        paymentMethod: mockPaymentMethod,
        gatewayTransactionId: 'gw_123456',
      };

      jest.spyOn(transactionRepository, 'findOne').mockResolvedValue(mockTransaction as any);
      
      mockGatewayService.verifyPayment.mockResolvedValue({
        success: false,
        error: 'Payment failed',
      });

      jest.spyOn(transactionRepository, 'save').mockImplementation((entity) => Promise.resolve({
        ...entity,
        id: transactionId,
      } as any));

      // Act
      const result = await service.verifyPayment(transactionId);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(TransactionStatus.FAILED);
      expect(result.failureReason).toBe('Payment failed');
      expect(transactionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TransactionStatus.FAILED,
          failureReason: 'Payment failed',
        }),
      );
    });
  });

  describe('processRefund', () => {
    it('should successfully process a refund', async () => {
      // Arrange
      const transactionId = uuidv4();
      const mockTransaction = {
        id: transactionId,
        status: TransactionStatus.COMPLETED,
        amount: 100,
        currency: 'INR',
        organizationId: uuidv4(),
        paymentMethodId: mockPaymentMethod.id,
        paymentMethod: mockPaymentMethod,
        gatewayTransactionId: 'gw_123456',
      };

      jest.spyOn(transactionRepository, 'findOne').mockResolvedValue(mockTransaction as any);
      
      mockGatewayService.processRefund.mockResolvedValue({
        success: true,
        gatewayRefundId: 'ref_123456',
        status: 'completed',
      });

      jest.spyOn(transactionRepository, 'save').mockImplementation((entity) => Promise.resolve({
        ...entity,
        id: entity.id || uuidv4(),
      } as any));

      // Act
      const result = await service.processRefund(transactionId, 50, 'Customer request');

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe(TransactionType.REFUND);
      expect(result.status).toBe(TransactionStatus.COMPLETED);
      expect(result.amount).toBe(50);
      expect(result.parentTransactionId).toBe(transactionId);
      expect(transactionRepository.save).toHaveBeenCalledTimes(2);
      expect(mockGatewayService.processRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId,
          gatewayTransactionId: 'gw_123456',
          amount: 50,
          reason: 'Customer request',
        }),
      );
    });

    it('should throw an error if transaction is not completed', async () => {
      // Arrange
      const transactionId = uuidv4();
      const mockTransaction = {
        id: transactionId,
        status: TransactionStatus.INITIATED,
        paymentMethod: mockPaymentMethod,
      };

      jest.spyOn(transactionRepository, 'findOne').mockResolvedValue(mockTransaction as any);

      // Act & Assert
      await expect(
        service.processRefund(transactionId),
      ).rejects.toThrow('Only completed transactions can be refunded');
    });

    it('should handle refund processing failure', async () => {
      // Arrange
      const transactionId = uuidv4();
      const mockTransaction = {
        id: transactionId,
        status: TransactionStatus.COMPLETED,
        amount: 100,
        currency: 'INR',
        organizationId: uuidv4(),
        paymentMethodId: mockPaymentMethod.id,
        paymentMethod: mockPaymentMethod,
        gatewayTransactionId: 'gw_123456',
      };

      jest.spyOn(transactionRepository, 'findOne').mockResolvedValue(mockTransaction as any);
      
      mockGatewayService.processRefund.mockResolvedValue({
        success: false,
        error: 'Refund failed',
      });

      jest.spyOn(transactionRepository, 'save').mockImplementation((entity) => Promise.resolve({
        ...entity,
        id: entity.id || uuidv4(),
      } as any));

      // Act & Assert
      await expect(
        service.processRefund(transactionId),
      ).rejects.toThrow('Refund failed');
      
      expect(transactionRepository.save).toHaveBeenCalledTimes(2);
      expect(transactionRepository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: TransactionStatus.FAILED,
          failureReason: 'Refund failed',
        }),
      );
    });
  });
});
