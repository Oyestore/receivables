import { IsString, IsNumber, IsOptional, IsEnum, IsDate, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum BankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CURRENT = 'current',
  CORPORATE = 'corporate',
}

export enum ReconciliationStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  PARTIALLY_MATCHED = 'partially_matched',
  UNMATCHED = 'unmatched',
  SUSPENSE = 'suspense',
}

export class CreateBankAccountDto {
  @IsString()
  accountName: string;

  @IsString()
  accountNumber: string;

  @IsString()
  bankName: string;

  @IsString()
  bankCode: string;

  @IsEnum(BankAccountType)
  accountType: BankAccountType;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  branchCode?: string;

  @IsOptional()
  @IsString()
  swiftCode?: string;

  @IsOptional()
  @IsString()
  routingNumber?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class CreateBankTransactionDto {
  @IsUUID()
  bankAccountId: string;

  @IsString()
  utrNumber: string;

  @IsNumber()
  amount: number;

  @IsEnum(['credit', 'debit'])
  transactionType: 'credit' | 'debit';

  @IsDate()
  @Type(() => Date)
  transactionDate: Date;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsString()
  payeeName?: string;

  @IsOptional()
  @IsString()
  payerName?: string;

  @IsOptional()
  @IsString()
  chequeNumber?: string;

  @IsOptional()
  @IsString()
  instrumentType?: string;

  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class UpdateBankTransactionDto {
  @IsOptional()
  @IsEnum(ReconciliationStatus)
  reconciliationStatus?: ReconciliationStatus;

  @IsOptional()
  @IsUUID()
  matchedGlEntryId?: string;

  @IsOptional()
  @IsUUID()
  suspenseEntryId?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
