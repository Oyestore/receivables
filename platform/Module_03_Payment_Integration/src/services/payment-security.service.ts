import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PaymentSecurityService {
  private readonly logger = new Logger(PaymentSecurityService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly configService: ConfigService) {
    // Get encryption key from environment or generate one
    const keyString = this.configService.get<string>('PAYMENT_ENCRYPTION_KEY');
    if (!keyString) {
      this.logger.warn('PAYMENT_ENCRYPTION_KEY not found in environment, generating a temporary key');
      // In production, this should be a stable key stored securely
      this.encryptionKey = crypto.randomBytes(32);
    } else {
      this.encryptionKey = Buffer.from(keyString, 'hex');
    }
  }

  /**
   * Encrypts sensitive payment data
   * @param data Object containing sensitive data
   * @returns Encrypted string
   */
  encryptData(data: Record<string, any>): string {
    try {
      // Generate initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      // Encrypt data
      const jsonData = JSON.stringify(data);
      let encrypted = cipher.update(jsonData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV, encrypted data, and auth tag for storage
      return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`, error.stack);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypts sensitive payment data
   * @param encryptedData Encrypted string
   * @returns Decrypted object
   */
  decryptData(encryptedData: string): Record<string, any> {
    try {
      // Split the stored data
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`, error.stack);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Masks sensitive data like card numbers
   * @param cardNumber Full card number
   * @returns Masked card number
   */
  maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 13) {
      return '****';
    }
    
    // Keep first 6 and last 4 digits, mask the rest
    const firstSix = cardNumber.substring(0, 6);
    const lastFour = cardNumber.substring(cardNumber.length - 4);
    const maskedLength = cardNumber.length - 10;
    const masked = '*'.repeat(maskedLength);
    
    return `${firstSix}${masked}${lastFour}`;
  }

  /**
   * Validates webhook signatures
   * @param payload Raw webhook payload
   * @param signature Signature from headers
   * @param secret Webhook secret
   * @returns Boolean indicating if signature is valid
   */
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      const expectedSignature = hmac.update(payload).digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      this.logger.error(`Webhook signature validation failed: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Generates a secure idempotency key
   * @returns Unique idempotency key
   */
  generateIdempotencyKey(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Sanitizes input to prevent injection attacks
   * @param input User input
   * @returns Sanitized input
   */
  sanitizeInput(input: string): string {
    if (!input) return '';
    
    // Basic sanitization - remove script tags and other potentially dangerous content
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }
}
