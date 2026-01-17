import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisputeCase, DisputeStatus, DisputeType, DisputePriority } from '../entities/dispute-case.entity';
import { DisputeStatsResult } from '../shared/constants';

interface CreateDisputeDto {
    tenantId: string;
    invoiceId: string;
    customerId: string;
    customerName: string;
    type: DisputeType;
    disputedAmount: number;
    description: string;
    priority?: DisputePriority;
    createdBy: string;
}

@Injectable()
export class DisputeManagementService {
    private readonly logger = new Logger(DisputeManagementService.name);

    constructor(
        @InjectRepository(DisputeCase)
        private readonly disputeCaseRepository: Repository<DisputeCase>
    ) { }

    /**
     * Generate unique case number
     */
    private generateCaseNumber(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `DSP-${timestamp}-${random}`;
    }

    /**
     * Create a new dispute case
     */
    async createDispute(dto: CreateDisputeDto): Promise<DisputeCase> {
        const caseNumber = this.generateCaseNumber();

        const disputeCase = this.disputeCaseRepository.create({
            ...dto,
            caseNumber,
            status: DisputeStatus.DRAFT,
            priority: dto.priority || DisputePriority.MEDIUM,
            timeline: [
                {
                    date: new Date(),
                    event: 'Case Created',
                    description: 'Dispute case created in the system',
                    performedBy: dto.createdBy
                }
            ]
        });

        const saved = await this.disputeCaseRepository.save(disputeCase);
        this.logger.log(`Created dispute case ${caseNumber} for invoice ${dto.invoiceId}`);

        return saved;
    }

    /**
     * File a dispute (move from draft to filed)
     */
    async fileDispute(caseId: string, filedBy: string): Promise<DisputeCase> {
        const disputeCase = await this.disputeCaseRepository.findOne({
            where: { id: caseId }
        });

        if (!disputeCase) {
            throw new NotFoundException(`Dispute case ${caseId} not found`);
        }

        disputeCase.status = DisputeStatus.FILED;
        disputeCase.filedAt = new Date();

        const timeline = disputeCase.timeline || [];
        timeline.push({
            date: new Date(),
            event: 'Case Filed',
            description: 'Dispute case formally filed',
            performedBy: filedBy
        });
        disputeCase.timeline = timeline;

        await this.disputeCaseRepository.save(disputeCase);
        this.logger.log(`Filed dispute case ${disputeCase.caseNumber}`);

        return disputeCase;
    }

    /**
     * Update dispute status
     */
    async updateStatus(
        caseId: string,
        newStatus: DisputeStatus,
        updatedBy: string,
        notes?: string
    ): Promise<DisputeCase> {
        const disputeCase = await this.disputeCaseRepository.findOne({
            where: { id: caseId }
        });

        if (!disputeCase) {
            throw new NotFoundException(`Dispute case ${caseId} not found`);
        }

        const oldStatus = disputeCase.status;
        disputeCase.status = newStatus;

        if (notes) {
            disputeCase.notes = (disputeCase.notes || '') + `\n[${new Date().toISOString()}] ${notes}`;
        }

        const timeline = disputeCase.timeline || [];
        timeline.push({
            date: new Date(),
            event: `Status Changed: ${oldStatus} → ${newStatus}`,
            description: notes || 'Status updated',
            performedBy: updatedBy
        });
        disputeCase.timeline = timeline;

        if (newStatus === DisputeStatus.RESOLVED || newStatus === DisputeStatus.CLOSED) {
            disputeCase.resolvedAt = new Date();
        }

        await this.disputeCaseRepository.save(disputeCase);
        this.logger.log(`Updated dispute case ${disputeCase.caseNumber} status to ${newStatus}`);

        return disputeCase;
    }

    // Adapter: findDisputeById (for tests)
    async findDisputeById(caseId: string, tenantId?: string): Promise<DisputeCase> {
        return this.getDisputeById(caseId);
    }

    /**
     * Adapter: updateDisputeStatus (for tests)
     */
    async updateDisputeStatus(
        caseId: string,
        status: DisputeStatus | string,
        updatedBy: string,
        notes?: string
    ): Promise<DisputeCase> {
        const enumStatus = typeof status === 'string' ? (DisputeStatus as any)[status] || status : status;
        return this.updateStatus(caseId, enumStatus as DisputeStatus, updatedBy, notes);
    }

