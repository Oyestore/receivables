import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingOrder } from '../entities/shipping-order.entity';

export enum ShippingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
}

export enum ShippingPriority {
  STANDARD = 'standard',
  EXPRESS = 'express',
  OVERNIGHT = 'overnight',
  URGENT = 'urgent',
}

export enum ShippingProvider {
  DHL = 'dhl',
  FEDEX = 'fedex',
  UPS = 'ups',
  ARAMEX = 'aramex',
  TNT = 'tnt',
  USPS = 'usps',
  CUSTOM = 'custom',
}

export interface CreateShippingOrderRequest {
  orderId: string;
  provider: ShippingProvider;
  priority: ShippingPriority;
  origin: {
    address: string;
    city: string;
    country: string;
    postalCode: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
  };
  destination: {
    address: string;
    city: string;
    country: string;
    postalCode: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
  };
  packages: Array<{
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    description: string;
    value?: number;
    trackingNumber?: string;
  }>;
  insuranceValue?: number;
  specialInstructions?: string;
  estimatedDeliveryDate?: Date;
  metadata?: Record<string, any>;
}

export interface UpdateShippingRequest {
  status?: ShippingStatus;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  currentLocation?: string;
  notes?: string;
  delayReason?: string;
  proofOfDelivery?: {
    signature: string;
    deliveredBy: string;
    deliveryTime: Date;
    photoUrl?: string;
  };
}

