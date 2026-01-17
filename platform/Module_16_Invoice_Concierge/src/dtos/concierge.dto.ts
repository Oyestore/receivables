import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChatPersona } from '../entities/chat-session.entity';

export class StartSessionDto {
    @ApiProperty({ description: 'Tenant ID' })
    @IsString()
    @IsNotEmpty()
    tenantId: string;

    @ApiProperty({ description: 'Chat persona', enum: ChatPersona })
    @IsEnum(ChatPersona)
    persona: ChatPersona;

    @ApiProperty({ description: 'Invoice or reference ID', required: false })
    @IsOptional()
    @IsString()
    referenceId?: string;
}

export class SendMessageDto {
    @ApiProperty({ description: 'User message' })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    message: string;

    @ApiProperty({ description: 'Language code', required: false, default: 'en' })
    @IsOptional()
    @IsString()
    language?: string;
}

export class InitiatePaymentDto {
    @ApiProperty({ description: 'Session ID' })
    @IsString()
    @IsNotEmpty()
    sessionId: string;
}

export class VerifyPaymentDto {
    @ApiProperty({ description: 'Razorpay order ID' })
    @IsString()
    @IsNotEmpty()
    razorpay_order_id: string;

    @ApiProperty({ description: 'Razorpay payment ID' })
    @IsString()
    @IsNotEmpty()
    razorpay_payment_id: string;

    @ApiProperty({ description: 'Razorpay signature' })
    @IsString()
    @IsNotEmpty()
    razorpay_signature: string;
}

export class RaiseDisputeDto {
    @ApiProperty({ description: 'Dispute type' })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({ description: 'Dispute description' })
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    description: string;

    @ApiProperty({ description: 'Email for contact', required: false })
    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    @ApiProperty({ description: 'Evidence files', required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    evidence?: string[];
}

export class ShareReferralDto {
    @ApiProperty({ description: 'Share channel', enum: ['whatsapp', 'linkedin', 'twitter', 'email'] })
    @IsEnum(['whatsapp', 'linkedin', 'twitter', 'email'])
    channel: 'whatsapp' | 'linkedin' | 'twitter' | 'email';

    @ApiProperty({ description: 'Recipient type', enum: ['supplier', 'peer'] })
    @IsEnum(['supplier', 'peer'])
    recipientType: 'supplier' | 'peer';
}

export class ProcessInvoiceDto {
    @ApiProperty({ description: 'Invoice file path or URL' })
    @IsString()
    @IsNotEmpty()
    filePath: string;

    @ApiProperty({ description: 'Tenant ID' })
    @IsString()
    @IsNotEmpty()
    tenantId: string;

    @ApiProperty({ description: 'File type', enum: ['pdf', 'image', 'json'] })
    @IsEnum(['pdf', 'image', 'json'])
    fileType: 'pdf' | 'image' | 'json';
}
