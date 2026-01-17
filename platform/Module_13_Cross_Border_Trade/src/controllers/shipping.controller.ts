import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ShippingService } from '../services/shipping.service';
import { CreateShippingOrderDto, UpdateShippingOrderDto, TrackShipmentDto } from '../dto/create-shipping-order.dto';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  async createShippingOrder(@Body() createRequest: CreateShippingOrderDto, @Body('createdBy') createdBy: string) {
    return this.shippingService.createShippingOrder(createRequest, createdBy);
  }

  @Get(':id')
  async getShippingOrder(@Param('id') id: string) {
    return this.shippingService.getShippingOrder(id);
  }

  @Put(':id')
  async updateShippingOrder(@Param('id') id: string, @Body() updateRequest: UpdateShippingOrderDto, @Body('updatedBy') updatedBy: string) {
    return this.shippingService.updateShippingOrder(id, updateRequest, updatedBy);
  }

  @Post('track')
  async trackShipment(@Body() trackRequest: TrackShipmentDto) {
    return this.shippingService.trackShipment(trackRequest.trackingNumber);
  }

  @Get('provider/:provider')
  async getShippingOrdersByProvider(@Param('provider') provider: string, @Query('status') status?: string) {
    return this.shippingService.getShippingOrdersByProvider(provider as any, status as any);
  }

  @Get('status/:status')
  async getShippingOrdersByStatus(@Param('status') status: string) {
    return this.shippingService.getShippingOrdersByStatus(status as any);
  }

  @Get('delayed')
  async getDelayedShipments() {
    return this.shippingService.getDelayedShipments();
  }

  @Post(':id/cancel')
  async cancelShippingOrder(@Param('id') id: string, @Body() body: { reason: string; cancelledBy: string }) {
    return this.shippingService.cancelShippingOrder(id, body.reason, body.cancelledBy);
  }

  @Get('analytics')
  async getAnalytics(@Query() query: { startDate?: string; endDate?: string }) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return this.shippingService.getShippingAnalytics(startDate, endDate);
  }

  @Get('metrics')
  async getMetrics() {
    return this.shippingService.getShippingMetrics();
  }

  @Post('rates')
  async getShippingRates(@Body() body: {
    origin: string;
    destination: string;
    weight: number;
    dimensions: { length: number; width: number; height: number };
    priority: string;
    insuranceValue?: number;
  }) {
    return this.shippingService.getShippingRates(body);
  }
}
