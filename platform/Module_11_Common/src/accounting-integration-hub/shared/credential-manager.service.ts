import { Injectable, Logger } from '@nestjs/common';
import { createCipher, createDecipher, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Encrypted credential data structure
 */
export interface EncryptedCredential {
    iv: string;
    encryptedData: string;
    authTag: string;
}

/**
 * Decrypted credential result
 */
export interface DecryptedCredential {
    data: Record<string, any>;
}

/**
 * Service for encrypting and decrypting sensitive accounting credentials
 * Uses AES-256-GCM for encryption with key derivation from environment variable
 * 
 * @example
 * ```typescript
 * const encrypted = await credentialManager.encrypt({ apiKey: 'secret' });
 * const decrypted = await credentialManager.decrypt(encrypted);
 * ```
 */
@Injectable()
export class CredentialManagerService {
    private readonly logger = new Logger(CredentialManagerService.name);
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32; // 256 bits
    private readonly ivLength = 16; // 128 bits
    private encryptionKey: Buffer;

    constructor() {
        this.initializeEncryptionKey();
    }

    /**
     * Initialize encryption key from environment variable
     * @throws Error if ENCRYPTION_KEY is not set
     */
    private async initializeEncryptionKey(): Promise<void> {
        const masterKey = process.env.ENCRYPTION_KEY || process.env.CREDENTIAL_ENCRYPTION_KEY;

        if (!masterKey) {
            throw new Error(
                'ENCRYPTION_KEY environment variable is required for credential encryption. ' +
                'Generate one using: openssl rand -base64 32'
            );
        }

        // Derive key using scrypt for additional security
        const salt = 'accounting-hub-salt-v1'; // In production, should be from env
        this.encryptionKey = (await scryptAsync(masterKey, salt, this.keyLength)) as Buffer;

        this.logger.log('Credential encryption initialized successfully');
    }

    /**
     * Encrypt sensitive credential data
     * 
     * @param data - Credential data to encrypt
     * @returns Encrypted credential with IV and auth tag
     * @throws Error if encryption fails
     * 
     * @example
     * ```typescript
     * const encrypted = await credentialManager.encrypt({
     *   client_id: 'abc123',
     *   client_secret: 'secret456',
     *   api_key: 'key789'
     * });
     * ```
     */
    async encrypt(data: Record<string, any>): Promise<EncryptedCredential> {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('Data to encrypt must be a non-null object');
            }

            // Generate random IV
            const iv = randomBytes(this.ivLength);

            // Create cipher
            const cipher = require('crypto').createCipheriv(
                this.algorithm,
                this.encryptionKey,
                iv
            );

            // Encrypt data
            const jsonData = JSON.stringify(data);
            let encryptedData = cipher.update(jsonData, 'utf8', 'hex');
            encryptedData += cipher.final('hex');

            // Get authentication tag
            const authTag = cipher.getAuthTag();

            const result: EncryptedCredential = {
                iv: iv.toString('hex'),
                encryptedData,
                authTag: authTag.toString('hex'),
            };

            this.logger.debug('Successfully encrypted credential data');
            return result;
        } catch (error) {
            this.logger.error('Failed to encrypt credential data', error.stack);
            throw new Error(`Credential encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt encrypted credential data
     * 
     * @param encrypted - Encrypted credential to decrypt
     * @returns Decrypted credential data
     * @throws Error if decryption fails or authentication fails
     * 
     * @example
     * ```typescript
     * const decrypted = await credentialManager.decrypt(encryptedCred);
     * console.log(decrypted.data.api_key); // 'key789'
     * ```
     */
    async decrypt(encrypted: EncryptedCredential): Promise<DecryptedCredential> {
        try {
            if (!encrypted || !encrypted.iv || !encrypted.encryptedData || !encrypted.authTag) {
                throw new Error('Invalid encrypted credential structure');
            }

            // Convert hex strings to buffers
            const iv = Buffer.from(encrypted.iv, 'hex');
            const authTag = Buffer.from(encrypted.authTag, 'hex');

            // Create decipher
            const decipher = require('crypto').createDecipheriv(
                this.algorithm,
                this.encryptionKey,
                iv
            );

            // Set auth tag for verification
            decipher.setAuthTag(authTag);

            // Decrypt data
            let decryptedData = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
            decryptedData += decipher.final('utf8');

            // Parse JSON
            const data = JSON.parse(decryptedData);

            this.logger.debug('Successfully decrypted credential data');
            return { data };
        } catch (error) {
            this.logger.error('Failed to decrypt credential data', error.stack);

            if (error.message.includes('Unsupported state or unable to authenticate data')) {
                throw new Error('Credential decryption failed: Authentication failed - data may be corrupted or tampered with');
            }

            throw new Error(`Credential decryption failed: ${error.message}`);
        }
    }

    /**
     * Encrypt a single string value (convenience method)
     * 
     * @param value - String value to encrypt
     * @returns Encrypted credential
     */
    async encryptString(value: string): Promise<EncryptedCredential> {
        return this.encrypt({ value });
    }

    /**
     * Decrypt to a single string value (convenience method)
     * 
     * @param encrypted - Encrypted credential
     * @returns Decrypted string value
     */
    async decryptString(encrypted: EncryptedCredential): Promise<string> {
        const decrypted = await this.decrypt(encrypted);
        return decrypted.data.value;
    }

    /**
     * Rotate encryption key (for key rotation scenarios)
     * 
     * @param oldKey - Old encryption key
     * @param newKey - New encryption key
     * @param encrypted - Data encrypted with old key
     * @returns Same data encrypted with new key
     */
    async rotateKey(
        oldKey: string,
        newKey: string,
        encrypted: EncryptedCredential
    ): Promise<EncryptedCredential> {
        // Save current key
        const currentKey = this.encryptionKey;

        try {
            // Temporarily use old key to decrypt
            const oldKeyBuffer = (await scryptAsync(oldKey, 'accounting-hub-salt-v1', this.keyLength)) as Buffer;
            this.encryptionKey = oldKeyBuffer;
            const decrypted = await this.decrypt(encrypted);

            // Use new key to encrypt
            const newKeyBuffer = (await scryptAsync(newKey, 'accounting-hub-salt-v1', this.keyLength)) as Buffer;
            this.encryptionKey = newKeyBuffer;
            const reencrypted = await this.encrypt(decrypted.data);

            this.logger.log('Successfully rotated encryption key');
            return reencrypted;
        } catch (error) {
            // Restore original key
            this.encryptionKey = currentKey;
            this.logger.error('Failed to rotate encryption key', error.stack);
            throw new Error(`Key rotation failed: ${error.message}`);
        }
    }

    /**
     * Validate that encrypted data can be decrypted successfully
     * 
     * @param encrypted - Encrypted credential to validate
     * @returns true if valid, false otherwise
     */
    async validate(encrypted: EncryptedCredential): Promise<boolean> {
        try {
            await this.decrypt(encrypted);
            return true;
        } catch (error) {
            this.logger.warn('Credential validation failed', error.message);
            return false;
        }
    }
}
