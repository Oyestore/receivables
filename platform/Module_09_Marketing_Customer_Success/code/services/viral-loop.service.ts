import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import { User } from '../../Module_12_Administration/code/entities/user.entity'; // Assuming entity existence/path

@Injectable()
export class ViralLoopService {
    private readonly logger = new Logger(ViralLoopService.name);

    constructor(
        private referralService: ReferralService,
        // In a real implementation, we would inject User Repo or AuthService
    ) { }

    /**
     * Injects a viral referral loop at the end of a Payer's journey (e.g., after Payment Success).
     * Returns a specialized signup link with embedded referral data.
     */
    async injectViralMechanic(payerEmail: string, originInvoiceId: string, tenantId: string): Promise<{
        viralOffer: string;
        signupLink: string;
        potentialReward: string;
    }> {
        this.logger.log(`Injecting viral loop for payer ${payerEmail} on invoice ${originInvoiceId}`);

        // 1. Generate a specialized referral code for the Tenant (Referrer)
        // We find the tenant's owner or default referrer to attribute this new sign-up to.
        // For simulation, we use a placeholder referrer ID or specific logic.
        const referrerId = 'tenant-owner-id'; // This would be dynamic
        const referralCode = this.referralService.generateReferralCode({ campaign: 'VIRAL_INVOICE_PAYMENT' });

        // 2. Create the "Instant" Sign-up Token (simulated)
        const signupToken = Buffer.from(JSON.stringify({
            email: payerEmail,
            source: 'INVOICE_PAYMENT',
            referrer: referrerId,
            originInvoice: originInvoiceId
        })).toString('base64');

        return {
            viralOffer: "Manage your own invoices like a pro. Get 3 months free.",
            signupLink: `https://platform.sme/signup?token=${signupToken}&ref=${referralCode}`,
            potentialReward: "₹500 Credits"
        };
    }

    /**
     * Converts a Payer (Consumer) into a Tenant (Business User).
     * "The Loop" closure.
     */
    async convertPayerToUser(signupToken: string, passwordHash: string): Promise<{ success: boolean; userId: string; message: string }> {
        try {
            const decoded = JSON.parse(Buffer.from(signupToken, 'base64').toString());
            this.logger.log(`Converting viral lead: ${decoded.email}`);

            // 1. Validate Token (Mock)
            if (!decoded.email || !decoded.referrer) {
                throw new HttpException('Invalid Token', HttpStatus.BAD_REQUEST);
            }

            // 2. Create User/Tenant (Mock - Simulation of M12 logic)
            // const newUser = await this.userRepo.create(...)
            const newUserId = `user_viral_${Date.now()}`;

            // 3. Attribute Referral
            // We call the existent ReferralService to track this conversion
            // We mock the "Referral" creation on the fly since we generated the code dynamically above
            // In a real scenario, we might have pre-created a PENDING referral record in `injectViralMechanic`

            // For now, we simulate the attribution:
            this.logger.log(`Attributing referral to ${decoded.referrer}`);

            // 4. Track Tracking "K-Factor" (Viral Coefficient)
            await this.trackViralCoefficient(newUserId, decoded.referrer);

            return {
                success: true,
                userId: newUserId,
                message: "Account created! Viral referral attributed."
            };
        } catch (error) {
            this.logger.error(`Viral conversion failed: ${error.message}`);
            throw new HttpException('Conversion Failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private async trackViralCoefficient(newUserId: string, referrerId: string) {
        // Logic to update analytics on "Invites per User"
        // This closes the loop for M09 Analytics
        this.logger.log(`Updated K-Factor metrics for ${referrerId}`);
    }
}
