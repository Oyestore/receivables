import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentGateway, PaymentGatewayType } from '../entities/payment-gateway.entity';
import { PaymentGatewayService } from '../interfaces/payment-gateway.interface';
import { RazorpayGatewayService } from '../gateways/razorpay-gateway.service';
import { StripeGatewayService } from '../gateways/stripe-gateway.service';
import { PayUGatewayService } from '../gateways/payu-gateway.service';

@Injectable()
export class PaymentGatewayFactory {
  private gatewayServices: Map<string, PaymentGatewayService> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PaymentGateway)
    private readonly gatewayRepository: Repository<PaymentGateway>,
  ) {}

  async createGatewayService(gateway: PaymentGateway): Promise<PaymentGatewayService | null> {
    // Check if we already have an instance for this gateway
    const cacheKey = `${gateway.id}-${gateway.updatedAt.getTime()}`;
    if (this.gatewayServices.has(cacheKey)) {
      return this.gatewayServices.get(cacheKey);
    }

    // Create a new gateway service instance based on the type
    let gatewayService: PaymentGatewayService;

    switch (gateway.type) {
      case PaymentGatewayType.RAZORPAY:
        gatewayService = new RazorpayGatewayService();
        break;
      case PaymentGatewayType.STRIPE:
        gatewayService = new StripeGatewayService();
        break;
      case PaymentGatewayType.PAYU:
        gatewayService = new PayUGatewayService();
        break;
      // Add more gateway implementations as needed
      default:
        return null;
    }

    // Initialize the gateway with its configuration
    const config = {
      ...gateway.configuration,
      ...gateway.credentials,
      isSandbox: gateway.isSandboxMode,
    };

    const initialized = await gatewayService.initialize(config);
    if (!initialized) {
      return null;
    }

    // Cache the initialized gateway service
    this.gatewayServices.set(cacheKey, gatewayService);
    return gatewayService;
  }

  async getGatewayService(gatewayId: string): Promise<PaymentGatewayService | null> {
    const gateway = await this.gatewayRepository.findOne({ where: { id: gatewayId } });
    if (!gateway || !gateway.isEnabled) {
      return null;
    }

    return this.createGatewayService(gateway);
  }

  async getOptimalGateway(
    organizationId: string,
    amount: number,
    currency: string,
    paymentMethod: string,
  ): Promise<{ gateway: PaymentGateway; service: PaymentGatewayService } | null> {
    // Find all active gateways for the organization
    const gateways = await this.gatewayRepository.find({
      where: {
        organizationId,
        isEnabled: true,
        status: 'active',
      },
      order: {
        priority: 'ASC',
      },
    });

    if (!gateways.length) {
      return null;
    }

    // Find the optimal gateway based on fees and priority
    let optimalGateway: PaymentGateway | null = null;
    let optimalService: PaymentGatewayService | null = null;
    let lowestTotalFee = Number.MAX_VALUE;

    for (const gateway of gateways) {
      const gatewayService = await this.createGatewayService(gateway);
      if (!gatewayService) continue;

      // Check if the gateway supports the payment method and currency
      const supportedMethods = gatewayService.getSupportedPaymentMethods();
      const supportedCurrencies = gatewayService.getSupportedCurrencies();

      if (!supportedMethods.includes(paymentMethod) || !supportedCurrencies.includes(currency)) {
        continue;
      }

      // Calculate the total fee
      const { percentage, fixed } = gatewayService.getTransactionFees(amount, currency, paymentMethod);
      const totalFee = (amount * percentage / 100) + fixed;

      if (totalFee < lowestTotalFee) {
        lowestTotalFee = totalFee;
        optimalGateway = gateway;
        optimalService = gatewayService;
      }
    }

    if (!optimalGateway || !optimalService) {
      return null;
    }

    return { gateway: optimalGateway, service: optimalService };
  }

  clearCache(): void {
    this.gatewayServices.clear();
  }
}
