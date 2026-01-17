import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction, TransactionStatus, TransactionType } from '../entities/payment-transaction.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { PaymentGatewayFactory } from './payment-gateway-factory.service';
import { PaymentInitiateRequest, PaymentInitiateResponse, PaymentVerifyRequest, PaymentVerifyResponse } from '../interfaces/payment-gateway.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentProcessingService {
  private readonly logger = new Logger(PaymentProcessingService.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    private readonly gatewayFactory: PaymentGatewayFactory,
  ) {}

  async initiatePayment(
    organizationId: string,
    paymentMethodId: string,
    amount: number,
    currency: string,
    invoiceId?: string,
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    },
    metadata?: Record<string, any>,
  ): Promise<{
    transaction: PaymentTransaction;
    paymentUrl?: string;
    paymentToken?: string;
    qrCode?: string;
  }> {
    // Find the payment method
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: paymentMethodId, organizationId, isEnabled: true },
      relations: ['gateway'],
    });

    if (!paymentMethod) {
      throw new Error('Payment method not found or not enabled');
    }

    // Get the gateway service
    const gatewayService = await this.gatewayFactory.getGatewayService(paymentMethod.gateway.id);
    if (!gatewayService) {
      throw new Error('Payment gateway not available');
    }

    // Calculate transaction fee
    const { percentage, fixed } = gatewayService.getTransactionFees(
      amount,
      currency,
      paymentMethod.type,
    );
    const transactionFee = (amount * percentage / 100) + fixed;

    // Create a new transaction record
    const transaction = new PaymentTransaction();
    transaction.transactionReference = `TXN-${uuidv4().substring(0, 8)}-${Date.now()}`;
    transaction.organizationId = organizationId;
    transaction.paymentMethodId = paymentMethodId;
    transaction.invoiceId = invoiceId;
    transaction.amount = amount;
    transaction.currency = currency;
    transaction.transactionFee = transactionFee;
    transaction.isCustomerPaidFee = paymentMethod.isCustomerBearsFee;
    transaction.status = TransactionStatus.INITIATED;
    transaction.type = TransactionType.PAYMENT;
    transaction.customerName = customerInfo?.name;
    transaction.customerEmail = customerInfo?.email;
    transaction.customerPhone = customerInfo?.phone;
    transaction.paymentDetails = metadata || {};

    // Save the transaction
    await this.transactionRepository.save(transaction);

    // Initiate payment with the gateway
    const paymentRequest: PaymentInitiateRequest = {
      amount,
      currency,
      description: `Payment for ${invoiceId ? `Invoice #${invoiceId}` : 'services'}`,
      customerName: customerInfo?.name,
      customerEmail: customerInfo?.email,
      customerPhone: customerInfo?.phone,
      invoiceId,
      metadata: {
        transactionId: transaction.id,
        transactionReference: transaction.transactionReference,
        ...metadata,
      },
      returnUrl: `${process.env.PAYMENT_RETURN_URL}?transactionId=${transaction.id}`,
      callbackUrl: `${process.env.PAYMENT_CALLBACK_URL}?transactionId=${transaction.id}`,
    };

    try {
      const response: PaymentInitiateResponse = await gatewayService.initiatePayment(paymentRequest);

      if (!response.success) {
        transaction.status = TransactionStatus.FAILED;
        transaction.failureReason = response.error;
        await this.transactionRepository.save(transaction);
        throw new Error(response.error || 'Payment initiation failed');
      }

      // Update transaction with gateway response
      transaction.gatewayTransactionId = response.gatewayTransactionId;
      transaction.paymentLink = response.paymentUrl;
      transaction.paymentLinkExpiresAt = response.expiresAt;
      transaction.gatewayResponse = response.metadata || {};
      await this.transactionRepository.save(transaction);

      return {
        transaction,
        paymentUrl: response.paymentUrl,
        paymentToken: response.paymentToken,
        qrCode: response.qrCode,
      };
    } catch (error) {
      transaction.status = TransactionStatus.FAILED;
      transaction.failureReason = error.message || 'Unknown error';
      await this.transactionRepository.save(transaction);
      throw error;
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentTransaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['paymentMethod', 'paymentMethod.gateway'],
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Skip verification if transaction is already completed or failed
    if (
      transaction.status === TransactionStatus.COMPLETED ||
      transaction.status === TransactionStatus.FAILED
    ) {
      return transaction;
    }

    // Get the gateway service
    const gatewayService = await this.gatewayFactory.getGatewayService(
      transaction.paymentMethod.gateway.id,
    );
    if (!gatewayService) {
      throw new Error('Payment gateway not available');
    }

    const verifyRequest: PaymentVerifyRequest = {
      transactionId: transaction.id,
      gatewayTransactionId: transaction.gatewayTransactionId,
    };

    try {
      const response: PaymentVerifyResponse = await gatewayService.verifyPayment(verifyRequest);

      // Update transaction based on verification response
      if (response.success) {
        transaction.status = TransactionStatus.COMPLETED;
        transaction.completedAt = new Date();
      } else {
        transaction.status = TransactionStatus.FAILED;
        transaction.failureReason = response.error;
      }

      transaction.gatewayResponse = {
        ...transaction.gatewayResponse,
        verificationResponse: response,
      };

      await this.transactionRepository.save(transaction);
      return transaction;
    } catch (error) {
      this.logger.error(`Payment verification failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processRefund(
    transactionId: string,
    amount?: number,
    reason?: string,
  ): Promise<PaymentTransaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['paymentMethod', 'paymentMethod.gateway'],
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new Error('Only completed transactions can be refunded');
    }

    // Get the gateway service
    const gatewayService = await this.gatewayFactory.getGatewayService(
      transaction.paymentMethod.gateway.id,
    );
    if (!gatewayService) {
      throw new Error('Payment gateway not available');
    }

    // Create refund transaction
    const refundTransaction = new PaymentTransaction();
    refundTransaction.transactionReference = `REF-${uuidv4().substring(0, 8)}-${Date.now()}`;
    refundTransaction.organizationId = transaction.organizationId;
    refundTransaction.paymentMethodId = transaction.paymentMethodId;
    refundTransaction.invoiceId = transaction.invoiceId;
    refundTransaction.amount = amount || transaction.amount;
    refundTransaction.currency = transaction.currency;
    refundTransaction.status = TransactionStatus.INITIATED;
    refundTransaction.type = TransactionType.REFUND;
    refundTransaction.parentTransactionId = transaction.id;
    refundTransaction.customerName = transaction.customerName;
    refundTransaction.customerEmail = transaction.customerEmail;
    refundTransaction.customerPhone = transaction.customerPhone;
    refundTransaction.paymentDetails = {
      reason,
      originalTransaction: transaction.id,
    };

    await this.transactionRepository.save(refundTransaction);

    // Process refund with the gateway
    const refundRequest = {
      transactionId: transaction.id,
      gatewayTransactionId: transaction.gatewayTransactionId,
      amount: refundTransaction.amount,
      reason,
      metadata: {
        refundTransactionId: refundTransaction.id,
        refundTransactionReference: refundTransaction.transactionReference,
      },
    };

    try {
      const response = await gatewayService.processRefund(refundRequest);

      if (!response.success) {
        refundTransaction.status = TransactionStatus.FAILED;
        refundTransaction.failureReason = response.error;
        await this.transactionRepository.save(refundTransaction);
        throw new Error(response.error || 'Refund processing failed');
      }

      // Update refund transaction with gateway response
      refundTransaction.gatewayTransactionId = response.gatewayRefundId;
      refundTransaction.status = TransactionStatus.COMPLETED;
      refundTransaction.completedAt = new Date();
      refundTransaction.gatewayResponse = response.metadata || {};
      await this.transactionRepository.save(refundTransaction);

      // Update original transaction status
      if (amount && amount < transaction.amount) {
        transaction.status = TransactionStatus.PARTIALLY_REFUNDED;
      } else {
        transaction.status = TransactionStatus.REFUNDED;
      }
      await this.transactionRepository.save(transaction);

      return refundTransaction;
    } catch (error) {
      refundTransaction.status = TransactionStatus.FAILED;
      refundTransaction.failureReason = error.message || 'Unknown error';
      await this.transactionRepository.save(refundTransaction);
      throw error;
    }
  }

  async getTransactionById(transactionId: string): Promise<PaymentTransaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['paymentMethod', 'invoice'],
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return transaction;
  }

  async getTransactionsByInvoiceId(invoiceId: string): Promise<PaymentTransaction[]> {
    return this.transactionRepository.find({
      where: { invoiceId },
      relations: ['paymentMethod'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTransactionsByOrganization(
    organizationId: string,
    filters?: {
      status?: TransactionStatus;
      type?: TransactionType;
      startDate?: Date;
      endDate?: Date;
    },
    pagination?: {
      page: number;
      limit: number;
    },
  ): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    const query = this.transactionRepository.createQueryBuilder('transaction')
      .where('transaction.organizationId = :organizationId', { organizationId })
      .leftJoinAndSelect('transaction.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('transaction.invoice', 'invoice');

    if (filters?.status) {
      query.andWhere('transaction.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      query.andWhere('transaction.type = :type', { type: filters.type });
    }

    if (filters?.startDate) {
      query.andWhere('transaction.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('transaction.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const total = await query.getCount();

    if (pagination) {
      const { page, limit } = pagination;
      query.skip((page - 1) * limit).take(limit);
    }

    query.orderBy('transaction.createdAt', 'DESC');

    const transactions = await query.getMany();

    return { transactions, total };
  }
}