    /**
     * Add evidence to dispute
     */
    async addEvidence(
        caseId: string,
        evidenceType: 'documents' | 'communications',
        evidenceData: any,
        addedBy: string
    ): Promise<DisputeCase> {
        const disputeCase = await this.disputeCaseRepository.findOne({
            where: { id: caseId }
        });

        if (!disputeCase) {
            throw new NotFoundException(`Dispute case ${caseId} not found`);
        }

        const evidence = disputeCase.evidence || { documents: [], communications: [] };

        if (evidenceType === 'documents') {
            evidence.documents.push(evidenceData);
        } else {
            evidence.communications.push(evidenceData);
        }

        disputeCase.evidence = evidence;

        const timeline = disputeCase.timeline || [];
        timeline.push({
            date: new Date(),
            event: 'Evidence Added',
            description: `${evidenceType} evidence added to the case`,
            performedBy: addedBy
        });
        disputeCase.timeline = timeline;

        await this.disputeCaseRepository.save(disputeCase);
        this.logger.log(`Added ${evidenceType} evidence to dispute case ${disputeCase.caseNumber}`);

        return disputeCase;
    }

    /**
     * Assign legal provider to dispute
     */
    async assignLegalProvider(
        caseId: string,
        providerId: string,
        assignedBy: string
    ): Promise<DisputeCase> {
        const disputeCase = await this.disputeCaseRepository.findOne({
            where: { id: caseId }
        });

        if (!disputeCase) {
            throw new NotFoundException(`Dispute case ${caseId} not found`);
        }

        disputeCase.assignedLegalProviderId = providerId;
        disputeCase.status = DisputeStatus.UNDER_REVIEW;

        const timeline = disputeCase.timeline || [];
        timeline.push({
            date: new Date(),
            event: 'Legal Provider Assigned',
            description: `Legal provider ${providerId} assigned to the case`,
            performedBy: assignedBy
        });
        disputeCase.timeline = timeline;

        await this.disputeCaseRepository.save(disputeCase);
        this.logger.log(`Assigned legal provider to dispute case ${disputeCase.caseNumber}`);

        return disputeCase;
    }

    /**
     * Adapter: assignDispute (for tests)
     */
    async assignDispute(
        caseId: string,
        agentId: string,
        tenantId: string
    ): Promise<any> {
        const disputeCase = await this.assignLegalProvider(caseId, agentId, 'system');
        return Object.assign({}, disputeCase, { assignedTo: agentId });
    }

    /**
     * Record resolution
     */
    async recordResolution(
        caseId: string,
        resolution: {
            type: string;
            amount: number;
            terms: string;
        },
        resolvedBy: string
    ): Promise<DisputeCase> {
        const disputeCase = await this.disputeCaseRepository.findOne({
            where: { id: caseId }
        });

        if (!disputeCase) {
            throw new NotFoundException(`Dispute case ${caseId} not found`);
        }

        disputeCase.resolution = {
            ...resolution,
            agreedDate: new Date()
        };
        disputeCase.status = DisputeStatus.RESOLVED;
        disputeCase.resolvedAt = new Date();

        const timeline = disputeCase.timeline || [];
        timeline.push({
            date: new Date(),
            event: 'Case Resolved',
            description: `Resolution type: ${resolution.type}, Amount: ₹${resolution.amount}`,
            performedBy: resolvedBy
        });
        disputeCase.timeline = timeline;

        await this.disputeCaseRepository.save(disputeCase);
        this.logger.log(`Recorded resolution for dispute case ${disputeCase.caseNumber}`);

        return disputeCase;
    }

    /**
     * Get dispute by ID
     */
    async getDisputeById(caseId: string): Promise<DisputeCase> {
        const disputeCase = await this.disputeCaseRepository.findOne({
            where: { id: caseId }
        });

        if (!disputeCase) {
            throw new NotFoundException(`Dispute case ${caseId} not found`);
        }

        return disputeCase;
    }

    /**
     * Get disputes by tenant
     */
    async getDisputesByTenant(
        tenantId: string,
        status?: DisputeStatus
    ): Promise<DisputeCase[]> {
        const where: { tenantId: string; status?: DisputeStatus } = { tenantId };

        if (status) {
            where.status = status;
        }

        return await this.disputeCaseRepository.find({
            where,
            order: { createdAt: 'DESC' }
        });
    }

