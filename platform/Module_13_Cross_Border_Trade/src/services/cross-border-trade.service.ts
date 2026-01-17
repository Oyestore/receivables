import { Injectable, Logger } from '@nestjs/common';
import { ForexService } from './forex.service';
import { EscrowService } from './escrow.service';
import { ShippingService } from './shipping.service';
import { TradeFinanceService } from './trade-finance.service';
import { ComplianceService } from './compliance.service';

export interface CrossBorderTradeRequest {
  transactionType: 'import' | 'export';
  buyerId: string;
  sellerId: string;
  buyerCountry: string;
  sellerCountry: string;
  amount: number;
  currency: string;
  goodsDescription: string;
  hsCode?: string;
  incoterms: string;
  paymentMethod: 'letter_of_credit' | 'escrow' | 'telegraphic_transfer';
  shippingRequired: boolean;
  priority: 'standard' | 'express' | 'urgent';
  specialInstructions?: string;
  metadata?: Record<string, any>;
}

export interface CrossBorderTradeResult {
  transactionId: string;
  status: 'initiated' | 'pending_compliance' | 'compliance_approved' | 'payment_secured' | 'in_transit' | 'delivered' | 'completed' | 'failed';
  forex: {
    exchangeRate: number;
    convertedAmount: number;
    lockedRate?: number;
    lockExpiry?: Date;
  };
  payment: {
    paymentMethod: string;
    paymentStatus: string;
    paymentReference?: string;
    escrowId?: string;
    lcId?: string;
  };
  shipping?: {
    shippingId?: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    shippingStatus?: string;
  };
  compliance: {
    complianceStatus: string;
    riskLevel: string;
    restrictions: string[];
    conditions: string[];
  };
  timeline: Array<{
    step: string;
    status: string;
    timestamp: Date;
    notes?: string;
  }>;
  documents: Array<{
    type: string;
    name: string;
    url: string;
    uploadedAt: Date;
  }>;
  totalCost: number;
  estimatedDeliveryDate?: Date;
  nextAction: string;
  nextActionDue?: Date;
}

@Injectable()
export class CrossBorderTradeService {
  private readonly logger = new Logger(CrossBorderTradeService.name);

  constructor(
    private forexService: ForexService,
    private escrowService: EscrowService,
    private shippingService: ShippingService,
    private tradeFinanceService: TradeFinanceService,
    private complianceService: ComplianceService,
  ) {}

