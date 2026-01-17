import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    ApprovalWorkflow,
    ApprovalHistory,
    ApprovalStatus,
    ApprovalLevel,
    ApprovalDecision,
} from '../entities/approval-workflow.entity';
import { DisputeCase } from '../entities/dispute-case.entity';
import { NotificationService } from '../../../Module_11_Common/src/services/notification.service';
import { invoiceService } from '../../../Module_01_Smart_Invoice_Generation/code/services/invoice.service';

interface ApprovalRules {
    amount: number;
    levels: ApprovalLevel[];
    isParallel?: boolean;
    expiryHours?: number;
}

@Injectable()
export class ApprovalService {
    private readonly logger = new Logger(ApprovalService.name);

    // Define approval rules based on amount thresholds
    private readonly approvalRules: ApprovalRules[] = [
        { amount: 0, levels: [] }, // < 50k: auto-approve
        { amount: 50000, levels: [ApprovalLevel.L1_MANAGER], expiryHours: 24 },
        { amount: 100000, levels: [ApprovalLevel.L1_MANAGER, ApprovalLevel.L2_DIRECTOR], expiryHours: 48 },
        { amount: 500000, levels: [ApprovalLevel.L1_MANAGER, ApprovalLevel.L2_DIRECTOR, ApprovalLevel.L3_LEGAL], expiryHours: 72 },
        { amount: 1000000, levels: [ApprovalLevel.L1_MANAGER, ApprovalLevel.L2_DIRECTOR, ApprovalLevel.L3_LEGAL, ApprovalLevel.L4_CFO], expiryHours: 96 },
    ];

    constructor(
        @InjectRepository(ApprovalWorkflow)
        private approvalWorkflowRepo: Repository<ApprovalWorkflow>,
        @InjectRepository(ApprovalHistory)
        private approvalHistoryRepo: Repository<ApprovalHistory>,
        @InjectRepository(DisputeCase)
        private disputeCaseRepo: Repository<DisputeCase>,
        private notificationService: NotificationService,
    ) { }

    /**
     * Initialize approval workflow for a dispute
     */
    async initializeWorkflow(disputeId: string, tenantId: string): Promise<ApprovalWorkflow[]> {
        const dispute = await this.disputeCaseRepo.findOne({
            where: { id: disputeId, tenantId },
        });

        if (!dispute) {
            throw new NotFoundException(`Dispute ${disputeId} not found`);
        }

        // Determine required approval levels based on amount
        const requiredLevels = this.getRequiredApprovalLevels(Number(dispute.disputedAmount));

        if (requiredLevels.length === 0) {
            this.logger.log(`Dispute ${disputeId} (amount: ${dispute.disputedAmount}) is auto-approved`);
            return [];
        }

        // Create approval workflows
        const workflows: ApprovalWorkflow[] = [];
        const rule = this.getApprovalRule(Number(dispute.disputedAmount));

        for (let i = 0; i < requiredLevels.length; i++) {
            const workflow = this.approvalWorkflowRepo.create({
                disputeId,
                tenantId,
                level: requiredLevels[i],
                status: i === 0 ? ApprovalStatus.PENDING : ApprovalStatus.PENDING, // First level is pending
                sequence: i,
                isParallel: rule?.isParallel || false,
                requestedAt: new Date(),
                expiresAt: rule?.expiryHours
                    ? new Date(Date.now() + rule.expiryHours * 60 * 60 * 1000)
                    : null,
                // TODO: Fetch actual approver from user/role service
                approverId: `approver-${requiredLevels[i]}`,
                approverName: `Approver for ${requiredLevels[i]}`,
                approverEmail: `${requiredLevels[i]}@company.com`,
            });

            workflows.push(workflow);
        }

        const saved = await this.approvalWorkflowRepo.save(workflows);
        this.logger.log(`Created ${saved.length} approval workflows for dispute ${disputeId}`);

        // Send notifications to approvers via M11
        for (const workflow of saved) {
            await this.notificationService.sendEmail({
                to: workflow.approverEmail,
                subject: `Approval Required: Dispute ${disputeId}`,
                html: `<p>You have been assigned to approve dispute case ${disputeId}. Amount: ${dispute.disputedAmount}. Please login to review.</p>`
            });
        }
        return saved;
    }

