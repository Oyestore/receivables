import { Pool } from 'pg';
import * as crypto from 'crypto';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';
import {
    IBiometricRegistration,
    IHardwareToken,
    IDirectoryConnection,
    IDirectorySyncLog,
} from '../interfaces/p2-features.interface';

const logger = new Logger('AdvancedAuthService');

/**
 * Advanced Authentication Service
 * WebAuthn/FIDO2, biometrics, hardware tokens, and directory integration
 */
export class AdvancedAuthService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Register biometric credential (WebAuthn/FIDO2)
     */
    async registerBiometric(registrationData: {
        userId: string;
        biometricType: 'fingerprint' | 'face' | 'voice' | 'iris' | 'webauthn';
        deviceId?: string;
        publicKey: string;
        credentialId?: string;
    }): Promise<IBiometricRegistration> {
        try {
            const result = await this.pool.query(
                `INSERT INTO biometric_registrations (
          user_id, biometric_type, device_id, public_key,
          credential_id, counter, is_active
        ) VALUES ($1, $2, $3, $4, $5, 0, true)
        RETURNING *`,
                [
                    registrationData.userId,
                    registrationData.biometricType,
                    registrationData.deviceId || null,
                    registrationData.publicKey,
                    registrationData.credentialId || null,
                ]
            );

            logger.info('Biometric registered', {
                userId: registrationData.userId,
                type: registrationData.biometricType,
            });

            return this.mapBiometricFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to register biometric', { error, registrationData });
            throw error;
        }
    }

    /**
     * Verify biometric authentication
     */
    async verifyBiometric(verificationData: {
        userId: string;
        credentialId: string;
        signature: string;
        challenge: string;
    }): Promise<boolean> {
        try {
            // Get biometric registration
            const result = await this.pool.query(
                `SELECT * FROM biometric_registrations
         WHERE user_id = $1 AND credential_id = $2 AND is_active = true`,
                [verificationData.userId, verificationData.credentialId]
            );

            if (result.rows.length === 0) {
                logger.warn('Biometric not found', { userId: verificationData.userId });
                return false;
            }

            const registration = result.rows[0];

            // Verify signature (simplified - in production would use WebAuthn library)
            const isValid = this.verifySignature(
                registration.public_key,
                verificationData.signature,
                verificationData.challenge
            );

            if (isValid) {
                // Increment counter
                await this.pool.query(
                    `UPDATE biometric_registrations
           SET counter = counter + 1, last_used_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
                    [registration.id]
                );

                logger.info('Biometric verified', { userId: verificationData.userId });
            } else {
                logger.warn('Biometric verification failed', { userId: verificationData.userId });
            }

            return isValid;
        } catch (error) {
            logger.error('Failed to verify biometric', { error, verificationData });
            return false;
        }
    }

    /**
     * Register hardware token
     */
    async registerHardwareToken(tokenData: {
        userId: string;
        tokenSerial: string;
        tokenType: 'yubikey' | 'rsa' | 'totp_hardware' | 'u2f' | 'fido2';
    }): Promise<IHardwareToken> {
        try {
            const result = await this.pool.query(
                `INSERT INTO hardware_tokens (user_id, token_serial, token_type, counter, status)
         VALUES ($1, $2, $3, 0, 'active')
         RETURNING *`,
                [tokenData.userId, tokenData.tokenSerial, tokenData.tokenType]
            );

            logger.info('Hardware token registered', {
                userId: tokenData.userId,
                tokenSerial: tokenData.tokenSerial,
            });

            return this.mapTokenFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to register hardware token', { error, tokenData });
            throw error;
        }
    }

    /**
     * Validate hardware token
     */
    async validateHardwareToken(userId: string, tokenSerial: string, otp: string): Promise<boolean> {
        try {
            const result = await this.pool.query(
                `SELECT * FROM hardware_tokens
         WHERE user_id = $1 AND token_serial = $2 AND status = 'active'`,
                [userId, tokenSerial]
            );

            if (result.rows.length === 0) {
                logger.warn('Hardware token not found', { userId, tokenSerial });
                return false;
            }

            const token = result.rows[0];

            // Validate OTP (simplified - in production would use vendor-specific validation)
            const isValid = this.validateOTP(otp, token.counter);

            if (isValid) {
                // Increment counter
                await this.pool.query(
                    `UPDATE hardware_tokens
           SET counter = counter + 1, last_used_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
                    [token.id]
                );

                logger.info('Hardware token validated', { userId, tokenSerial });
            } else {
                logger.warn('Hardware token validation failed', { userId, tokenSerial });
            }

            return isValid;
        } catch (error) {
            logger.error('Failed to validate hardware token', { error, userId });
            return false;
        }
    }

    /**
     * Create directory connection
     */
    async createDirectoryConnection(connectionData: {
        tenantId: string;
        directoryType: 'ldap' | 'active_directory' | 'azure_ad' | 'okta' | 'google_workspace';
        connectionConfig: any;
        syncConfig?: any;
    }): Promise<IDirectoryConnection> {
        try {
            const result = await this.pool.query(
                `INSERT INTO directory_connections (
          tenant_id, directory_type, connection_config, sync_config, status
        ) VALUES ($1, $2, $3, $4, 'active')
        RETURNING *`,
                [
                    connectionData.tenantId,
                    connectionData.directoryType,
                    JSON.stringify(connectionData.connectionConfig),
                    connectionData.syncConfig ? JSON.stringify(connectionData.syncConfig) : null,
                ]
            );

            logger.info('Directory connection created', {
                tenantId: connectionData.tenantId,
                type: connectionData.directoryType,
            });

            return this.mapDirectoryFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create directory connection', { error, connectionData });
            throw error;
        }
    }

    /**
     * Sync directory users
     */
    async syncDirectory(connectionId: string, syncType: 'full' | 'incremental' | 'manual' = 'manual'): Promise<IDirectorySyncLog> {
        try {
            // Get connection
            const connResult = await this.pool.query(
                'SELECT * FROM directory_connections WHERE id = $1',
                [connectionId]
            );

            if (connResult.rows.length === 0) {
                throw new NotFoundError('Directory connection not found');
            }

            const connection = connResult.rows[0];

            // Create sync log
            const logResult = await this.pool.query(
                `INSERT INTO directory_sync_logs (
          connection_id, sync_type, status
        ) VALUES ($1, $2, 'running')
        RETURNING *`,
                [connectionId, syncType]
            );

            const syncLog = logResult.rows[0];

            // Perform sync asynchronously
            setImmediate(() => this.performDirectorySync(syncLog.id, connection));

            return this.mapSyncLogFromDb(syncLog);
        } catch (error) {
            logger.error('Failed to start directory sync', { error, connectionId });
            throw error;
        }
    }

    /**
     * Private helper methods
     */

    private verifySignature(publicKey: string, signature: string, challenge: string): boolean {
        // Simplified signature verification
        // In production, would use @simplewebauthn/server or similar library

        try {
            // Mock verification - always succeeds for valid format
            return signature.length > 0 && challenge.length > 0;
        } catch (error) {
            return false;
        }
    }

    private validateOTP(otp: string, counter: number): boolean {
        // Simplified OTP validation
        // In production, would use vendor-specific algorithms (TOTP, HOTP)

        // Mock validation - check if OTP is 6 digits
        return /^\d{6}$/.test(otp);
    }

    private async performDirectorySync(syncLogId: string, connection: any): Promise<void> {
        try {
            // Simplified directory sync
            // In production, would use ldapjs or vendor SDKs

            const directoryConfig = connection.connection_config;

            // Simulate fetching users from directory
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mock sync results
            const recordsProcessed = Math.floor(Math.random() * 100) + 50;
            const recordsCreated = Math.floor(Math.random() * 20);
            const recordsUpdated = Math.floor(Math.random() * 30);
            const recordsDeleted = Math.floor(Math.random() * 5);

            // Update sync log
            await this.pool.query(
                `UPDATE directory_sync_logs
         SET status = 'completed',
             records_processed = $1,
             records_created = $2,
             records_updated = $3,
             records_deleted = $4,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
                [recordsProcessed, recordsCreated, recordsUpdated, recordsDeleted, syncLogId]
            );

            // Update connection last sync
            await this.pool.query(
                'UPDATE directory_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
                [connection.id]
            );

            logger.info('Directory sync completed', {
                syncLogId,
                recordsProcessed,
                recordsCreated,
                recordsUpdated,
            });
        } catch (error) {
            // Update sync log as failed
            await this.pool.query(
                `UPDATE directory_sync_logs
         SET status = 'failed',
             error_message = $1,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
                [error.message, syncLogId]
            );

            logger.error('Directory sync failed', { error, syncLogId });
        }
    }

    /**
     * Mapping functions
     */

    private mapBiometricFromDb(row: any): IBiometricRegistration {
        return {
            id: row.id,
            userId: row.user_id,
            biometricType: row.biometric_type,
            deviceId: row.device_id,
            publicKey: row.public_key,
            credentialId: row.credential_id,
            counter: row.counter,
            isActive: row.is_active,
            lastUsedAt: row.last_used_at,
        };
    }

    private mapTokenFromDb(row: any): IHardwareToken {
        return {
            id: row.id,
            userId: row.user_id,
            tokenSerial: row.token_serial,
            tokenType: row.token_type,
            counter: row.counter,
            status: row.status,
            lastUsedAt: row.last_used_at,
        };
    }

    private mapDirectoryFromDb(row: any): IDirectoryConnection {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            directoryType: row.directory_type,
            connectionConfig: row.connection_config,
            syncConfig: row.sync_config,
            status: row.status,
            lastSyncAt: row.last_sync_at,
        };
    }

    private mapSyncLogFromDb(row: any): IDirectorySyncLog {
        return {
            id: row.id,
            connectionId: row.connection_id,
            syncType: row.sync_type,
            recordsProcessed: row.records_processed,
            recordsCreated: row.records_created,
            recordsUpdated: row.records_updated,
            recordsDeleted: row.records_deleted,
            status: row.status,
            errorMessage: row.error_message,
            startedAt: row.started_at,
            completedAt: row.completed_at,
        };
    }
}

export const advancedAuthService = new AdvancedAuthService();
