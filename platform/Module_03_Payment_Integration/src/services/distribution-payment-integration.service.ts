import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction, TransactionStatus } from '../entities/payment-transaction.entity';
import { DistributionRecord } from '../../distribution/entities/distribution-record.entity';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class DistributionPaymentIntegrationService {
  private readonly logger = new Logger(DistributionPaymentIntegrationService.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(DistributionRecord)
    private readonly distributionRepository: Repository<DistributionRecord>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('invoice.paid')
  async handleInvoicePaid(payload: { invoiceId: string; transactionId: string; amount: number; paidDate: Date }) {
    this.logger.log(`Invoice ${payload.invoiceId} paid with transaction ${payload.transactionId}`);
    
    // Find all distribution records for this invoice
    const distributions = await this.distributionRepository.find({
      where: { invoiceId: payload.invoiceId },
    });

    if (!distributions.length) {
      this.logger.debug(`No distribution records found for invoice ${payload.invoiceId}`);
      return;
    }

    // Update distribution records with payment information
    for (const distribution of distributions) {
      distribution.paymentStatus = 'paid';
      distribution.paymentDate = payload.paidDate;
      distribution.paymentTransactionId = payload.transactionId;
      
      // Save the updated distribution record
      await this.distributionRepository.save(distribution);
      
      // Emit event for follow-up module to update its sequences
      this.eventEmitter.emit('distribution.payment.received', {
        distributionId: distribution.id,
        invoiceId: payload.invoiceId,
        recipientId: distribution.recipientContactId,
        amount: payload.amount,
        paymentDate: payload.paidDate,
      });
    }
  }

  @OnEvent('invoice.payment.failed')
  async handlePaymentFailed(payload: { invoiceId: string; transactionId: string; failureReason: string }) {
    this.logger.log(`Payment failed for invoice ${payload.invoiceId}: ${payload.failureReason}`);
    
    // Find all distribution records for this invoice
    const distributions = await this.distributionRepository.find({
      where: { invoiceId: payload.invoiceId },
    });

    if (!distributions.length) {
      return;
    }

    // Update distribution records with payment failure information
    for (const distribution of distributions) {
      distribution.paymentStatus = 'failed';
      
      // Save the updated distribution record
      await this.distributionRepository.save(distribution);
      
      // Emit event for follow-up module to trigger payment failure follow-up
      this.eventEmitter.emit('distribution.payment.failed', {
        distributionId: distribution.id,
        invoiceId: payload.invoiceId,
        recipientId: distribution.recipientContactId,
        failureReason: payload.failureReason,
      });
    }
  }

  async getDistributionPaymentStatus(distributionId: string): Promise<{
    isPaid: boolean;
    paymentDate: Date | null;
    transactionId: string | null;
  }> {
    const distribution = await this.distributionRepository.findOne({
      where: { id: distributionId },
    });

    if (!distribution) {
      throw new Error('Distribution record not found');
    }

    return {
      isPaid: distribution.paymentStatus === 'paid',
      paymentDate: distribution.paymentDate || null,
      transactionId: distribution.paymentTransactionId || null,
    };
  }
}
