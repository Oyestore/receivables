import { IsString, IsOptional, IsEnum, IsObject, IsArray, IsBoolean, IsEmail, MinLength, IsNumber } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsObject()
  @IsOptional()
  preferences?: Record<string, any>;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsObject()
  @IsOptional()
  preferences?: Record<string, any>;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class UserQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
