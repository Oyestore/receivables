import { MFAService } from '../code/services/mfa.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('bcrypt');

describe('MFAService', () => {
    let mfaService: MFAService;
    let mockPool: any;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock pool
        mockPool = {
            query: jest.fn(),
            connect: jest.fn(() => ({
                query: jest.fn(),
                release: jest.fn(),
            })),
        };

        // Mock database service
        jest.spyOn(require('../../../Module_11_Common/code/database/database.service'), 'databaseService').mockReturnValue({
            getPool: () => mockPool,
        });

        mfaService = new MFAService();
    });

    describe('generateSecret', () => {
        it('should generate MFA secret and QR code', async () => {
            const userId = 'user-123';
            const email = 'test@example.com';

            // Mock speakeasy
            (speakeasy.generateSecret as jest.Mock).mockReturnValue({
                base32: 'TESTSECRET123',
                otpauth_url: 'otpauth://totp/SME%20Platform:test@example.com',
            });

            // Mock QRCode
            (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,...');

            // Mock bcrypt
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-backup-code');

            // Mock database
            mockPool.query.mockResolvedValueOnce({ rows: [] }); // Check existing
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'mfa-1' }] }); // Insert settings
            mockPool.query.mockResolvedValue({ rows: [] }); // Insert backup codes

            const result = await mfaService.generateSecret(userId, email);

            expect(result).toHaveProperty('secret');
            expect(result).toHaveProperty('qrCode');
            expect(result).toHaveProperty('backupCodes');
            expect(result.backupCodes).toHaveLength(10);
            expect(speakeasy.generateSecret).toHaveBeenCalled();
            expect(QRCode.toDataURL).toHaveBeenCalled();
        });

        it('should throw error if MFA already enabled', async () => {
            const userId = 'user-123';
            const email = 'test@example.com';

            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 'mfa-1', mfa_enabled: true }],
            });

            await expect(mfaService.generateSecret(userId, email)).rejects.toThrow(
                'MFA is already enabled for this user'
            );
        });
    });

    describe('verifyAndEnable', () => {
        it('should verify token and enable MFA', async () => {
            const userId = 'user-123';
            const token = '123456';

            mockPool.query.mockResolvedValueOnce({
                rows: [{ mfa_secret: 'TESTSECRET123' }],
            });

            (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

            mockPool.query.mockResolvedValueOnce({ rows: [] }); // Update query

            const result = await mfaService.verifyAndEnable(userId, token);

            expect(result).toBe(true);
            expect(speakeasy.totp.verify).toHaveBeenCalledWith({
                secret: 'TESTSECRET123',
                encoding: 'base32',
                token,
                window: 2,
            });
        });

        it('should return false for invalid token', async () => {
            const userId = 'user-123';
            const token = '999999';

            mockPool.query.mockResolvedValueOnce({
                rows: [{ mfa_secret: 'TESTSECRET123' }],
            });

            (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

            const result = await mfaService.verifyAndEnable(userId, token);

            expect(result).toBe(false);
        });

        it('should throw error if no secret found', async () => {
            const userId = 'user-123';
            const token = '123456';

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await expect(mfaService.verifyAndEnable(userId, token)).rejects.toThrow(
                'No MFA secret found'
            );
        });
    });

    describe('validateToken', () => {
        it('should validate TOTP token', async () => {
            const userId = 'user-123';
            const token = '123456';

            mockPool.query.mockResolvedValueOnce({
                rows: [{ mfa_secret: 'TESTSECRET123', mfa_enabled: true }],
            });

            (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

            const result = await mfaService.validateToken(userId, token);

            expect(result).toBe(true);
        });

        it('should return false for invalid token', async () => {
            const userId = 'user-123';
            const token = '999999';

            mockPool.query.mockResolvedValueOnce({
                rows: [{ mfa_secret: 'TESTSECRET123', mfa_enabled: true }],
            });

            (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

            const result = await mfaService.validateToken(userId, token);

            expect(result).toBe(false);
        });
    });

    describe('validateBackupCode', () => {
        it('should validate and mark backup code as used', async () => {
            const userId = 'user-123';
            const code = 'ABCD-1234';

            const mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };

            mockPool.connect.mockResolvedValue(mockClient);

            // Mock backup codes query
            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({
                    // SELECT backup codes
                    rows: [
                        { id: 'code-1', code_hash: 'hashed-code-1' },
                        { id: 'code-2', code_hash: 'hashed-code-2' },
                    ],
                });

            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

            mockClient.query
                .mockResolvedValueOnce() // UPDATE used_at
                .mockResolvedValueOnce(); // COMMIT

            const result = await mfaService.validateBackupCode(userId, code);

            expect(result).toBe(true);
            expect(mockClient.query).toHaveBeenCalledWith(
                'UPDATE mfa_backup_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
                ['code-2']
            );
        });

        it('should return false for invalid backup code', async () => {
            const userId = 'user-123';
            const code = 'INVALID';

            const mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };

            mockPool.connect.mockResolvedValue(mockClient);

            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce({
                    // SELECT backup codes
                    rows: [{ id: 'code-1', code_hash: 'hashed-code-1' }],
                });

            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            mockClient.query.mockResolvedValueOnce(); // COMMIT

            const result = await mfaService.validateBackupCode(userId, code);

            expect(result).toBe(false);
        });
    });

    describe('disable', () => {
        it('should disable MFA and delete backup codes', async () => {
            const userId = 'user-123';

            mockPool.query.mockResolvedValue({ rows: [] });

            await mfaService.disable(userId);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE user_mfa_settings'),
                [userId]
            );
            expect(mockPool.query).toHaveBeenCalledWith(
                'DELETE FROM mfa_backup_codes WHERE user_id = $1',
                [userId]
            );
        });
    });

    describe('isEnabled', () => {
        it('should return true if MFA is enabled', async () => {
            const userId = 'user-123';

            mockPool.query.mockResolvedValueOnce({
                rows: [{ mfa_enabled: true }],
            });

            const result = await mfaService.isEnabled(userId);

            expect(result).toBe(true);
        });

        it('should return false if MFA is not enabled', async () => {
            const userId = 'user-123';

            mockPool.query.mockResolvedValueOnce({
                rows: [{ mfa_enabled: false }],
            });

            const result = await mfaService.isEnabled(userId);

            expect(result).toBe(false);
        });

        it('should return false if no MFA settings found', async () => {
            const userId = 'user-123';

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const result = await mfaService.isEnabled(userId);

            expect(result).toBe(false);
        });
    });

    describe('regenerateBackupCodes', () => {
        it('should delete old codes and generate new ones', async () => {
            const userId = 'user-123';

            const mockClient = {
                query: jest.fn(),
                release: jest.fn(),
            };

            mockPool.connect.mockResolvedValue(mockClient);

            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');

            mockClient.query
                .mockResolvedValueOnce() // BEGIN
                .mockResolvedValueOnce() // DELETE old codes
                .mockResolvedValue(); // INSERT new codes + COMMIT

            const codes = await mfaService.regenerateBackupCodes(userId);

            expect(codes).toHaveLength(10);
            expect(codes[0]).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
            expect(mockClient.query).toHaveBeenCalledWith(
                'DELETE FROM mfa_backup_codes WHERE user_id = $1',
                [userId]
            );
        });
    });

    describe('getMFAStatus', () => {
        it('should return MFA status with remaining backup codes', async () => {
            const userId = 'user-123';

            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ mfa_enabled: true, verified_at: new Date() }],
                })
                .mockResolvedValueOnce({
                    rows: [{ count: '5' }],
                });

            const status = await mfaService.getMFAStatus(userId);

            expect(status).toEqual({
                enabled: true,
                verifiedAt: expect.any(Date),
                remainingBackupCodes: 5,
            });
        });
    });
});
