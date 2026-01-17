import { IsString, IsOptional, IsEnum, IsObject, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { EvidenceType, EvidenceStatus } from '../entities/milestone-evidence.entity';

export class UpdateEvidenceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EvidenceType)
  evidenceType?: EvidenceType;

  @IsOptional()
  @IsEnum(EvidenceStatus)
  status?: EvidenceStatus;

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
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
