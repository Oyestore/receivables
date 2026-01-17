import { IsString, IsUUID, IsEnum, IsOptional, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { EscrowType } from '../entities/escrow-transaction.entity';

export class CreateEscrowTransactionDto {
  @IsString()
  transactionId: string;

  @IsEnum(EscrowType)
  escrowType: EscrowType;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsUUID()
  buyerId: string;

  @IsUUID()
  sellerId: string;

  @IsOptional()
  @IsUUID()
  tradeId?: string;

  @IsString()
  reviewReason: string;

  @IsOptional()
  @IsArray()
  conditions?: string[];

  @IsOptional()
  @IsString()
  releaseConditions?: string;

  @IsOptional()
  @IsString()
  disputeResolution?: string;

  @IsOptional()
  @IsString()
  blockchainRef?: string;

  @IsOptional()
  @IsString()
  smartContractAddress?: string;
}

export class FundEscrowDto {
  @IsUUID()
  escrowId: string;

  @IsOptional()
  @IsString()
  blockchainHash?: string;
}

export class ReleaseEscrowDto {
  @IsUUID()
  escrowId: string;

  @IsString()
  releaseNotes: string;

  @IsOptional()
  @IsString()
  blockchainHash?: string;
}

export class DisputeEscrowDto {
  @IsUUID()
  escrowId: string;

  @IsString()
  disputeReason: string;
}

export class UpdateEscrowDto {
  @IsOptional()
  @IsEnum(['pending', 'funded', 'released', 'disputed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
