import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { PaymentTransaction, TransactionStatus } from '../entities/payment-transaction.entity';
import { PaymentProcessingService } from './payment-processing.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InvoicePaymentIntegrationService {
  private readonly logger = new Logger(InvoicePaymentIntegrationService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    private readonly paymentProcessingService: PaymentProcessingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async generatePaymentLink(
    invoiceId: string,
    paymentMethodId: string,
    expiryHours = 72,
  ): Promise<{
    paymentUrl: string;
    transactionId: string;
    expiresAt: Date;
  }> {
    // Find the invoice
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      throw new Error('Invoice is already paid');
    }

    // Get customer information from invoice
    const customerInfo = {
      name: invoice.customerName,
      email: invoice.customerEmail,
      phone: invoice.customerPhone,
    };

    // Initiate payment
    const result = await this.paymentProcessingService.initiatePayment(
      invoice.organizationId,
      paymentMethodId,
      invoice.totalAmount,
      invoice.currency,
      invoiceId,
      customerInfo,
      {
        invoiceNumber: invoice.invoiceNumber,
        dueDate: invoice.dueDate,
      },
    );

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Return payment link details
    return {
      paymentUrl: result.paymentUrl,
      transactionId: result.transaction.id,
      expiresAt,
    };
  }

  async updateInvoicePaymentStatus(transactionId: string): Promise<void> {
    // Get the transaction with invoice relation
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['invoice'],
    });

    if (!transaction || !transaction.invoiceId) {
      this.logger.warn(`No invoice associated with transaction ${transactionId}`);
      return;
    }

    // Get the invoice
    const invoice = await this.invoiceRepository.findOne({
      where: { id: transaction.invoiceId },
    });

    if (!invoice) {
      this.logger.warn(`Invoice ${transaction.invoiceId} not found`);
      return;
    }

    // Update invoice status based on transaction status
    if (transaction.status === TransactionStatus.COMPLETED) {
      invoice.status = 'paid';
      invoice.paidAmount = transaction.amount;
      invoice.paidDate = transaction.completedAt;
      invoice.paymentReference = transaction.transactionReference;

      // Emit invoice paid event for other modules to react
      this.eventEmitter.emit('invoice.paid', {
        invoiceId: invoice.id,
        transactionId: transaction.id,
        amount: transaction.amount,
        paidDate: transaction.completedAt,
      });
    } else if (transaction.status === TransactionStatus.FAILED) {
      // If payment failed, update invoice status if needed
      if (invoice.status === 'pending_payment') {
        invoice.status = 'unpaid';
      }

      // Emit payment failed event
      this.eventEmitter.emit('invoice.payment.failed', {
        invoiceId: invoice.id,
        transactionId: transaction.id,
        failureReason: transaction.failureReason,
      });
    }

    // Save the updated invoice
    await this.invoiceRepository.save(invoice);
  }

  async getInvoicePaymentHistory(invoiceId: string): Promise<PaymentTransaction[]> {
    return this.transactionRepository.find({
      where: { invoiceId },
      order: { createdAt: 'DESC' },
    });
  }

  async getInvoicePaymentStatus(invoiceId: string): Promise<{
    isPaid: boolean;
    paidAmount: number;
    paidDate: Date | null;
    pendingAmount: number;
    transactions: PaymentTransaction[];
  }> {
    // Get the invoice
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get all transactions for this invoice
    const transactions = await this.transactionRepository.find({
      where: { invoiceId },
      order: { createdAt: 'DESC' },
    });

    // Calculate total paid amount from completed transactions
    const paidAmount = transactions
      .filter(t => t.status === TransactionStatus.COMPLETED && t.type === 'payment')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate total refunded amount
    const refundedAmount = transactions
      .filter(t => 
        (t.status === TransactionStatus.COMPLETED && t.type === 'refund') ||
        (t.status === TransactionStatus.REFUNDED)
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate net paid amount
    const netPaidAmount = paidAmount - refundedAmount;

    // Calculate pending amount
    const pendingAmount = Math.max(0, Number(invoice.totalAmount) - netPaidAmount);

    // Determine if invoice is fully paid
    const isPaid = netPaidAmount >= Number(invoice.totalAmount);

    // Get the latest successful payment date
    const latestPayment = transactions
      .filter(t => t.status === TransactionStatus.COMPLETED && t.type === 'payment')
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];

    return {
      isPaid,
      paidAmount: netPaidAmount,
      paidDate: latestPayment?.completedAt || null,
      pendingAmount,
      transactions,
    };
  }
}