    // Adapter: findAllDisputes (for tests)
    async findAllDisputes(tenantId: string, filters?: { status?: DisputeStatus | string }): Promise<DisputeCase[]> {
        const status = typeof filters?.status === 'string' ? (DisputeStatus as any)[filters.status] : filters?.status;
        return this.getDisputesByTenant(tenantId, status as DisputeStatus);
    }

    /**
     * Get disputes by invoice
     */
    async getDisputesByInvoice(invoiceId: string): Promise<DisputeCase[]> {
        return await this.disputeCaseRepository.find({
            where: { invoiceId },
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Get dispute statistics
     */
    async getDisputeStats(tenantId: string): Promise<DisputeStatsResult> {
        const disputes = await this.disputeCaseRepository.find({
            where: { tenantId }
        });

        const stats = {
            total: disputes.length,
            byStatus: {} as Record<string, number>,
            byType: {} as Record<string, number>,
            totalDisputedAmount: 0,
            averageResolutionDays: 0
        };

        let totalResolutionDays = 0;
        let resolvedCount = 0;

        disputes.forEach(dispute => {
            // Count by status
            stats.byStatus[dispute.status] = (stats.byStatus[dispute.status] || 0) + 1;

            // Count by type
            stats.byType[dispute.type] = (stats.byType[dispute.type] || 0) + 1;

            // Sum disputed amount
            stats.totalDisputedAmount += Number(dispute.disputedAmount);

            // Calculate resolution time
            if (dispute.resolvedAt && dispute.filedAt) {
                const days = Math.floor(
                    (dispute.resolvedAt.getTime() - dispute.filedAt.getTime()) / (1000 * 60 * 60 * 24)
                );
                totalResolutionDays += days;
                resolvedCount++;
            }
        });

        if (resolvedCount > 0) {
            stats.averageResolutionDays = Math.round(totalResolutionDays / resolvedCount);
        }

        return stats;
    }

    /**
     * Adapter: getDisputeStatistics (for tests)
     */
    async getDisputeStatistics(tenantId: string): Promise<DisputeStatsResult> {
        return this.getDisputeStats(tenantId);
    }

    /**
     * Find dispute by invoice ID (for event handler) 
     */
    async findByInvoiceId(invoiceId: string): Promise<DisputeCase | null> {
        const disputes = await this.disputeCaseRepository.find({
            where: { invoiceId },
            order: { createdAt: 'DESC' },
        });

        // Return most recent dispute if exists
        return disputes length > 0 ? disputes[0] : null;
    }

    /**
     * Add note to dispute (for event handler)
     */
    async addNote(
        caseId: string,
        data: { note: string; addedBy: string; metadata?: any }
    ): Promise<DisputeCase> {
        const disputeCase = await this.disputeCaseRepository.findOne({
            where: { id: caseId },
        });

        if (!disputeCase) {
            throw new NotFoundException(`Dispute case ${caseId} not found`);
        }

        const timestamp = new Date().toISOString();
        const noteText = `\n[${timestamp}] ${data.addedBy}: ${data.note}`;
        disputeCase.notes = (disputeCase.notes || '') + noteText;

        const timeline = disputeCase.timeline || [];
        timeline.push({
            date: new Date(),
            event: 'Note Added',
            description: data.note,
            performedBy: data.addedBy,
        });
        disputeCase.timeline = timeline;

        await this.disputeCaseRepository.save(disputeCase);
        this.logger.log(`Added note to dispute ${disputeCase.caseNumber}`);

        return disputeCase;
    }

    /**
     * Create dispute (simplified for event handler)
     */
    async create(data: Partial<DisputeCase> & { tenantId: string; customerId: string }): Promise<DisputeCase> {
        const caseNumber = this.generateCaseNumber();

        const disputeCase = this.disputeCaseRepository.create({
            caseNumber,
            status: data.status || DisputeStatus.DRAFT,
            priority: (data as any).priority || DisputePriority.MEDIUM,
            timeline: [
                {
                    date: new Date(),
                    event: 'Case Created',
                    description: data.description || 'Dispute case created automatically',
                    performedBy: 'SYSTEM',
                },
            ],
            ...data,
        });

        const saved = await this.disputeCaseRepository.save(disputeCase);
        this.logger.log(`Auto-created dispute case ${caseNumber}`);

        return saved;
    }
}
