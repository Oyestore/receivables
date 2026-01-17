import { IsString, IsOptional, IsArray, IsObject, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveVerificationDto {
  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsArray()
  evidence?: any[];

  @IsOptional()
  @IsString()
  nextAction?: string;

  @IsOptional()
  @IsObject()
  approvalData?: any;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextActionDate?: Date;

  @IsOptional()
  @IsString()
  conditions?: string;
}
