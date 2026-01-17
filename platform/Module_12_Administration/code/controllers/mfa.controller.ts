import { Request, Response, NextFunction } from 'express';
import { mfaService } from '../services/mfa.service';
import { auditService } from '../services/audit.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('MFAController');

export class MFAController {
    /**
     * POST /api/v1/auth/mfa/enroll
     * Start MFA enrollment
     */
    async enroll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.id;
            const email = req.user?.email;

            if (!userId || !email) {
                throw new ValidationError('User not authenticated');
            }

            const { secret, qrCode, backupCodes } = await mfaService.generateSecret(userId, email);

            // Audit log
            await auditService.log({
                tenantId: req.user?.tenantId,
                userId,
                action: 'mfa.enroll_start',
                resourceType: 'user',
                resourceId: userId,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(200).json({
                message: 'MFA enrollment started',
                data: {
                    qrCode,
                    backupCodes,
                    secret: secret, // Return for manual entry
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/auth/mfa/verify
     * Verify TOTP token and enable MFA
     */
    async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.id;
            const { token } = req.body;

            if (!userId) {
                throw new ValidationError('User not authenticated');
            }

            if (!token) {
                throw new ValidationError('Token is required');
            }

            const verified = await mfaService.verifyAndEnable(userId, token);

            if (!verified) {
                await auditService.logSecurityEvent({
                    tenantId: req.user?.tenantId,
                    userId,
                    eventType: 'mfa.verification_failed',
                    severity: 'medium',
                    description: 'Failed MFA verification attempt',
                });

                res.status(400).json({
                    error: 'Verification Failed',
                    message: 'Invalid token. Please try again.',
                });
                return;
            }

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId,
                action: 'mfa.enabled',
                resourceType: 'user',
                resourceId: userId,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(200).json({
                message: 'MFA enabled successfully',
                data: { enabled: true },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/auth/mfa/validate
     * Validate TOTP token during login
     */
    async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId, token, backupCode } = req.body;

            if (!userId) {
                throw new ValidationError('User ID is required');
            }

            let isValid = false;

            // Try TOTP token first
            if (token) {
                isValid = await mfaService.validateToken(userId, token);
            }

            // Try backup code if token failed
            if (!isValid && backupCode) {
                isValid = await mfaService.validateBackupCode(userId, backupCode);
            }

            if (!isValid) {
                await auditService.logSecurityEvent({
                    tenantId: req.user?.tenantId,
                    userId,
                    eventType: 'mfa.validation_failed',
                    severity: 'high',
                    description: 'Failed MFA validation during login',
                    metadata: { ipAddress: req.ip },
                });

                res.status(401).json({
                    error: 'Validation Failed',
                    message: 'Invalid MFA token or backup code',
                });
                return;
            }

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId,
                action: 'mfa.validated',
                resourceType: 'user',
                resourceId: userId,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(200).json({
                message: 'MFA validation successful',
                data: { valid: true },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/auth/mfa/backup-codes/regenerate
     * Regenerate backup codes
     */
    async regenerateBackupCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.id;

            if (!userId) {
                throw new ValidationError('User not authenticated');
            }

            const backupCodes = await mfaService.regenerateBackupCodes(userId);

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId,
                action: 'mfa.backup_codes_regenerated',
                resourceType: 'user',
                resourceId: userId,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(200).json({
                message: 'Backup codes regenerated',
                data: { backupCodes },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/auth/mfa/disable
     * Disable MFA
     */
    async disable(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.id;
            const { password } = req.body;

            if (!userId) {
                throw new ValidationError('User not authenticated');
            }

            if (!password) {
                throw new ValidationError('Password confirmation required');
            }

            // In production, verify password before disabling
            // const passwordValid = await verifyPassword(userId, password);
            // if (!passwordValid) throw new UnauthorizedError('Invalid password');

            await mfaService.disable(userId);

            await auditService.log({
                tenantId: req.user?.tenantId,
                userId,
                action: 'mfa.disabled',
                resourceType: 'user',
                resourceId: userId,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(200).json({
                message: 'MFA disabled successfully',
                data: { enabled: false },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/auth/mfa/status
     * Get MFA status
     */
    async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.id;

            if (!userId) {
                throw new ValidationError('User not authenticated');
            }

            const status = await mfaService.getMFAStatus(userId);

            res.status(200).json({
                data: status,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const mfaController = new MFAController();