    /**
     * Approve a workflow
     */
    async approve(
        workflowId: string,
        tenantId: string,
        performedBy: string,
        performedByName: string,
        comments?: string,
    ): Promise<ApprovalWorkflow> {
        const workflow = await this.approvalWorkflowRepo.findOne({
            where: { id: workflowId, tenantId },
        });

        if (!workflow) {
            throw new NotFoundException(`Approval workflow ${workflowId} not found`);
        }

        if (workflow.status !== ApprovalStatus.PENDING) {
            throw new BadRequestException(`Approval workflow is not pending (current status: ${workflow.status})`);
        }

        // Check if expired
        if (workflow.expiresAt && new Date() > workflow.expiresAt) {
            workflow.status = ApprovalStatus.EXPIRED;
            await this.approvalWorkflowRepo.save(workflow);
            throw new BadRequestException(`Approval workflow has expired`);
        }

        // Update workflow
        workflow.status = ApprovalStatus.APPROVED;
        workflow.respondedAt = new Date();
        workflow.comments = comments || null;

        const saved = await this.approvalWorkflowRepo.save(workflow);

        // Record history
        await this.recordHistory(workflow.id, tenantId, performedBy, performedByName, ApprovalDecision.APPROVE, comments);

        this.logger.log(`Approved workflow ${workflowId} by ${performedByName}`);

        // Check if all approvals are complete
        await this.checkAndCompleteApprovals(workflow.disputeId, tenantId);

        // Notify next approver if any (this is handled by checkAndCompleteApprovals implicity if we had sequential switching, 
        // but here we just check if ALL are done). 
        // We really want to notify the REQUESTER if the case moves to UNDER_REVIEW.
        const dispute = await this.disputeCaseRepo.findOne({ where: { id: workflow.disputeId } });

        if (dispute && dispute.status === 'under_review') {
            try {
                // Fetch invoice to get customer email
                // Direct import of singleton to avoid circular module dependency
                const invoice = await invoiceService.getInvoiceById(tenantId, dispute.invoiceId);

                if (invoice && invoice.customer_email) {
                    await this.notificationService.sendEmail({
                        to: invoice.customer_email,
                        subject: `Dispute ${dispute.caseNumber || dispute.id} Approved for Review`,
                        html: `<p>Your dispute for Invoice #${invoice.invoice_number} has been approved by the initial review team and is now Under Review.</p>
                               <p>amount: ${dispute.disputedAmount}</p>`
                    });
                }
            } catch (error) {
                this.logger.warn(`Failed to send approval notification for dispute ${dispute.id}`, error);
            }
        }

        return saved;
    }

    /**
     * Reject a workflow
     */
    async reject(
        workflowId: string,
        tenantId: string,
        performedBy: string,
        performedByName: string,
        comments: string,
    ): Promise<ApprovalWorkflow> {
        const workflow = await this.approvalWorkflowRepo.findOne({
            where: { id: workflowId, tenantId },
        });

        if (!workflow) {
            throw new NotFoundException(`Approval workflow ${workflowId} not found`);
        }

        if (workflow.status !== ApprovalStatus.PENDING) {
            throw new BadRequestException(`Approval workflow is not pending (current status: ${workflow.status})`);
        }

        // Update workflow
        workflow.status = ApprovalStatus.REJECTED;
        workflow.respondedAt = new Date();
        workflow.comments = comments;

        const saved = await this.approvalWorkflowRepo.save(workflow);

        // Record history
        await this.recordHistory(workflow.id, tenantId, performedBy, performedByName, ApprovalDecision.REJECT, comments);

        this.logger.log(`Rejected workflow ${workflowId} by ${performedByName}`);

        // Mark dispute as rejected
        await this.disputeCaseRepo.update(
            { id: workflow.disputeId },
            { status: 'closed' as any, notes: `Rejected by ${performedByName}: ${comments}` },
        );

        // Send notification via M11
        try {
            const dispute = await this.disputeCaseRepo.findOne({ where: { id: workflow.disputeId } });
            if (dispute) {
                // Fetch invoice to get customer email
                const invoice = await invoiceService.getInvoiceById(tenantId, dispute.invoiceId);

                if (invoice && invoice.customer_email) {
                    await this.notificationService.sendEmail({
                        to: invoice.customer_email,
                        subject: `Dispute ${dispute.caseNumber || dispute.id} Rejected`,
                        html: `<p>Your dispute for Invoice #${invoice.invoice_number} has been rejected.</p>
                               <p>Reason: ${comments}</p>
                               <p>Status: Closed</p>`
                    });
                }
            }
        } catch (error) {
            this.logger.warn(`Failed to send rejection notification for dispute ${workflow.disputeId}`, error);
        }

        return saved;
    }

