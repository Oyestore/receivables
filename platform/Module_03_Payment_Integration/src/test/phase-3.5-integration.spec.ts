import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainService } from '../services/blockchain.service';
import { PaymentVerificationService } from '../services/payment-verification.service';
import { PaymentProcessingService } from '../services/payment-processing.service';
import { BlockchainTransaction } from '../entities/blockchain-transaction.entity';
import { PaymentVerification } from '../entities/payment-verification.entity';

describe('Phase 3.5 Integration Tests', () => {
  let blockchainService: BlockchainService;
  let paymentVerificationService: PaymentVerificationService;
  let paymentProcessingService: PaymentProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        PaymentVerificationService,
        PaymentProcessingService,
      ],
    }).compile();

    blockchainService = module.get<BlockchainService>(BlockchainService);
    paymentVerificationService = module.get<PaymentVerificationService>(PaymentVerificationService);
    paymentProcessingService = module.get<PaymentProcessingService>(PaymentProcessingService);
  });

  describe('Blockchain Verification with Payment Processing Integration', () => {
    it('should verify payment transaction on blockchain', async () => {
      const paymentData = {
        id: 'payment-123',
        amount: 1000,
        currency: 'USD',
        recipient: 'recipient-123',
        sender: 'sender-123',
      };

      // Process payment
      const processedPayment = await paymentProcessingService.processPayment(paymentData);
      expect(processedPayment.status).toBe('processed');

      // Create blockchain transaction
      const blockchainTx = await blockchainService.createTransaction({
        paymentId: processedPayment.id,
        amount: processedPayment.amount,
        timestamp: new Date(),
        hash: 'tx-hash-123',
      });

      // Verify on blockchain
      const verification = await paymentVerificationService.verifyPayment(blockchainTx.hash);
      expect(verification.verified).toBe(true);
      expect(verification.blockchainConfirmed).toBe(true);
    });

    it('should handle blockchain verification failure', async () => {
      const invalidTxHash = 'invalid-hash';

      const verification = await paymentVerificationService.verifyPayment(invalidTxHash);
      expect(verification.verified).toBe(false);
      expect(verification.error).toContain('Transaction not found');
    });
  });

  describe('Recommendation Engine with Personalization Integration', () => {
    it('should provide personalized payment method recommendations', async () => {
      const userProfile = {
        id: 'user-123',
        preferences: {
          preferredMethods: ['credit_card', 'upi'],
          riskTolerance: 'medium',
          transactionHistory: [
            { method: 'credit_card', success: true, amount: 500 },
            { method: 'upi', success: true, amount: 200 },
          ],
        },
        behavior: {
          deviceUsage: 'mobile',
          timeOfDay: 'evening',
          location: 'urban',
        },
      };

      const paymentContext = {
        amount: 750,
        currency: 'USD',
        merchant: 'merchant-123',
        category: 'retail',
      };

      const recommendations = await paymentVerificationService.getPersonalizedRecommendations(
        userProfile.id,
        paymentContext
      );

      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].method).toBe('credit_card');
      expect(recommendations[0].confidence).toBeGreaterThan(0.8);
      expect(recommendations[0].reasoning).toContain('based on historical success');
    });

    it('should adapt recommendations based on user behavior', async () => {
      const userId = 'user-456';
      
      // Initial recommendation
      const initialRec = await paymentVerificationService.getPersonalizedRecommendations(userId, {
        amount: 100,
        currency: 'USD',
      });

      // Simulate user choosing different method
      await paymentVerificationService.recordUserChoice(userId, 'bank_transfer', true);

      // Updated recommendation should reflect user behavior
      const updatedRec = await paymentVerificationService.getPersonalizedRecommendations(userId, {
        amount: 100,
        currency: 'USD',
      });

      expect(updatedRec.some(rec => rec.method === 'bank_transfer')).toBe(true);
    });
  });

  describe('Routing Optimization with Security Features Integration', () => {
    it('should optimize payment routing based on security and cost', async () => {
      const paymentRequest = {
        amount: 5000,
        currency: 'USD',
        recipient: 'recipient-123',
        priority: 'high',
        securityLevel: 'maximum',
      };

      const routingOptions = await paymentProcessingService.getOptimizedRoutes(paymentRequest);

      expect(routingOptions).toHaveLength(3);
      
      // Should prioritize secure routes for high-value transactions
      const secureRoutes = routingOptions.filter(route => route.securityScore > 0.9);
      expect(secureRoutes.length).toBeGreaterThan(0);

      // Should consider cost optimization
      const costEffectiveRoutes = routingOptions.filter(route => route.cost < 50);
      expect(costEffectiveRoutes.length).toBeGreaterThan(0);
    });

    it('should handle routing failures with fallback mechanisms', async () => {
      const paymentRequest = {
        amount: 1000,
        currency: 'USD',
        recipient: 'recipient-123',
      };

      // Mock primary route failure
      jest.spyOn(paymentProcessingService, 'processRoute').mockRejectedValueOnce(new Error('Route failed'));

      const result = await paymentProcessingService.processPaymentWithFallback(paymentRequest);
      
      expect(result.status).toBe('processed');
      expect(result.routeUsed).not.toBe('primary');
      expect(result.fallbackTriggered).toBe(true);
    });
  });

  describe('Integration Framework with All Other Modules', () => {
    it('should integrate with invoice generation module', async () => {
      const invoiceData = {
        id: 'invoice-123',
        amount: 2000,
        dueDate: new Date(),
        customerId: 'customer-123',
      };

      // Trigger payment from invoice
      const paymentTrigger = await paymentProcessingService.triggerPaymentFromInvoice(invoiceData);
      
      expect(paymentTrigger.invoiceId).toBe(invoiceData.id);
      expect(paymentTrigger.amount).toBe(invoiceData.amount);
      expect(paymentTrigger.status).toBe('initiated');
    });

    it('should integrate with customer communication module', async () => {
      const paymentData = {
        id: 'payment-123',
        customerId: 'customer-123',
        amount: 1000,
        status: 'completed',
      };

      // Send payment confirmation
      const communicationResult = await paymentProcessingService.sendPaymentConfirmation(paymentData);
      
      expect(communicationResult.customerId).toBe(paymentData.customerId);
      expect(communicationResult.type).toBe('payment_confirmation');
      expect(communicationResult.status).toBe('sent');
    });

    it('should integrate with analytics module', async () => {
      const analyticsData = await paymentProcessingService.getPaymentAnalytics({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        granularity: 'daily',
      });

      expect(analyticsData.totalPayments).toBeGreaterThan(0);
      expect(analyticsData.successRate).toBeGreaterThan(0.9);
      expect(analyticsData.averageAmount).toBeGreaterThan(0);
      expect(analyticsData.breakdown).toBeDefined();
    });
  });

  describe('Scalability Testing for Millions of Users', () => {
    it('should handle high volume concurrent payments', async () => {
      const concurrentPayments = Array.from({ length: 10000 }, (_, i) => ({
        id: `payment-${i}`,
        amount: 100 + Math.random() * 1000,
        currency: 'USD',
        recipient: `recipient-${i % 1000}`,
      }));

      const startTime = Date.now();
      
      const results = await Promise.all(
        concurrentPayments.map(payment => 
          paymentProcessingService.processPayment(payment)
        )
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(results).toHaveLength(10000);
      expect(results.filter(r => r.status === 'processed').length).toBeGreaterThan(9500);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should maintain performance under sustained load', async () => {
      const duration = 60000; // 1 minute
      const requestsPerSecond = 1000;
      const totalRequests = (duration / 1000) * requestsPerSecond;

      const results = [];
      const startTime = Date.now();

      for (let i = 0; i < totalRequests; i++) {
        const request = {
          id: `load-test-${i}`,
          amount: 100 + Math.random() * 1000,
          currency: 'USD',
        };

        results.push(paymentProcessingService.processPayment(request));

        // Rate limiting
        if (i % requestsPerSecond === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const resolvedResults = await Promise.all(results);
      const endTime = Date.now();

      expect(resolvedResults).toHaveLength(totalRequests);
      expect(endTime - startTime).toBeLessThan(duration + 10000); // Allow 10s buffer
      
      const successRate = resolvedResults.filter(r => r.status === 'processed').length / resolvedResults.length;
      expect(successRate).toBeGreaterThan(0.95);
    });

    it('should scale horizontally with increased load', async () => {
      const loadLevels = [
        { requests: 1000, expectedTime: 5000 },
        { requests: 5000, expectedTime: 20000 },
        { requests: 10000, expectedTime: 35000 },
      ];

      const performanceResults = [];

      for (const level of loadLevels) {
        const requests = Array.from({ length: level.requests }, (_, i) => ({
          id: `scale-test-${i}`,
          amount: 100,
          currency: 'USD',
        }));

        const startTime = Date.now();
        await Promise.all(requests.map(req => paymentProcessingService.processPayment(req)));
        const endTime = Date.now();

        const actualTime = endTime - startTime;
        const throughput = level.requests / (actualTime / 1000);

        performanceResults.push({
          requests: level.requests,
          actualTime,
          expectedTime: level.expectedTime,
          throughput,
          efficiency: level.expectedTime / actualTime,
        });

        expect(actualTime).toBeLessThan(level.expectedTime * 1.5); // Allow 50% buffer
      }

      // Verify linear scalability
      const throughputs = performanceResults.map(r => r.throughput);
      const throughputVariance = Math.max(...throughputs) / Math.min(...throughputs);
      expect(throughputVariance).toBeLessThan(2); // Should be relatively consistent
    });
  });

  describe('Security Compliance Validation', () => {
    it('should comply with PCI DSS requirements', async () => {
      const paymentData = {
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvv: '123',
        amount: 1000,
        currency: 'USD',
      };

      // Process payment with PCI compliance
      const result = await paymentProcessingService.processPaymentWithPCI(paymentData);

      expect(result.status).toBe('processed');
      expect(result.pciCompliant).toBe(true);
      expect(result.encryptedData).toBeDefined();
      expect(result.auditTrail).toBeDefined();
    });

    it('should implement proper data encryption', async () => {
      const sensitiveData = {
        accountNumber: '1234567890123456',
        routingNumber: '987654321',
      };

      const encrypted = await paymentProcessingService.encryptSensitiveData(sensitiveData);
      
      expect(encrypted.encrypted).toBe(true);
      expect(encrypted.data).not.toBe(sensitiveData.accountNumber);
      expect(encrypted.keyId).toBeDefined();
      expect(encrypted.algorithm).toBe('AES-256-GCM');
    });

    it('should maintain audit trail for all transactions', async () => {
      const paymentData = {
        id: 'audit-test-123',
        amount: 1000,
        currency: 'USD',
      };

      await paymentProcessingService.processPayment(paymentData);

      const auditTrail = await paymentProcessingService.getAuditTrail(paymentData.id);
      
      expect(auditTrail).toHaveLength(3); // Initiated, Processed, Completed
      expect(auditTrail[0].action).toBe('payment_initiated');
      expect(auditTrail[0].timestamp).toBeInstanceOf(Date);
      expect(auditTrail[0].userId).toBeDefined();
      expect(auditTrail[0].ipAddress).toBeDefined();
    });

    it('should detect and prevent fraudulent transactions', async () => {
      const suspiciousPayment = {
        id: 'fraud-test-123',
        amount: 50000, // Unusually high amount
        currency: 'USD',
        recipient: 'new-recipient-123',
        sender: 'new-sender-456',
        ipAddress: '192.168.1.1', // Suspicious IP
      };

      const result = await paymentProcessingService.processPaymentWithFraudDetection(suspiciousPayment);
      
      expect(result.status).toBe('flagged');
      expect(result.fraudScore).toBeGreaterThan(0.8);
      expect(result.riskLevel).toBe('high');
      expect(result.actionRequired).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network failures gracefully', async () => {
      const paymentData = {
        id: 'network-fail-test',
        amount: 1000,
        currency: 'USD',
      };

      // Mock network failure
      jest.spyOn(paymentProcessingService, 'connectToGateway').mockRejectedValueOnce(new Error('Network unreachable'));

      const result = await paymentProcessingService.processPaymentWithRetry(paymentData);
      
      expect(result.status).toBe('retry_scheduled');
      expect(result.retryCount).toBe(1);
      expect(result.nextRetryAt).toBeInstanceOf(Date);
    });

    it('should implement circuit breaker pattern', async () => {
      const paymentData = {
        id: 'circuit-test',
        amount: 1000,
        currency: 'USD',
      };

      // Simulate multiple failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        jest.spyOn(paymentProcessingService, 'connectToGateway').mockRejectedValueOnce(new Error('Gateway error'));
        await paymentProcessingService.processPayment(paymentData);
      }

      // Circuit breaker should be open now
      const result = await paymentProcessingService.processPayment(paymentData);
      
      expect(result.status).toBe('circuit_breaker_open');
      expect(result.reason).toContain('Circuit breaker is open');
    });

    it('should provide detailed error reporting', async () => {
      const paymentData = {
        id: 'error-report-test',
        amount: 1000,
        currency: 'USD',
      };

      try {
        await paymentProcessingService.processPayment(paymentData);
      } catch (error) {
        const errorReport = await paymentProcessingService.generateErrorReport(error);
        
        expect(errorReport.errorId).toBeDefined();
        expect(errorReport.timestamp).toBeInstanceOf(Date);
        expect(errorReport.stackTrace).toBeDefined();
        expect(errorReport.context).toEqual(paymentData);
        expect(errorReport.severity).toBeDefined();
      }
    });
  });

  describe('Cross-Module Data Consistency', () => {
    it('should maintain data consistency across modules', async () => {
      const paymentData = {
        id: 'consistency-test',
        amount: 1000,
        currency: 'USD',
        invoiceId: 'invoice-123',
        customerId: 'customer-123',
      };

      // Process payment
      const paymentResult = await paymentProcessingService.processPayment(paymentData);

      // Verify data in invoice module
      const invoiceStatus = await paymentProcessingService.getInvoiceStatus(paymentData.invoiceId);
      expect(invoiceStatus.paymentId).toBe(paymentResult.id);
      expect(invoiceStatus.status).toBe('paid');

      // Verify data in customer module
      const customerBalance = await paymentProcessingService.getCustomerBalance(paymentData.customerId);
      expect(customerBalance.lastPaymentId).toBe(paymentResult.id);
      expect(customerBalance.updatedAt).toBeInstanceOf(Date);

      // Verify data in analytics module
      const analyticsRecord = await paymentProcessingService.getAnalyticsRecord(paymentResult.id);
      expect(analyticsRecord.paymentId).toBe(paymentResult.id);
      expect(analyticsRecord.amount).toBe(paymentData.amount);
    });

    it('should handle distributed transactions correctly', async () => {
      const complexTransaction = {
        payments: [
          { id: 'tx-1', amount: 500, recipient: 'recipient-1' },
          { id: 'tx-2', amount: 300, recipient: 'recipient-2' },
          { id: 'tx-3', amount: 200, recipient: 'recipient-3' },
        ],
        totalAmount: 1000,
        currency: 'USD',
      };

      const result = await paymentProcessingService.processDistributedTransaction(complexTransaction);

      expect(result.status).toBe('completed');
      expect(result.payments).toHaveLength(3);
      expect(result.payments.every(p => p.status === 'completed')).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.commitTimestamp).toBeInstanceOf(Date);
    });
  });
});
