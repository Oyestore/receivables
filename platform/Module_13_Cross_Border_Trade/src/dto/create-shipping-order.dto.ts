import { IsString, IsEnum, IsOptional, IsArray, IsNumber, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShippingOrderDto {
  @IsString()
  orderId: string;

  @IsEnum(['dhl', 'fedex', 'ups', 'aramex', 'tnt', 'usps', 'custom'])
  provider: string;

  @IsEnum(['standard', 'express', 'overnight', 'urgent'])
  priority: string;

  @IsString()
  origin: {
    address: string;
    city: string;
    country: string;
    postalCode: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
  };

  @IsString()
  destination: {
    address: string;
    city: string;
    country: string;
    postalCode: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
  };

  @IsArray()
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

  @IsOptional()
  @IsNumber()
  insuranceValue?: number;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  estimatedDeliveryDate?: Date;
}

export class UpdateShippingOrderDto {
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'in_transit', 'delivered', 'delayed', 'cancelled', 'returned'])
  status?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  estimatedDeliveryDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  actualDeliveryDate?: Date;

  @IsOptional()
  @IsString()
  currentLocation?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  delayReason?: string;
}

export class TrackShipmentDto {
  @IsString()
  trackingNumber: string;
}
