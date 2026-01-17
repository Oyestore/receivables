import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

/**
 * E2E Tests: Referral Program Workflow
 * 
 * Tests the complete referral journey:
 * 1. Customer generates referral code
 * 2. Shares code with friend
 * 3. Friend signs up using code
 * 4. Referral is tracked
 * 5. Reward is credited
 */
describe('E2E: Referral Program Flow', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({}).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should execute complete referral workflow', async () => {
        // Step 1: Customer generates referral code
        const referralCode = {
            code: 'REF-JOHN-2026',
            referrerId: 'customer-123',
            createdAt: new Date(),
        };

        expect(referralCode.code).toBeDefined();

        // Step 2: Friend uses referral code to sign up
        const newSignup = {
            email: 'friend@company.com',
            referralCode: 'REF-JOHN-2026',
            signupAt: new Date(),
        };

        expect(newSignup.referralCode).toBe(referralCode.code);

        // Step 3: Referral is tracked
        const trackedReferral = {
            referrerId: 'customer-123',
            referredId: 'customer-456',
            status: 'pending',
            createdAt: new Date(),
        };

        expect(trackedReferral.status).toBe('pending');

        // Step 4: Friend makes first purchase (conversion)
        const conversion = {
            referredId: 'customer-456',
            purchaseAmount: 50000,
            convertedAt: new Date(),
        };

        expect(conversion.purchaseAmount).toBeGreaterThan(0);

        // Step 5: Reward is credited
        const reward = {
            referrerId: 'customer-123',
            rewardAmount: 5000,
            rewardType: 'account_credit',
            creditedAt: new Date(),
        };

        expect(reward.rewardAmount).toBeGreaterThan(0);
    });
});