    /**
     * Delegate approval
     */
    async delegate(
        workflowId: string,
        tenantId: string,
        performedBy: string,
        performedByName: string,
        delegateToId: string,
        delegateToName: string,
        comments?: string,
    ): Promise<ApprovalWorkflow> {
        const workflow = await this.approvalWorkflowRepo.findOne({
            where: { id: workflowId, tenantId },
        });

        if (!workflow) {
            throw new NotFoundException(`Approval workflow ${workflowId} not found`);
        }

        if (workflow.status !== ApprovalStatus.PENDING) {
            throw new BadRequestException(`Approval workflow is not pending (current status: ${workflow.status})`);
        }

        // Update workflow
        workflow.status = ApprovalStatus.DELEGATED;
        workflow.delegatedToId = delegateToId;
        workflow.delegatedToName = delegateToName;
        workflow.comments = comments || null;

        const saved = await this.approvalWorkflowRepo.save(workflow);

        // Record history
        await this.recordHistory(workflow.id, tenantId, performedBy, performedByName, ApprovalDecision.DELEGATE, comments);

        this.logger.log(`Delegated workflow ${workflowId} from ${performedByName} to ${delegateToName}`);

        // Send notification to delegate via M11
        await this.notificationService.sendEmail({
            to: `${delegateToId}@company.com`, // Mock email generation logic
            subject: `Approval Delegated: Dispute ${workflow.disputeId}`,
            html: `<p>${performedByName} has delegated approval for dispute ${workflow.disputeId} to you.</p>`
        });
        return saved;
    }

    /**
     * Get pending approvals for a user
     */
    async getPendingApprovals(approverId: string, tenantId: string): Promise<ApprovalWorkflow[]> {
        return this.approvalWorkflowRepo.find({
            where: {
                approverId,
                tenantId,
                status: ApprovalStatus.PENDING,
            },
            relations: ['dispute'],
            order: { requestedAt: 'ASC' },
        });
    }

    /**
     * Get approval history for a dispute
     */
    async getApprovalHistory(disputeId: string, tenantId: string): Promise<ApprovalHistory[]> {
        const workflows = await this.approvalWorkflowRepo.find({
            where: { disputeId, tenantId },
        });

        const workflowIds = workflows.map(w => w.id);

        return this.approvalHistoryRepo.find({
            where: { workflowId: workflowIds as any }, // TypeORM will handle the IN query
            order: { performedAt: 'ASC' },
        });
    }

    /**
     * Check if all approvals are complete and update dispute
     */
    private async checkAndCompleteApprovals(disputeId: string, tenantId: string): Promise<void> {
        const workflows = await this.approvalWorkflowRepo.find({
            where: { disputeId, tenantId },
        });

        const allApproved = workflows.every(w => w.status === ApprovalStatus.APPROVED);
        const anyRejected = workflows.some(w => w.status === ApprovalStatus.REJECTED);

        if (allApproved) {
            // All approvals complete - proceed with dispute
            await this.disputeCaseRepo.update(
                { id: disputeId },
                { status: 'under_review' as any },
            );
            this.logger.log(`All approvals complete for dispute ${disputeId}`);
        } else if (anyRejected) {
            // Any rejection means dispute is rejected
            await this.disputeCaseRepo.update(
                { id: disputeId },
                { status: 'closed' as any },
            );
            this.logger.log(`Dispute ${disputeId} rejected due to approval rejection`);
        }
    }

    /**
     * Record approval history
     */
    private async recordHistory(
        workflowId: string,
        tenantId: string,
        performedById: string,
        performedByName: string,
        decision: ApprovalDecision,
        comments?: string,
    ): Promise<ApprovalHistory> {
        const history = this.approvalHistoryRepo.create({
            workflowId,
            tenantId,
            performedById,
            performedByName,
            decision,
            comments: comments || null,
            performedAt: new Date(),
        });

        return this.approvalHistoryRepo.save(history);
    }

    /**
     * Get required approval levels based on amount
     */
    private getRequiredApprovalLevels(amount: number): ApprovalLevel[] {
        const rule = this.getApprovalRule(amount);
        return rule?.levels || [];
    }

    /**
     * Get approval rule for amount
     */
    private getApprovalRule(amount: number): ApprovalRules | undefined {
        // Find the highest matching rule
        let matchingRule: ApprovalRules | undefined;
        for (const rule of this.approvalRules) {
            if (amount >= rule.amount) {
                matchingRule = rule;
            } else {
                break;
            }
        }
        return matchingRule;
    }
}
