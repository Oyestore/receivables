import { IsArray, IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min, Max, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartAuctionDto {
    @ApiProperty({
        description: 'IDs of partners to invite to auction',
        example: ['lendingkart', 'capital_float'],
    })
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(2, { message: 'Auction requires at least 2 partners' })
    partnerIds: string[];

    @ApiPropertyOptional({
        description: 'Auction timeout in minutes (5-60)',
        example: 15,
        default: 15,
    })
    @IsOptional()
    @IsNumber()
    @Min(5)
    @Max(60)
    timeoutMinutes?: number;

    @ApiPropertyOptional({
        description: 'Minimum offers required to complete auction',
        example: 2,
        default: 2,
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    minOffersRequired?: number;

    @ApiPropertyOptional({
        description: 'How to rank offers',
        example: 'lowest_rate',
        enum: ['lowest_rate', 'fastest_disbursal', 'flexible_terms', 'highest_approval_chance'],
    })
    @IsOptional()
    @IsEnum(['lowest_rate', 'fastest_disbursal', 'flexible_terms', 'highest_approval_chance'])
    prioritize?: string;

    @ApiPropertyOptional({
        description: 'Financing urgency',
        example: 'flexible',
        enum: ['same_day', 'within_week', 'flexible'],
    })
    @IsOptional()
    @IsEnum(['same_day', 'within_week', 'flexible'])
    urgency?: string;

    @ApiPropertyOptional({
        description: 'Auto-complete when all partners respond',
        example: true,
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    autoComplete?: boolean;
}

export class AuctionQueryDto {
    @ApiPropertyOptional({
        description: 'Filter by auction status',
        enum: ['pending', 'active', 'completed', 'cancelled', 'expired'],
    })
    @IsOptional()
    @IsEnum(['pending', 'active', 'completed', 'cancelled', 'expired'])
    status?: string;

    @ApiPropertyOptional({
        description: 'Filter by application ID',
    })
    @IsOptional()
    @IsString()
    applicationId?: string;

    @ApiPropertyOptional({
        description: 'Page number',
        example: 1,
        default: 1,
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({
        description: 'Results per page',
        example: 20,
        default: 20,
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number;
}

export class CancelAuctionDto {
    @ApiProperty({
        description: 'Reason for cancellation',
        example: 'User found better offer elsewhere',
    })
    @IsString()
    reason: string;
}

export class CompleteAuctionDto {
    @ApiPropertyOptional({
        description: 'Force completion even without minimum offers',
        example: false,
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    forceComplete?: boolean;
}
