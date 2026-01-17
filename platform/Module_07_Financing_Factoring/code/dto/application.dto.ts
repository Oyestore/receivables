import { IsString, IsNumber, IsEnum, IsOptional, IsArray, Min, Max, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FinancingPurpose {
    INVOICE_DISCOUNTING = 'invoice_discounting',
    INVOICE_FACTORING = 'invoice_factoring',
    WORKING_CAPITAL = 'working_capital',
    PURCHASE_ORDER = 'purchase_order',
    SUPPLY_CHAIN_FINANCE = 'supply_chain_finance',
    EQUIPMENT_FINANCING = 'equipment_financing',
    REVENUE_BASED = 'revenue_based',
}

export enum UrgencyLevel {
    SAME_DAY = 'same_day',
    THREE_DAYS = '3_days',
    ONE_WEEK = '1_week',
    FLEXIBLE = 'flexible',
}

export enum PriorityPreference {
    LOWEST_RATE = 'lowest_rate',
    FASTEST_DISBURSAL = 'fastest_disbursal',
    FLEXIBLE_TERMS = 'flexible_terms',
    HIGHEST_APPROVAL_CHANCE = 'highest_approval_chance',
}

export class BusinessDetailsDto {
    @ApiProperty({ description: 'Business legal name' })
    @IsString()
    businessName: string;

    @ApiProperty({ description: 'PAN number' })
    @IsString()
    businessPan: string;

    @ApiPropertyOptional({ description: 'GSTIN (optional)' })
    @IsOptional()
    @IsString()
    businessGstin?: string;

    @ApiProperty({ description: 'Annual revenue in INR' })
    @IsNumber()
    @Min(0)
    annualRevenue: number;

    @ApiProperty({ description: 'Years in business' })
    @IsNumber()
    @Min(0)
    @Max(100)
    yearsInBusiness: number;

    @ApiProperty({ description: 'Industry/sector' })
    @IsString()
    industry: string;

    @ApiPropertyOptional({ description: 'Number of employees' })
    @IsOptional()
    @IsNumber()
    employeeCount?: number;

    @ApiPropertyOptional({ description: 'Business type' })
    @IsOptional()
    @IsString()
    businessType?: string;
}

export class FinancingPreferencesDto {
    @ApiProperty({
        description: 'What to prioritize in offers',
        enum: PriorityPreference,
    })
    @IsEnum(PriorityPreference)
    prioritize: PriorityPreference;

    @ApiPropertyOptional({ description: 'Preferred tenure in months' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(60)
    preferredTenure?: number;

    @ApiPropertyOptional({ description: 'Maximum acceptable interest rate (%)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    maxInterestRate?: number;
}

export class CreateApplicationDto {
    @ApiProperty({
        description: 'Purpose of financing',
        enum: FinancingPurpose,
    })
    @IsEnum(FinancingPurpose)
    financingType: FinancingPurpose;

    @ApiProperty({ description: 'Requested amount in INR' })
    @IsNumber()
    @Min(10000) // Minimum ₹10,000
    @Max(100000000) // Maximum ₹10 Cr
    requestedAmount: number;

    @ApiProperty({
        description: 'How urgently funds are needed',
        enum: UrgencyLevel,
    })
    @IsEnum(UrgencyLevel)
    urgency: UrgencyLevel;

    @ApiProperty({ description: 'Business details' })
    @ValidateNested()
    @Type(() => BusinessDetailsDto)
    businessDetails: BusinessDetailsDto;

    @ApiPropertyOptional({ description: 'Invoice IDs (for invoice financing)' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    invoiceIds?: string[];

    @ApiPropertyOptional({ description: 'Purchase order IDs (for PO financing)' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    purchaseOrderIds?: string[];

    @ApiPropertyOptional({ description: 'User preferences for offers' })
    @IsOptional()
    @ValidateNested()
    @Type(() => FinancingPreferencesDto)
    preferences?: FinancingPreferencesDto;

    @ApiPropertyOptional({ description: 'Additional metadata' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class SubmitApplicationDto {
    @ApiProperty({ description: 'Partner IDs to submit to' })
    @IsArray()
    @IsString({ each: true })
    partnerIds: string[];

    @ApiPropertyOptional({
        description: 'Submission mode: single partner or multi-partner auction',
        enum: ['single', 'auction'],
        default: 'single',
    })
    @IsOptional()
    @IsEnum(['single', 'auction'])
    mode?: 'single' | 'auction';
}

export class ApplicationQueryDto {
    @ApiPropertyOptional({ description: 'Filter by status' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Filter by financing type' })
    @IsOptional()
    @IsEnum(FinancingPurpose)
    financingType?: FinancingPurpose;

    @ApiPropertyOptional({ description: 'Filter by partner ID' })
    @IsOptional()
    @IsString()
    partnerId?: string;

    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 20 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'Start date (ISO string)' })
    @IsOptional()
    @IsString()
    dateFrom?: string;

    @ApiPropertyOptional({ description: 'End date (ISO string)' })
    @IsOptional()
    @IsString()
    dateTo?: string;
}

export class CompareOffersDto {
    @ApiPropertyOptional({ description: 'User preferences for ranking' })
    @IsOptional()
    @ValidateNested()
    @Type(() => FinancingPreferencesDto)
    preferences?: FinancingPreferencesDto;

    @ApiPropertyOptional({
        description: 'Timeout for auction in seconds',
        default: 30,
    })
    @IsOptional()
    @IsNumber()
    @Min(10)
    @Max(120)
    auctionTimeout?: number = 30;
}