  /**
   * Initiate a cross-border trade transaction
   */
  async initiateCrossBorderTrade(request: CrossBorderTradeRequest, initiatedBy: string): Promise<CrossBorderTradeResult> {
    this.logger.log(`Initiating cross-border trade: ${request.transactionType} from ${request.buyerCountry} to ${request.sellerCountry}`);

    const transactionId = this.generateTransactionId();
    const timeline = [{
      step: 'trade_initiated',
      status: 'completed',
      timestamp: new Date(),
      notes: `Cross-border trade ${request.transactionType} initiated`,
    }];

    try {
      // Step 1: Perform compliance check
      const complianceResult = await this.performComplianceCheck(request, transactionId);
      timeline.push({
        step: 'compliance_check',
        status: complianceResult.status,
        timestamp: new Date(),
        notes: `Compliance check ${complianceResult.status}`,
      });

      if (complianceResult.status === 'rejected') {
        return this.createFailedResult(transactionId, request, timeline, 'Compliance check failed', complianceResult);
      }

      // Step 2: Handle currency conversion and FX
      const forexResult = await this.handleForexConversion(request, transactionId);
      timeline.push({
        step: 'forex_conversion',
        status: 'completed',
        timestamp: new Date(),
        notes: `FX rate locked at ${forexResult.exchangeRate}`,
      });

      // Step 3: Setup payment method
      const paymentResult = await this.setupPaymentMethod(request, transactionId, initiatedBy);
      timeline.push({
        step: 'payment_setup',
        status: paymentResult.status,
        timestamp: new Date(),
        notes: `Payment method ${request.paymentMethod} setup`,
      });

      // Step 4: Setup shipping if required
      let shippingResult;
      if (request.shippingRequired) {
        shippingResult = await this.setupShipping(request, transactionId, initiatedBy);
        timeline.push({
          step: 'shipping_setup',
          status: shippingResult.status,
          timestamp: new Date(),
          notes: `Shipping arranged`,
        });
      }

      // Calculate total costs
      const totalCost = this.calculateTotalCost(forexResult, paymentResult, shippingResult);

      const result: CrossBorderTradeResult = {
        transactionId,
        status: complianceResult.status === 'approved' ? 'compliance_approved' : 'pending_compliance',
        forex: forexResult,
        payment: paymentResult,
        shipping: shippingResult,
        compliance: complianceResult,
        timeline,
        documents: [],
        totalCost,
        estimatedDeliveryDate: shippingResult?.estimatedDelivery,
        nextAction: this.determineNextAction(complianceResult, paymentResult, shippingResult),
        nextActionDue: this.calculateNextActionDue(complianceResult, paymentResult, shippingResult),
      };

      return result;
    } catch (error: any) {
      this.logger.error(`Error initiating cross-border trade: ${error.message}`);
      return this.createFailedResult(transactionId, request, timeline, 'System error', null);
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<CrossBorderTradeResult> {
    this.logger.log(`Getting status for transaction ${transactionId}`);

    // In a real implementation, this would fetch from a transaction repository
    // For now, return a mock result
    return {
      transactionId,
      status: 'initiated',
      forex: {
        exchangeRate: 3.67,
        convertedAmount: 36700,
      },
      payment: {
        paymentMethod: 'escrow',
        paymentStatus: 'pending',
      },
      compliance: {
        complianceStatus: 'approved',
        riskLevel: 'low',
        restrictions: [],
        conditions: [],
      },
      timeline: [],
      documents: [],
      totalCost: 36700,
      nextAction: 'fund_escrow',
    };
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(transactionId: string, update: any): Promise<CrossBorderTradeResult> {
    this.logger.log(`Updating transaction ${transactionId}`);

    // In a real implementation, this would update the transaction in the database
    const currentStatus = await this.getTransactionStatus(transactionId);
    
    // Apply updates based on the update type
    if (update.paymentStatus) {
      currentStatus.payment.paymentStatus = update.paymentStatus;
    }

    if (update.shippingStatus) {
      currentStatus.shipping = currentStatus.shipping || {};
      currentStatus.shipping.shippingStatus = update.shippingStatus;
    }

    if (update.complianceStatus) {
      currentStatus.compliance.complianceStatus = update.complianceStatus;
    }

    // Update overall status
    currentStatus.status = this.calculateOverallStatus(currentStatus);
    currentStatus.nextAction = this.determineNextAction(currentStatus.compliance, currentStatus.payment, currentStatus.shipping);

    return currentStatus;
  }

  /**
   * Get cross-border trade analytics
   */
  async getTradeAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    this.logger.log('Getting cross-border trade analytics');

    // Aggregate analytics from all services
    const [forexAnalytics, escrowAnalytics, shippingAnalytics, lcAnalytics, complianceAnalytics] = await Promise.all([
      this.forexService.getFxAnalytics(startDate, endDate),
      this.escrowService.getEscrowAnalytics(startDate, endDate),
      this.shippingService.getShippingAnalytics(startDate, endDate),
      this.tradeFinanceService.getLCAnalytics(startDate, endDate),
      this.complianceService.getComplianceAnalytics(startDate, endDate),
    ]);

    const analytics = {
      overview: {
        totalTransactions: 0, // Would come from transaction repository
        totalVolume: forexAnalytics.totalVolume || 0,
        averageTransactionValue: 0,
        successRate: 0,
      },
      forex: forexAnalytics,
      payments: {
        escrowTransactions: escrowAnalytics.totalEscrows,
        letterOfCredits: lcAnalytics.totalLCs,
        escrowSuccessRate: escrowAnalytics.completionRate,
        lcSuccessRate: lcAnalytics.utilizationRate,
      },
      shipping: shippingAnalytics,
      compliance: complianceAnalytics,
      trends: {
        monthlyVolume: [], // Would calculate from transaction data
        countryPairs: [], // Would analyze trade flows
        popularPaymentMethods: [], // Would analyze payment preferences
      },
    };

    return analytics;
  }

  /**
   * Get trade performance metrics
   */
  async getTradeMetrics(): Promise<any> {
    this.logger.log('Getting trade performance metrics');

    const [forexMetrics, escrowMetrics, shippingMetrics, lcMetrics, complianceMetrics] = await Promise.all([
      this.forexService.getEscrowMetrics(),
      this.escrowService.getEscrowMetrics(),
      this.shippingService.getShippingMetrics(),
      this.tradeFinanceService.getLCMetrics(),
      this.complianceService.getComplianceMetrics(),
    ]);

    return {
      overall: {
        totalTransactions: 0,
        successRate: 0,
        averageProcessingTime: 0,
        customerSatisfaction: 0,
      },
      forex: forexMetrics,
      payments: {
        escrowMetrics,
        lcMetrics,
      },
      shipping: shippingMetrics,
      compliance: complianceMetrics,
      kpis: {
        complianceApprovalRate: complianceMetrics.approvalRate,
        onTimeDeliveryRate: shippingMetrics.onTimeDeliveryRate,
        paymentSecurityRate: (escrowMetrics.successfulTransactions / escrowMetrics.totalTransactions) * 100,
        riskMitigationRate: 100 - (complianceMetrics.highRiskChecks / complianceMetrics.totalChecks) * 100,
      },
    };
  }

  /**
   * Private helper methods
   */

  private async performComplianceCheck(request: CrossBorderTradeRequest, transactionId: string): Promise<any> {
    const complianceRequest = {
      entityType: 'transaction' as const,
      entityId: transactionId,
      complianceType: 'trade_restrictions' as any,
      entityData: {
        name: `${request.transactionType}_${transactionId}`,
        country: request.buyerCountry,
        transactionAmount: request.amount,
        currency: request.currency,
        counterparties: [{
          name: 'counterparty',
          country: request.sellerCountry,
        }],
        goodsDescription: request.goodsDescription,
        hsCode: request.hsCode,
        originCountry: request.sellerCountry,
        destinationCountry: request.buyerCountry,
      },
      priority: request.priority === 'urgent' ? 'high' : 'medium',
      requestedBy: 'system',
    };

    const complianceCheck = await this.complianceService.createComplianceCheck(complianceRequest);
    const result = await this.complianceService.performComplianceCheck(complianceCheck.id, 'system');

    return {
      status: result.status === 'approved' ? 'approved' : 'pending',
      riskLevel: result.riskLevel,
      restrictions: result.restrictions?.map(r => r.description) || [],
      conditions: result.conditions || [],
    };
  }

  private async handleForexConversion(request: CrossBorderTradeRequest, transactionId: string): Promise<any> {
    const conversionRequest = {
      fromCurrency: request.currency,
      toCurrency: 'AED', // Default to AED for UAE operations
      amount: request.amount,
      lockRate: true,
      lockDurationMinutes: 1440, // 24 hours
    };

    const result = await this.forexService.convertCurrency(conversionRequest);

    return {
      exchangeRate: result.rate,
      convertedAmount: result.convertedAmount,
      lockedRate: result.lockedRate,
      lockExpiry: result.lockedUntil,
    };
  }

  private async setupPaymentMethod(request: CrossBorderTradeRequest, transactionId: string, initiatedBy: string): Promise<any> {
    if (request.paymentMethod === 'escrow') {
      const escrowRequest = {
        transactionId,
        escrowType: 'trade_payment' as any,
        amount: request.amount,
        currency: request.currency,
        buyerId: request.buyerId,
        sellerId: request.sellerId,
        releaseConditions: {
          goods_delivered: true,
          quality_verified: true,
        },
      };

      const escrow = await this.escrowService.createEscrow(escrowRequest, initiatedBy);
      
      return {
        paymentMethod: 'escrow',
        paymentStatus: 'pending',
        paymentReference: escrow.id,
        escrowId: escrow.id,
      };
    } else if (request.paymentMethod === 'letter_of_credit') {
      const lcRequest = {
        lcNumber: `LC-${transactionId}`,
        lcType: 'commercial' as any,
        applicantId: request.buyerId,
        applicantName: `Buyer ${request.buyerId}`,
        beneficiaryId: request.sellerId,
        beneficiaryName: `Seller ${request.sellerId}`,
        issuingBankId: 'bank-001',
        issuingBankName: 'UAE Trade Bank',
        amount: request.amount,
        currency: request.currency,
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        latestShipmentDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        paymentTerms: 'at_sight' as any,
        shipmentTerms: 'CIF',
        documentsRequired: ['commercial_invoice', 'bill_of_lading', 'packing_list'],
        goodsDescription: request.goodsDescription,
        portOfLoading: 'Origin Port',
        portOfDischarge: 'Destination Port',
        partialShipments: false,
        transshipment: false,
        confirmationRequired: true,
        transferable: false,
      };

      const lc = await this.tradeFinanceService.createLetterOfCredit(lcRequest, initiatedBy);
      
      return {
        paymentMethod: 'letter_of_credit',
        paymentStatus: 'requested',
        paymentReference: lc.lcNumber,
        lcId: lc.id,
      };
    } else {
      return {
        paymentMethod: 'telegraphic_transfer',
        paymentStatus: 'pending',
        paymentReference: `TT-${transactionId}`,
      };
    }
  }

  private async setupShipping(request: CrossBorderTradeRequest, transactionId: string, initiatedBy: string): Promise<any> {
    const shippingRequest = {
      orderId: transactionId,
      provider: 'dhl' as any,
      priority: request.priority === 'urgent' ? 'urgent' : request.priority === 'express' ? 'express' : 'standard',
      origin: {
        address: 'Origin Address',
        city: 'Origin City',
        country: request.sellerCountry,
        postalCode: '00000',
        contactName: 'Shipper',
        contactPhone: '+1234567890',
        contactEmail: 'shipper@example.com',
      },
      destination: {
        address: 'Destination Address',
        city: 'Destination City',
        country: request.buyerCountry,
        postalCode: '00000',
        contactName: 'Consignee',
        contactPhone: '+1234567890',
        contactEmail: 'consignee@example.com',
      },
      packages: [{
        weight: 100,
        dimensions: { length: 100, width: 100, height: 100 },
        description: request.goodsDescription,
        value: request.amount,
      }],
      insuranceValue: request.amount,
      specialInstructions: request.specialInstructions,
    };

    const shipping = await this.shippingService.createShippingOrder(shippingRequest, initiatedBy);

    return {
      shippingId: shipping.id,
      trackingNumber: shipping.trackingNumber,
      estimatedDelivery: shipping.estimatedDeliveryDate,
      shippingStatus: 'pending',
    };
  }

  private calculateTotalCost(forexResult: any, paymentResult: any, shippingResult?: any): number {
    let totalCost = forexResult.convertedAmount;

    // Add payment processing fees
    if (paymentResult.paymentMethod === 'escrow') {
      totalCost += totalCost * 0.02; // 2% escrow fee
    } else if (paymentResult.paymentMethod === 'letter_of_credit') {
      totalCost += 500; // LC fee
    }

    // Add shipping costs
    if (shippingResult) {
      totalCost += 200; // Estimated shipping cost
    }

    return totalCost;
  }

  private determineNextAction(compliance: any, payment: any, shipping?: any): string {
    if (compliance.status !== 'approved') {
      return 'await_compliance_approval';
    }

    if (payment.paymentStatus === 'pending') {
      if (payment.paymentMethod === 'escrow') {
        return 'fund_escrow';
      } else if (payment.paymentMethod === 'letter_of_credit') {
        return 'await_lc_issuance';
      } else {
        return 'initiate_payment';
      }
    }

    if (shipping && shipping.shippingStatus === 'pending') {
      return 'schedule_pickup';
    }

    return 'monitor_delivery';
  }

  private calculateNextActionDue(compliance: any, payment: any, shipping?: any): Date | undefined {
    const now = new Date();
    
    if (compliance.status !== 'approved') {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours for compliance
    }

    if (payment.paymentStatus === 'pending') {
      return new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours for payment
    }

    return undefined;
  }

  private calculateOverallStatus(result: CrossBorderTradeResult): string {
    if (result.compliance.complianceStatus !== 'approved') {
      return 'pending_compliance';
    }

    if (result.payment.paymentStatus === 'pending') {
      return 'payment_secured';
    }

    if (result.shipping && result.shipping.shippingStatus === 'in_transit') {
      return 'in_transit';
    }

    if (result.shipping && result.shipping.shippingStatus === 'delivered') {
      return 'delivered';
    }

    return 'initiated';
  }

  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CBT-${timestamp}-${random}`;
  }

  private createFailedResult(transactionId: string, request: CrossBorderTradeRequest, timeline: any[], reason: string, compliance: any): CrossBorderTradeResult {
    timeline.push({
      step: 'trade_failed',
      status: 'failed',
      timestamp: new Date(),
      notes: reason,
    });

    return {
      transactionId,
      status: 'failed',
      forex: {
        exchangeRate: 0,
        convertedAmount: 0,
      },
      payment: {
        paymentMethod: request.paymentMethod,
        paymentStatus: 'failed',
      },
      compliance: compliance || {
        complianceStatus: 'failed',
        riskLevel: 'unknown',
        restrictions: [],
        conditions: [],
      },
      timeline,
      documents: [],
      totalCost: 0,
      nextAction: 'contact_support',
    };
  }
}
