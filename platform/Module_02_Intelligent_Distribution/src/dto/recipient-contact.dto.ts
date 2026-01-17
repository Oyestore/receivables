import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { CommunicationChannel } from '../entities/recipient-contact.entity';

export class CreateRecipientContactDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  recipientName: string;

  @IsOptional()
  @IsEmail()
  @Length(1, 255)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @IsEnum(CommunicationChannel)
  preferredChannel: CommunicationChannel;

  @IsNotEmpty()
  @IsString()
  organizationId: string;
}

export class UpdateRecipientContactDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  recipientName?: string;

  @IsOptional()
  @IsEmail()
  @Length(1, 255)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @IsOptional()
  @IsEnum(CommunicationChannel)
  preferredChannel?: CommunicationChannel;
}
