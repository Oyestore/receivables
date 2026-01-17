import { IsString, IsUUID, IsEnum, IsDate, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewType, ReviewPriority } from '../entities/manual-review.entity';

export class CreateManualReviewDto {
  @IsUUID()
  decisionId: string;

  @IsEnum(ReviewType)
  reviewType: ReviewType;

  @IsOptional()
  @IsEnum(ReviewPriority)
  priority?: ReviewPriority;

  @IsString()
  reviewerId: string;

  @IsString()
  reviewerRole: string;

  @IsString()
  reviewerName: string;

  @IsString()
  reviewReason: string;

  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @IsOptional()
  @IsArray()
  conditions?: Array<{
    condition: string;
    description: string;
    isMandatory: boolean;
    dueDate?: Date;
  }>;

  @IsOptional()
  @IsArray()
  supportingDocuments?: Array<{
    documentId: string;
    documentName: string;
    documentType: string;
  }>;
}

export class UpdateManualReviewDto {
  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'approved', 'rejected', 'escalated', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @IsOptional()
  @IsString()
  recommendation?: string;

  @IsOptional()
  @IsArray()
  conditions?: Array<{
    condition: string;
    description: string;
    isMandatory: boolean;
    dueDate?: Date;
  }>;

  @IsOptional()
  @IsString()
  overrideReason?: string;
}
