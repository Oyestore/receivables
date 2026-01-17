import { IsString, IsOptional, IsEnum, IsObject, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { EvidenceType } from '../entities/milestone-evidence.entity';

export class CreateEvidenceDto {
  @IsString()
  milestoneId: string;

  @IsString()
  tenantId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EvidenceType)
  evidenceType: EvidenceType;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsObject()
  fileData?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsObject()
  customFields?: any;

  @IsOptional()
  @IsString()
  uploadedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
