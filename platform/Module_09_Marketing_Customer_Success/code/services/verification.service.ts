import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationRequest, VerificationStatus } from '../entities/verification-request.entity';

@Injectable()
export class VerificationService {
    private readonly logger = new Logger(VerificationService.name);

    constructor(
        @InjectRepository(VerificationRequest)
        private repo: Repository<VerificationRequest>
    ) { }

    async createRequest(tenantId: string, partnerEmail: string, partnerName: string): Promise<VerificationRequest> {
        // 1. Self-Vouch Guard (Simple Domain Check)
        if (partnerEmail.includes('me.com')) {
            throw new Error("Self-Verification Blocked: You cannot invite your own domain.");
        }

        // 2. Network Intelligence (Viral Loop)
        // Check if this partner is ALREADY a platform user?
        const isNetworkUser = partnerEmail.includes('platform.com') || partnerEmail.includes('trusted'); // Mock Check

        const req = this.repo.create({
            requesterTenantId: tenantId,
            partnerEmail,
            partnerName,
            status: VerificationStatus.PENDING,
            trustLevel: isNetworkUser ? 'GOLD' : 'SILVER'
        });
        const saved = await this.repo.save(req);

        this.logger.log(`[Viral Loop] Sent ${saved.trustLevel} Verification Link to ${partnerEmail}: https://platform.com/verify/${saved.id}`);

        return saved;
    }

    async submitVerification(requestId: string, rating: number, comments: string): Promise<VerificationRequest> {
        const req = await this.repo.findOne({ where: { id: requestId } });
        if (!req) throw new Error('Request not found');

        req.status = VerificationStatus.VERIFIED;
        req.rating = rating;
        req.comments = comments;
        req.verifiedAt = new Date();

        // Impact Analysis: This should ideally boost the SME's Credit Score in Module 06
        this.logger.log(`[Trust Score] SME ${req.requesterTenantId} verified by partner with ${rating} stars.`);

        return this.repo.save(req);
    }
}