export interface TrackingUpdate {
  trackingNumber: string;
  status: ShippingStatus;
  location: string;
  timestamp: Date;
  notes?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    @InjectRepository(ShippingOrder)
    private shippingRepo: Repository<ShippingOrder>,
  ) {}

  /**
   * Create a new shipping order
   */
  async createShippingOrder(createRequest: CreateShippingOrderRequest, createdBy: string): Promise<ShippingOrder> {
    this.logger.log(`Creating shipping order for order ${createRequest.orderId}`);

    try {
      // Calculate total weight and dimensions
      const totalWeight = createRequest.packages.reduce((sum, pkg) => sum + pkg.weight, 0);
      const totalValue = createRequest.packages.reduce((sum, pkg) => sum + (pkg.value || 0), 0);

      // Generate tracking number
      const trackingNumber = this.generateTrackingNumber(createRequest.provider);

      // Estimate delivery date based on priority and destination
      const estimatedDeliveryDate = createRequest.estimatedDeliveryDate || 
        this.calculateEstimatedDeliveryDate(createRequest.priority, createRequest.destination.country);

      const shippingOrder = this.shippingRepo.create({
        ...createRequest,
        trackingNumber,
        totalWeight,
        totalValue,
        status: ShippingStatus.PENDING,
        estimatedDeliveryDate,
        createdBy,
      });

      return await this.shippingRepo.save(shippingOrder);
    } catch (error: any) {
      this.logger.error(`Error creating shipping order: ${error.message}`);
      throw new BadRequestException(`Failed to create shipping order: ${error.message}`);
    }
  }

  /**
   * Get shipping order by ID
   */
  async getShippingOrder(id: string): Promise<ShippingOrder> {
    const shippingOrder = await this.shippingRepo.findOne({ where: { id } });

    if (!shippingOrder) {
      throw new NotFoundException(`Shipping order with ID ${id} not found`);
    }

    return shippingOrder;
  }

  /**
   * Update shipping order status and tracking information
   */
  async updateShippingOrder(id: string, updateRequest: UpdateShippingRequest, updatedBy: string): Promise<ShippingOrder> {
    this.logger.log(`Updating shipping order ${id}`);

    const shippingOrder = await this.getShippingOrder(id);

    // Validate status transitions
    if (updateRequest.status && !this.isValidStatusTransition(shippingOrder.status, updateRequest.status)) {
      throw new BadRequestException(`Invalid status transition from ${shippingOrder.status} to ${updateRequest.status}`);
    }

    Object.assign(shippingOrder, updateRequest, { updatedBy });

    // Set actual delivery date if status is delivered
    if (updateRequest.status === ShippingStatus.DELIVERED && !shippingOrder.actualDeliveryDate) {
      shippingOrder.actualDeliveryDate = new Date();
    }

    return await this.shippingRepo.save(shippingOrder);
  }

  /**
   * Track shipment by tracking number
   */
  async trackShipment(trackingNumber: string): Promise<ShippingOrder> {
    const shippingOrder = await this.shippingRepo.findOne({ 
      where: { trackingNumber } 
    });

    if (!shippingOrder) {
      throw new NotFoundException(`Shipment with tracking number ${trackingNumber} not found`);
    }

    // Simulate real-time tracking data
    const trackingData = this.simulateTrackingData(shippingOrder);
    
    return {
      ...shippingOrder,
      trackingData,
    } as ShippingOrder;
  }

  /**
   * Get shipping orders by provider
   */
  async getShippingOrdersByProvider(provider: ShippingProvider, status?: ShippingStatus): Promise<ShippingOrder[]> {
    const where: any = { provider };
    if (status) {
      where.status = status;
    }

    return await this.shippingRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get shipping orders by status
   */
  async getShippingOrdersByStatus(status: ShippingStatus): Promise<ShippingOrder[]> {
    return await this.shippingRepo.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get delayed shipments
   */
  async getDelayedShipments(): Promise<ShippingOrder[]> {
    const now = new Date();
    
    return await this.shippingRepo
      .createQueryBuilder('shipping')
      .where('shipping.estimatedDeliveryDate < :now', { now })
      .andWhere('shipping.status NOT IN (:...statuses)', { 
        statuses: [ShippingStatus.DELIVERED, ShippingStatus.CANCELLED, ShippingStatus.RETURNED] 
      })
      .orderBy('shipping.estimatedDeliveryDate', 'ASC')
      .getMany();
  }

  /**
   * Cancel shipping order
   */
  async cancelShippingOrder(id: string, reason: string, cancelledBy: string): Promise<ShippingOrder> {
    this.logger.log(`Cancelling shipping order ${id}`);

    const shippingOrder = await this.getShippingOrder(id);

    if ([ShippingStatus.IN_TRANSIT, ShippingStatus.DELIVERED].includes(shippingOrder.status)) {
      throw new BadRequestException(`Cannot cancel shipping order in ${shippingOrder.status} status`);
    }

    shippingOrder.status = ShippingStatus.CANCELLED;
    shippingOrder.notes = `Cancelled: ${reason}`;
    shippingOrder.updatedBy = cancelledBy;

    return await this.shippingRepo.save(shippingOrder);
  }

  /**
   * Get shipping analytics
   */
  async getShippingAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.shippingRepo.createQueryBuilder('shipping');

    if (startDate && endDate) {
      query.where('shipping.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const shipments = await query.getMany();

    const analytics = {
      totalShipments: shipments.length,
      statusDistribution: {
        pending: shipments.filter(s => s.status === ShippingStatus.PENDING).length,
        confirmed: shipments.filter(s => s.status === ShippingStatus.CONFIRMED).length,
        inTransit: shipments.filter(s => s.status === ShippingStatus.IN_TRANSIT).length,
        delivered: shipments.filter(s => s.status === ShippingStatus.DELIVERED).length,
        delayed: shipments.filter(s => s.status === ShippingStatus.DELAYED).length,
        cancelled: shipments.filter(s => s.status === ShippingStatus.CANCELLED).length,
        returned: shipments.filter(s => s.status === ShippingStatus.RETURNED).length,
      },
      providerDistribution: shipments.reduce((acc: any, s) => {
        acc[s.provider] = (acc[s.provider] || 0) + 1;
        return acc;
      }, {}),
      priorityDistribution: shipments.reduce((acc: any, s) => {
        acc[s.priority] = (acc[s.priority] || 0) + 1;
        return acc;
      }, {}),
      averageDeliveryTime: this.calculateAverageDeliveryTime(shipments),
      onTimeDeliveryRate: this.calculateOnTimeDeliveryRate(shipments),
      totalWeight: shipments.reduce((sum, s) => sum + s.totalWeight, 0),
      totalValue: shipments.reduce((sum, s) => sum + s.totalValue, 0),
      averageWeight: shipments.length > 0 ? shipments.reduce((sum, s) => sum + s.totalWeight, 0) / shipments.length : 0,
      destinationCountries: [...new Set(shipments.map(s => s.destination.country))],
      originCountries: [...new Set(shipments.map(s => s.origin.country))],
    };

    return analytics;
  }

  /**
   * Get shipping performance metrics
   */
  async getShippingMetrics(): Promise<any> {
    const shipments = await this.shippingRepo.find();

    const metrics = {
      totalShipments: shipments.length,
      successfulDeliveries: shipments.filter(s => s.status === ShippingStatus.DELIVERED).length,
      delayedShipments: shipments.filter(s => s.status === ShippingStatus.DELAYED).length,
      cancelledShipments: shipments.filter(s => s.status === ShippingStatus.CANCELLED).length,
      returnedShipments: shipments.filter(s => s.status === ShippingStatus.RETURNED).length,
      averageDeliveryTime: this.calculateAverageDeliveryTime(shipments),
      onTimeDeliveryRate: this.calculateOnTimeDeliveryRate(shipments),
      totalWeightShipped: shipments.reduce((sum, s) => sum + s.totalWeight, 0),
      totalValueShipped: shipments.reduce((sum, s) => sum + s.totalValue, 0),
      mostUsedProviders: this.getMostUsedProviders(shipments),
      commonDestinations: this.getCommonDestinations(shipments),
    };

    return metrics;
  }

  /**
   * Get shipping rates from providers
   */
  async getShippingRates(request: {
    origin: string;
    destination: string;
    weight: number;
    dimensions: { length: number; width: number; height: number };
    priority: ShippingPriority;
    insuranceValue?: number;
  }): Promise<any> {
    // Simulate getting rates from different providers
    const providers = [ShippingProvider.DHL, ShippingProvider.FEDEX, ShippingProvider.UPS, ShippingProvider.ARAMEX];
    
    const rates = providers.map(provider => {
      const baseRate = this.calculateBaseRate(request.weight, request.dimensions, request.priority);
      const distanceMultiplier = this.getDistanceMultiplier(request.origin, request.destination);
      const insuranceCharge = request.insuranceValue ? request.insuranceValue * 0.01 : 0;
      
      return {
        provider,
        estimatedCost: baseRate * distanceMultiplier + insuranceCharge,
        estimatedDeliveryDays: this.getEstimatedDeliveryDays(provider, request.priority, request.destination),
        trackingIncluded: true,
        insuranceIncluded: request.insuranceValue ? false : true,
      };
    });

    return {
      origin: request.origin,
      destination: request.destination,
      weight: request.weight,
      dimensions: request.dimensions,
      priority: request.priority,
      rates: rates.sort((a, b) => a.estimatedCost - b.estimatedCost),
    };
  }

  /**
   * Private helper methods
   */

  private generateTrackingNumber(provider: ShippingProvider): string {
    const prefix = provider.toUpperCase();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${prefix}${timestamp}${random}`;
  }

  private calculateEstimatedDeliveryDate(priority: ShippingPriority, destinationCountry: string): Date {
    const now = new Date();
    let daysToAdd = 0;

    switch (priority) {
      case ShippingPriority.STANDARD:
        daysToAdd = this.getStandardDeliveryDays(destinationCountry);
        break;
      case ShippingPriority.EXPRESS:
        daysToAdd = this.getExpressDeliveryDays(destinationCountry);
        break;
      case ShippingPriority.OVERNIGHT:
        daysToAdd = 1;
        break;
      case ShippingPriority.URGENT:
        daysToAdd = 1;
        break;
      default:
        daysToAdd = 7;
    }

    now.setDate(now.getDate() + daysToAdd);
    return now;
  }

  private getStandardDeliveryDays(country: string): number {
    // Simulate delivery days by country
    const deliveryDays: Record<string, number> = {
      'US': 3,
      'CA': 4,
      'UK': 5,
      'DE': 5,
      'FR': 5,
      'AE': 7,
      'IN': 10,
      'CN': 12,
      'AU': 8,
    };
    return deliveryDays[country] || 10;
  }

  private getExpressDeliveryDays(country: string): number {
    const expressDays: Record<string, number> = {
      'US': 1,
      'CA': 2,
      'UK': 2,
      'DE': 2,
      'FR': 2,
      'AE': 3,
      'IN': 4,
      'CN': 5,
      'AU': 3,
    };
    return expressDays[country] || 4;
  }

  private isValidStatusTransition(currentStatus: ShippingStatus, newStatus: ShippingStatus): boolean {
    const validTransitions: Record<ShippingStatus, ShippingStatus[]> = {
      [ShippingStatus.PENDING]: [ShippingStatus.CONFIRMED, ShippingStatus.CANCELLED],
      [ShippingStatus.CONFIRMED]: [ShippingStatus.IN_TRANSIT, ShippingStatus.CANCELLED],
      [ShippingStatus.IN_TRANSIT]: [ShippingStatus.DELIVERED, ShippingStatus.DELAYED, ShippingStatus.RETURNED],
      [ShippingStatus.DELAYED]: [ShippingStatus.IN_TRANSIT, ShippingStatus.DELIVERED, ShippingStatus.RETURNED],
      [ShippingStatus.DELIVERED]: [],
      [ShippingStatus.CANCELLED]: [],
      [ShippingStatus.RETURNED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private simulateTrackingData(shippingOrder: ShippingOrder): any[] {
    // Simulate tracking history
    const trackingData = [
      {
        timestamp: shippingOrder.createdAt,
        status: ShippingStatus.PENDING,
        location: shippingOrder.origin.city,
        notes: 'Shipment created',
      },
    ];

    if (shippingOrder.status !== ShippingStatus.PENDING) {
      trackingData.push({
        timestamp: new Date(shippingOrder.createdAt.getTime() + 3600000),
        status: ShippingStatus.CONFIRMED,
        location: shippingOrder.origin.city,
        notes: 'Shipment confirmed by carrier',
      });
    }

    if (shippingOrder.status === ShippingStatus.IN_TRANSIT || shippingOrder.status === ShippingStatus.DELIVERED) {
      trackingData.push({
        timestamp: new Date(shippingOrder.createdAt.getTime() + 7200000),
        status: ShippingStatus.IN_TRANSIT,
        location: 'In Transit',
        notes: 'Shipment in transit',
      });
    }

    if (shippingOrder.status === ShippingStatus.DELIVERED) {
      trackingData.push({
        timestamp: shippingOrder.actualDeliveryDate || new Date(),
        status: ShippingStatus.DELIVERED,
        location: shippingOrder.destination.city,
        notes: 'Delivered successfully',
      });
    }

    return trackingData;
  }

  private calculateBaseRate(weight: number, dimensions: { length: number; width: number; height: number }, priority: ShippingPriority): number {
    const volume = dimensions.length * dimensions.width * dimensions.height;
    const dimensionalWeight = Math.max(weight, volume / 5000); // Standard dimensional weight divisor
    
    const baseRate = dimensionalWeight * 2; // Base rate per kg
    
    const priorityMultiplier = {
      [ShippingPriority.STANDARD]: 1,
      [ShippingPriority.EXPRESS]: 1.5,
      [ShippingPriority.OVERNIGHT]: 2.5,
      [ShippingPriority.URGENT]: 3,
    };

    return baseRate * priorityMultiplier[priority];
  }

  private getDistanceMultiplier(origin: string, destination: string): number {
    // Simulate distance-based pricing
    const distanceMap: Record<string, number> = {
      'US-US': 1,
      'US-CA': 1.2,
      'US-EU': 2.5,
      'US-ASIA': 3.5,
      'EU-EU': 1.5,
      'EU-ASIA': 2,
      'AS-AS': 1.8,
    };

    const key = `${origin}-${destination}`;
    const reverseKey = `${destination}-${origin}`;
    
    return distanceMap[key] || distanceMap[reverseKey] || 2;
  }

  private getEstimatedDeliveryDays(provider: ShippingProvider, priority: ShippingPriority, destination: string): number {
    const baseDays = this.getStandardDeliveryDays(destination);
    
    const priorityReduction = {
      [ShippingPriority.STANDARD]: 0,
      [ShippingPriority.EXPRESS]: Math.floor(baseDays * 0.5),
      [ShippingPriority.OVERNIGHT]: 1,
      [ShippingPriority.URGENT]: 1,
    };

    const providerSpeed = {
      [ShippingProvider.DHL]: 0.9,
      [ShippingProvider.FEDEX]: 0.95,
      [ShippingProvider.UPS]: 1,
      [ShippingProvider.ARAMEX]: 1.1,
      [ShippingProvider.TNT]: 1.05,
      [ShippingProvider.USPS]: 1.2,
      [ShippingProvider.CUSTOM]: 1,
    };

    return Math.max(1, Math.floor(baseDays - priorityReduction[priority]) * providerSpeed[provider]);
  }

  private calculateAverageDeliveryTime(shipments: ShippingOrder[]): number {
    const deliveredShipments = shipments.filter(s => s.status === ShippingStatus.DELIVERED && s.createdAt && s.actualDeliveryDate);
    
    if (deliveredShipments.length === 0) return 0;

    const totalTime = deliveredShipments.reduce((sum, s) => {
      return sum + (s.actualDeliveryDate!.getTime() - s.createdAt.getTime());
    }, 0);

    return totalTime / deliveredShipments.length / (1000 * 60 * 60 * 24); // Convert to days
  }

  private calculateOnTimeDeliveryRate(shipments: ShippingOrder[]): number {
    const deliveredShipments = shipments.filter(s => s.status === ShippingStatus.DELIVERED);
    
    if (deliveredShipments.length === 0) return 0;

    const onTimeDeliveries = deliveredShipments.filter(s => 
      s.actualDeliveryDate && s.estimatedDeliveryDate && s.actualDeliveryDate <= s.estimatedDeliveryDate
    );

    return (onTimeDeliveries.length / deliveredShipments.length) * 100;
  }

  private getMostUsedProviders(shipments: ShippingOrder[]): Array<{ provider: string; count: number }> {
    const providerCounts = shipments.reduce((acc: any, s) => {
      acc[s.provider] = (acc[s.provider] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(providerCounts)
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getCommonDestinations(shipments: ShippingOrder[]): Array<{ country: string; count: number }> {
    const countryCounts = shipments.reduce((acc: any, s) => {
      acc[s.destination.country] = (acc[s.destination.country] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
