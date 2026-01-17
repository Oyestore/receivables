import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  ValidationPipe, 
  ParseUUIDPipe,
  HttpStatus,
  HttpException,
  Logger
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentProcessingService } from '../services/payment-processing.service';
import { InvoicePaymentIntegrationService } from '../services/invoice-payment-integration.service';
import { TransactionStatus, TransactionType } from '../entities/payment-transaction.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('payment-transactions')
@Controller('payment/transactions')
export class PaymentTransactionController {
  private readonly logger = new Logger(PaymentTransactionController.name);

  constructor(
    private readonly paymentProcessingService: PaymentProcessingService,
    private readonly invoicePaymentIntegrationService: InvoicePaymentIntegrationService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transactions by organization' })
  @ApiResponse({ status: 200, description: 'Returns transactions for the organization' })
  async getTransactionsByOrganization(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('status') status?: TransactionStatus,
    @Query('type') type?: TransactionType,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    try {
      const filters = { status, type, startDate, endDate };
      const pagination = page && limit ? { page: +page, limit: +limit } : undefined;
      
      return this.paymentProcessingService.getTransactionsByOrganization(
        organizationId,
        filters,
        pagination,
      );
    } catch (error) {
      this.logger.error(`Failed to get transactions: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve transactions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Returns the transaction details' })
  async getTransactionById(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return this.paymentProcessingService.getTransactionById(id);
    } catch (error) {
      this.logger.error(`Failed to get transaction ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to retrieve transaction',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get('invoice/:invoiceId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transactions by invoice ID' })
  @ApiResponse({ status: 200, description: 'Returns transactions for the invoice' })
  async getTransactionsByInvoiceId(@Param('invoiceId', ParseUUIDPipe) invoiceId: string) {
    try {
      return this.paymentProcessingService.getTransactionsByInvoiceId(invoiceId);
    } catch (error) {
      this.logger.error(`Failed to get transactions for invoice ${invoiceId}: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve transactions for invoice',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('initiate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a payment' })
  @ApiResponse({ status: 201, description: 'Payment initiated successfully' })
  async initiatePayment(
    @Body(ValidationPipe) paymentData: {
      organizationId: string;
      paymentMethodId: string;
      amount: number;
      currency: string;
      invoiceId?: string;
      customerInfo?: {
        name?: string;
        email?: string;
        phone?: string;
      };
      metadata?: Record<string, any>;
    },
  ) {
    try {
      const result = await this.paymentProcessingService.initiatePayment(
        paymentData.organizationId,
        paymentData.paymentMethodId,
        paymentData.amount,
        paymentData.currency,
        paymentData.invoiceId,
        paymentData.customerInfo,
        paymentData.metadata,
      );
      
      return {
        success: true,
        transactionId: result.transaction.id,
        transactionReference: result.transaction.transactionReference,
        paymentUrl: result.paymentUrl,
        paymentToken: result.paymentToken,
        qrCode: result.qrCode,
      };
    } catch (error) {
      this.logger.error(`Failed to initiate payment: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to initiate payment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a payment' })
  @ApiResponse({ status: 200, description: 'Payment verification result' })
  async verifyPayment(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const transaction = await this.paymentProcessingService.verifyPayment(id);
      
      // If transaction is associated with an invoice, update invoice payment status
      if (transaction.invoiceId) {
        await this.invoicePaymentIntegrationService.updateInvoicePaymentStatus(transaction.id);
      }
      
      return {
        success: transaction.status === TransactionStatus.COMPLETED,
        status: transaction.status,
        transactionId: transaction.id,
        transactionReference: transaction.transactionReference,
      };
    } catch (error) {
      this.logger.error(`Failed to verify payment ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to verify payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/refund')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a refund' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  async processRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) refundData: {
      amount?: number;
      reason?: string;
    },
  ) {
    try {
      const refundTransaction = await this.paymentProcessingService.processRefund(
        id,
        refundData.amount,
        refundData.reason,
      );
      
      // If transaction is associated with an invoice, update invoice payment status
      if (refundTransaction.invoiceId) {
        await this.invoicePaymentIntegrationService.updateInvoicePaymentStatus(refundTransaction.id);
      }
      
      return {
        success: true,
        refundTransactionId: refundTransaction.id,
        refundTransactionReference: refundTransaction.transactionReference,
        status: refundTransaction.status,
      };
    } catch (error) {
      this.logger.error(`Failed to process refund for ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to process refund',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('invoice/:invoiceId/payment-link')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate payment link for invoice' })
  @ApiResponse({ status: 201, description: 'Payment link generated successfully' })
  async generateInvoicePaymentLink(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Body(ValidationPipe) linkData: {
      paymentMethodId: string;
      expiryHours?: number;
    },
  ) {
    try {
      const result = await this.invoicePaymentIntegrationService.generatePaymentLink(
        invoiceId,
        linkData.paymentMethodId,
        linkData.expiryHours,
      );
      
      return {
        success: true,
        paymentUrl: result.paymentUrl,
        transactionId: result.transactionId,
        expiresAt: result.expiresAt,
      };
    } catch (error) {
      this.logger.error(`Failed to generate payment link for invoice ${invoiceId}: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to generate payment link',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('invoice/:invoiceId/payment-status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status for invoice' })
  @ApiResponse({ status: 200, description: 'Returns payment status for the invoice' })
  async getInvoicePaymentStatus(@Param('invoiceId', ParseUUIDPipe) invoiceId: string) {
    try {
      return this.invoicePaymentIntegrationService.getInvoicePaymentStatus(invoiceId);
    } catch (error) {
      this.logger.error(`Failed to get payment status for invoice ${invoiceId}: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to retrieve payment status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
