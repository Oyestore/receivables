import { IsString, IsEnum, IsOptional, IsArray, IsNumber, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLetterOfCreditDto {
  @IsString()
  lcNumber: string;

  @IsEnum(['commercial', 'standby', 'revolving', 'transferable', 'back_to_back'])
  lcType: string;

  @IsString()
  applicantId: string;

  @IsString()
  applicantName: string;

  @IsString()
  beneficiaryId: string;

  @IsString()
  beneficiaryName: string;

  @IsString()
  issuingBankId: string;

  @IsString()
  issuingBankName: string;

  @IsOptional()
  @IsString()
  advisingBankId?: string;

  @IsOptional()
  @IsString()
  advisingBankName?: string;

  @IsOptional()
  @IsString()
  confirmingBankId?: string;

  @IsOptional()
  @IsString()
  confirmingBankName?: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsDate()
  @Type(() => Date)
  expiryDate: Date;

  @IsDate()
  @Type(() => Date)
  latestShipmentDate: Date;

  @IsEnum(['at_sight', 'deferred_payment', 'acceptance', 'negotiation', 'mixed'])
  paymentTerms: string;

  @IsString()
  shipmentTerms: string;

  @IsArray()
  documentsRequired: string[];

  @IsString()
  goodsDescription: string;

  @IsString()
  portOfLoading: string;

  @IsString()
  portOfDischarge: string;

  @IsBoolean()
  partialShipments: boolean;

  @IsBoolean()
  transshipment: boolean;

  @IsBoolean()
  confirmationRequired: boolean;

  @IsBoolean()
  transferable: boolean;

  @IsOptional()
  revolving?: {
    revolvingAmount: number;
    numberOfRevolutions: number;
    revolvingPeriod: string;
  };

  charges: {
    applicantCharges: boolean;
    beneficiaryCharges: boolean;
    bankCharges: string;
  };

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}
