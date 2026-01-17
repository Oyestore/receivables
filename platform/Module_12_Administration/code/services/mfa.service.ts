import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('MFAService');

export interface IMFASecret {
    secret: string;
    qrCode: string;
    backupCodes: string[];
}

export interface IMFASetting {
    id: string;
    userId: string;
    mfaEnabled: boolean;
    verifiedAt: Date | null;
}

/**
 * Multi-Factor Authentication Service
 * Implements TOTP-based MFA with backup codes
 */
export class MFAService {
    private pool: Pool;
    private readonly BACKUP_CODE_COUNT = 10;
    private readonly BACKUP_CODE_LENGTH = 8;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Generate MFA secret and QR code for enrollment
     */
    async generateSecret(userId: string, userEmail: string): Promise<IMFASecret> {
        try {
            // Check if user already has MFA
            const existing = await this.pool.query(
                'SELECT id FROM user_mfa_settings WHERE user_id = $1',
                [userId]
            );

            if (existing.rows.length > 0 && existing.rows[0].mfa_enabled) {
                throw new ValidationError('MFA is already enabled for this user');
            }

            // Generate secret
            const secret = speakeasy.generateSecret({
                name: `SME Platform (${userEmail})`,
                issuer: 'SME Receivables Platform',
                length: 32,
            });

            // Generate QR code
            const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url!);

            // Generate backup codes
            const backupCodes = await this.generateBackupCodes();

            // Store secret (not yet verified)
            await this.pool.query(
                `INSERT INTO user_mfa_settings (user_id, mfa_secret, mfa_enabled)
         VALUES ($1, $2, false)
         ON CONFLICT (user_id) DO UPDATE 
         SET mfa_secret = $2, mfa_enabled = false, verified_at = NULL`,
                [userId, secret.base32]
            );

            // Store backup codes (hashed)
            await this.storeBackupCodes(userId, backupCodes);

            logger.info('MFA secret generated', { userId });

            return {
                secret: secret.base32,
                qrCode: qrCodeDataURL,
                backupCodes,
            };
        } catch (error) {
            logger.error('Failed to generate MFA secret', { error, userId });
            throw error;
        }
    }

    /**
     * Verify TOTP token and enable MFA
     */
    async verifyAndEnable(userId: string, token: string): Promise<boolean> {
        try {
            // Get user's MFA secret
            const result = await this.pool.query(
                'SELECT mfa_secret FROM user_mfa_settings WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length === 0 || !result.rows[0].mfa_secret) {
                throw new ValidationError('No MFA secret found. Please enroll first.');
            }

            const secret = result.rows[0].mfa_secret;

            // Verify token
            const verified = speakeasy.totp.verify({
                secret,
                encoding: 'base32',
                token,
                window: 2, // Allow 2 time steps before/after for clock skew
            });

            if (!verified) {
                logger.warn('Invalid MFA token', { userId });
                return false;
            }

            // Enable MFA
            await this.pool.query(
                `UPDATE user_mfa_settings 
         SET mfa_enabled = true, verified_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1`,
                [userId]
            );

            logger.info('MFA enabled', { userId });
            return true;
        } catch (error) {
            logger.error('Failed to verify and enable MFA', { error, userId });
            throw error;
        }
    }

    /**
     * Validate TOTP token during login
     */
    async validateToken(userId: string, token: string): Promise<boolean> {
        try {
            // Get user's MFA settings
            const result = await this.pool.query(
                'SELECT mfa_secret, mfa_enabled FROM user_mfa_settings WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length === 0 || !result.rows[0].mfa_enabled) {
                throw new ValidationError('MFA is not enabled for this user');
            }

            const secret = result.rows[0].mfa_secret;

            // Verify token
            const verified = speakeasy.totp.verify({
                secret,
                encoding: 'base32',
                token,
                window: 2,
            });

            if (verified) {
                logger.info('MFA token validated', { userId });
            } else {
                logger.warn('Invalid MFA token during login', { userId });
            }

            return verified;
        } catch (error) {
            logger.error('Failed to validate MFA token', { error, userId });
            throw error;
        }
    }

    /**
     * Validate backup code
     */
    async validateBackupCode(userId: string, code: string): Promise<boolean> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get all unused backup codes
            const result = await client.query(
                'SELECT id, code_hash FROM mfa_backup_codes WHERE user_id = $1 AND used_at IS NULL',
                [userId]
            );

            if (result.rows.length === 0) {
                logger.warn('No unused backup codes', { userId });
                return false;
            }

            // Check each code
            for (const row of result.rows) {
                const matches = await bcrypt.compare(code, row.code_hash);

                if (matches) {
                    // Mark code as used
                    await client.query(
                        'UPDATE mfa_backup_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
                        [row.id]
                    );

                    await client.query('COMMIT');

                    logger.info('Backup code used', { userId });
                    return true;
                }
            }

            await client.query('COMMIT');

            logger.warn('Invalid backup code', { userId });
            return false;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to validate backup code', { error, userId });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Disable MFA for user
     */
    async disable(userId: string): Promise<void> {
        try {
            await this.pool.query(
                `UPDATE user_mfa_settings 
         SET mfa_enabled = false, mfa_secret = NULL, verified_at = NULL 
         WHERE user_id = $1`,
                [userId]
            );

            // Delete backup codes
            await this.pool.query(
                'DELETE FROM mfa_backup_codes WHERE user_id = $1',
                [userId]
            );

            logger.info('MFA disabled', { userId });
        } catch (error) {
            logger.error('Failed to disable MFA', { error, userId });
            throw error;
        }
    }

    /**
     * Check if MFA is enabled for user
     */
    async isEnabled(userId: string): Promise<boolean> {
        try {
            const result = await this.pool.query(
                'SELECT mfa_enabled FROM user_mfa_settings WHERE user_id = $1',
                [userId]
            );

            return result.rows.length > 0 && result.rows[0].mfa_enabled;
        } catch (error) {
            logger.error('Failed to check MFA status', { error, userId });
            throw error;
        }
    }

    /**
     * Regenerate backup codes
     */
    async regenerateBackupCodes(userId: string): Promise<string[]> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Delete old backup codes
            await client.query(
                'DELETE FROM mfa_backup_codes WHERE user_id = $1',
                [userId]
            );

            // Generate new backup codes
            const backupCodes = await this.generateBackupCodes();

            // Store new codes
            await this.storeBackupCodes(userId, backupCodes, client);

            await client.query('COMMIT');

            logger.info('Backup codes regenerated', { userId });

            return backupCodes;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to regenerate backup codes', { error, userId });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get MFA status with remaining backup codes count
     */
    async getMFAStatus(userId: string): Promise<{
        enabled: boolean;
        verifiedAt: Date | null;
        remainingBackupCodes: number;
    }> {
        try {
            const settingsResult = await this.pool.query(
                'SELECT mfa_enabled, verified_at FROM user_mfa_settings WHERE user_id = $1',
                [userId]
            );

            const codesResult = await this.pool.query(
                'SELECT COUNT(*) as count FROM mfa_backup_codes WHERE user_id = $1 AND used_at IS NULL',
                [userId]
            );

            return {
                enabled: settingsResult.rows.length > 0 && settingsResult.rows[0].mfa_enabled,
                verifiedAt: settingsResult.rows.length > 0 ? settingsResult.rows[0].verified_at : null,
                remainingBackupCodes: parseInt(codesResult.rows[0].count, 10),
            };
        } catch (error) {
            logger.error('Failed to get MFA status', { error, userId });
            throw error;
        }
    }

    /**
     * Generate backup codes
     */
    private async generateBackupCodes(): Promise<string[]> {
        const codes: string[] = [];

        for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
            const code = crypto.randomBytes(this.BACKUP_CODE_LENGTH / 2).toString('hex').toUpperCase();
            // Format as XXXX-XXXX for readability
            const formattedCode = `${code.substring(0, 4)}-${code.substring(4, 8)}`;
            codes.push(formattedCode);
        }

        return codes;
    }

    /**
     * Store backup codes (hashed)
     */
    private async storeBackupCodes(
        userId: string,
        codes: string[],
        client?: any
    ): Promise<void> {
        const queryClient = client || this.pool;

        for (const code of codes) {
            const codeHash = await bcrypt.hash(code, 10);

            await queryClient.query(
                'INSERT INTO mfa_backup_codes (user_id, code_hash) VALUES ($1, $2)',
                [userId, codeHash]
            );
        }
    }
}

export const mfaService = new MFAService();
