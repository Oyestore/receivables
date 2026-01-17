import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { CommunicationChannel } from '../entities/recipient-contact.entity';
import { DistributionStatus } from '../entities/distribution-record.entity';

export class CreateDistributionRecordDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  invoiceId: string;

  @IsNotEmpty()
  @IsString()
  @IsUUID()
  recipientId: string;

  @IsEnum(CommunicationChannel)
  channel: CommunicationChannel;

  @IsNotEmpty()
  @IsString()
  @IsUUID()
  organizationId: string;
}

export class UpdateDistributionRecordDto {
  @IsOptional()
  @IsEnum(DistributionStatus)
  status?: DistributionStatus;

  @IsOptional()
  sentAt?: Date;

  @IsOptional()
  deliveredAt?: Date;

  @IsOptional()
  openedAt?: Date;
}
