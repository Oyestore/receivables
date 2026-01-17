import request from 'supertest';
import express, { Application } from 'express';
import adminRoutes from '../code/routes/administration.routes';
import { mfaService } from '../code/services/mfa.service';
import { subscriptionService } from '../code/services/subscription.service';

// Mock services
jest.mock('../code/services/mfa.service');
jest.mock('../code/services/subscription.service');
jest.mock('../code/services/audit.service');

describe('Administration API Integration Tests', () => {
    let app: Application;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        // Mock authentication middleware
        app.use((req: any, res, next) => {
            req.user = {
                id: 'user-123',
                email: 'test@example.com',
                tenantId: 'tenant-123',
            };
            next();
        });

        app.use('/api/v1', adminRoutes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('MFA Endpoints', () => {
        describe('POST /api/v1/auth/mfa/enroll', () => {
            it('should start MFA enrollment', async () => {
                const mockMFAData = {
                    secret: 'TESTSECRET123',
                    qrCode: 'data:image/png;base64,...',
                    backupCodes: ['ABCD-1234', 'EFGH-5678'],
                };

                (mfaService.generateSecret as jest.Mock).mockResolvedValue(mockMFAData);

                const response = await request(app)
                    .post('/api/v1/auth/mfa/enroll')
                    .expect(200);

                expect(response.body).toHaveProperty('data');
                expect(response.body.data).toHaveProperty('qrCode');
                expect(response.body.data).toHaveProperty('backupCodes');
                expect(mfaService.generateSecret).toHaveBeenCalledWith('user-123', 'test@example.com');
            });
        });

        describe('POST /api/v1/auth/mfa/verify', () => {
            it('should verify MFA token and enable MFA', async () => {
                (mfaService.verifyAndEnable as jest.Mock).mockResolvedValue(true);

                const response = await request(app)
                    .post('/api/v1/auth/mfa/verify')
                    .send({ token: '123456' })
                    .expect(200);

                expect(response.body.data.enabled).toBe(true);
                expect(mfaService.verifyAndEnable).toHaveBeenCalledWith('user-123', '123456');
            });

            it('should return 400 for invalid token', async () => {
                (mfaService.verifyAndEnable as jest.Mock).mockResolvedValue(false);

                const response = await request(app)
                    .post('/api/v1/auth/mfa/verify')
                    .send({ token: '999999' })
                    .expect(400);

                expect(response.body).toHaveProperty('error');
            });

            it('should return 400 if token is missing', async () => {
                const response = await request(app)
                    .post('/api/v1/auth/mfa/verify')
                    .send({})
                    .expect(400);

                expect(response.body.details[0].message).toContain('token');
            });
        });

        describe('GET /api/v1/auth/mfa/status', () => {
            it('should return MFA status', async () => {
                const mockStatus = {
                    enabled: true,
                    verifiedAt: new Date(),
                    remainingBackupCodes: 8,
                };

                (mfaService.getMFAStatus as jest.Mock).mockResolvedValue(mockStatus);

                const response = await request(app)
                    .get('/api/v1/auth/mfa/status')
                    .expect(200);

                expect(response.body.data).toEqual(expect.objectContaining({
                    enabled: true,
                    remainingBackupCodes: 8,
                }));
            });
        });
    });

    describe('Subscription Endpoints', () => {
        describe('GET /api/v1/subscriptions/plans', () => {
            it('should list all subscription plans', async () => {
                const mockPlans = [
                    { id: 'plan-1', planName: 'Free', basePrice: 0 },
                    { id: 'plan-2', planName: 'Pro', basePrice: 99.99 },
                ];

                (subscriptionService.listPlans as jest.Mock).mockResolvedValue(mockPlans);

                const response = await request(app)
                    .get('/api/v1/subscriptions/plans')
                    .expect(200);

                expect(response.body.data).toHaveLength(2);
                expect(response.body.total).toBe(2);
            });
        });

        describe('POST /api/v1/tenant/:tenantId/subscription', () => {
            it('should subscribe tenant to plan', async () => {
                const mockSubscription = {
                    id: 'sub-123',
                    tenantId: 'tenant-123',
                    planId: 'plan-pro',
                    status: 'active',
                };

                (subscriptionService.subscribeTenant as jest.Mock).mockResolvedValue(mockSubscription);

                const response = await request(app)
                    .post('/api/v1/tenant/tenant-123/subscription')
                    .send({ planId: 'plan-pro', trialDays: 14 })
                    .expect(201);

                expect(response.body.data.id).toBe('sub-123');
                expect(subscriptionService.subscribeTenant).toHaveBeenCalledWith(
                    'tenant-123',
                    'plan-pro',
                    expect.objectContaining({ trialDays: 14 })
                );
            });

            it('should return 400 if planId is missing', async () => {
                const response = await request(app)
                    .post('/api/v1/tenant/tenant-123/subscription')
                    .send({})
                    .expect(400);

                expect(response.body.details[0].message).toContain('planId');
            });
        });

        describe('PUT /api/v1/tenant/:tenantId/subscription/upgrade', () => {
            it('should upgrade subscription with proration', async () => {
                const mockResult = {
                    subscription: {
                        id: 'sub-123',
                        planId: 'plan-enterprise',
                    },
                    prorationAmount: 25.50,
                };

                (subscriptionService.upgradeSubscription as jest.Mock).mockResolvedValue(mockResult);

                const response = await request(app)
                    .put('/api/v1/tenant/tenant-123/subscription/upgrade')
                    .send({ planId: 'plan-enterprise' })
                    .expect(200);

                expect(response.body.data.prorationAmount).toBe(25.50);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle service errors gracefully', async () => {
            (mfaService.generateSecret as jest.Mock).mockRejectedValue(
                new Error('Database connection failed')
            );

            const response = await request(app)
                .post('/api/v1/auth/mfa/enroll')
                .expect(500);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/api/v1/nonexistent')
                .expect(404);

            expect(response.body).toHaveProperty('error');
        });
    });
});
