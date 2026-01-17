import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalRule, ApprovalHistory } from '../entities/approval.entities';
import { Invoice } from '../entities/invoice.entity';

export interface ApprovalStatus {
    invoice_id: string;
    status: 'pending' | 'approved' | 'rejected' | 'partially_approved';
    required_approvals: number;
    received_approvals: number;
    pending_approvers: string[];
    history: ApprovalHistory[];
}

@Injectable()
export class WorkflowApprovalService {
    private readonly logger = new Logger(WorkflowApprovalService.name);

    constructor(
        @InjectRepository(ApprovalRule)
        private ruleRepo: Repository<ApprovalRule>,
        @InjectRepository(ApprovalHistory)
        private historyRepo: Repository<ApprovalHistory>,
        @InjectRepository(Invoice)
        private invoiceRepo: Repository<Invoice>,
    ) { }

    // Check if invoice requires approval
    async requiresApproval(invoice: Invoice): Promise<{
        requires: boolean;
        rules: ApprovalRule[];
    }> {
        const applicableRules = await this.getApplicable Rules(invoice);

        return {
            requires: applicableRules.length > 0,
            rules: applicableRules,
        };
    }

    // Get applicable rules for invoice
    private async getApplicableRules(invoice: Invoice): Promise<ApprovalRule[]> {
        const allRules = await this.ruleRepo.find({
            where: {
                tenant_id: invoice.tenant_id,
                is_active: true,
            },
            order: { priority: 'ASC' },
        });

        return allRules.filter((rule) => this.evaluateRuleCondition(rule, invoice));
    }

    // Evaluate rule condition
    private evaluateRuleCondition(rule: ApprovalRule, invoice: Invoice): boolean {
        const { field, operator, value } = rule.condition;
        const invoiceValue = invoice[field];

        switch (operator) {
            case '>':
                return invoiceValue > value;
            case '<':
                return invoiceValue < value;
            case '>=':
                return invoiceValue >= value;
            case '<=':
                return invoiceValue <= value;
            case '=':
                return invoiceValue === value;
            case '!=':
                return invoiceValue !== value;
            case 'in':
                return Array.isArray(value) && value.includes(invoiceValue);
            case 'not_in':
                return Array.isArray(value) && !value.includes(invoiceValue);
            default:
                return false;
        }
    }

    // Submit invoice for approval
    async submitForApproval(
        invoiceId: string,
        submitterId: string,
        tenantId: string,
    ): Promise<ApprovalStatus> {
        const invoice = await this.invoiceRepo.findOne({
            where: { id: invoiceId, tenant_id: tenantId },
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice ${invoiceId} not found`);
        }

        const { requires, rules } = await this.requiresApproval(invoice);

        if (!requires) {
            throw new BadRequestException('Invoice does not require approval');
        }

        // Update invoice status to pending_approval
        invoice.status = 'pending_approval';
        await this.invoiceRepo.save(invoice);

        // Create approval requests for each rule
        for (const rule of rules) {
            for (const approverId of rule.approvers) {
                await this.historyRepo.save({
                    invoice_id: invoiceId,
                    rule_id: rule.id,
                    approver_id: approverId,
                    action: 'requested',
                    comments: `Approval requested for rule: ${rule.name}`,
                    metadata: {
                        approver_name: approverId, // In production, lookup from user service
                    },
                });
            }
        }

        this.logger.log(`Invoice ${invoiceId} submitted for approval by ${submitterId}`);

        return this.getApprovalStatus(invoiceId);
    }

    // Approve invoice
    async approve(
        invoiceId: string,
        approverId: string,
        comments?: string,
    ): Promise<ApprovalStatus> {
        const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });

        if (!invoice) {
            throw new NotFoundException(`Invoice ${invoiceId} not found`);
        }

        // Verify approver is eligible
        const pendingRequest = await this.historyRepo.findOne({
            where: {
                invoice_id: invoiceId,
                approver_id: approverId,
                action: 'requested',
            },
        });

        if (!pendingRequest) {
            throw new BadRequestException('No pending approval request for this user');
        }

        // Record approval
        await this.historyRepo.save({
            invoice_id: invoiceId,
            rule_id: pendingRequest.rule_id,
            approver_id: approverId,
            action: 'approved',
            comments: comments || 'Approved',
        });

        this.logger.log(`Invoice ${invoiceId} approved by ${approverId}`);

        // Check if all approvals received
        const status = await this.getApprovalStatus(invoiceId);

        if (status.status === 'approved') {
            // All approvals received, update invoice status
            invoice.status = 'approved';
            await this.invoiceRepo.save(invoice);
            this.logger.log(`Invoice ${invoiceId} fully approved`);
        }

        return status;
    }

    // Reject invoice
    async reject(
        invoiceId: string,
        approverId: string,
        reason: string,
    ): Promise<ApprovalStatus> {
        const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });

        if (!invoice) {
            throw new NotFoundException(`Invoice ${invoiceId} not found`);
        }

        // Record rejection
        const pendingRequest = await this.historyRepo.findOne({
            where: {
                invoice_id: invoiceId,
                approver_id: approverId,
                action: 'requested',
            },
        });

        await this.historyRepo.save({
            invoice_id: invoiceId,
            rule_id: pendingRequest?.rule_id || null,
            approver_id: approverId,
            action: 'rejected',
            comments: reason,
        });

        // Update invoice status
        invoice.status = 'rejected';
        await this.invoiceRepo.save(invoice);

        this.logger.warn(`Invoice ${invoiceId} rejected by ${approverId}: ${reason}`);

        return this.getApprovalStatus(invoiceId);
    }

    // Get approval status
    async getApprovalStatus(invoiceId: string): Promise<ApprovalStatus> {
        const history = await this.historyRepo.find({
            where: { invoice_id: invoiceId },
            order: { timestamp: 'DESC' },
        });

        const requested = history.filter((h) => h.action === 'requested');
        const approved = history.filter((h) => h.action === 'approved');
        const rejected = history.filter((h) => h.action === 'rejected');

        // Get unique approvers who haven't responded
        const approvedIds = new Set(approved.map((h) => h.approver_id));
        const pending = requested.filter((h) => !approvedIds.has(h.approver_id));

        let status: 'pending' | 'approved' | 'rejected' | 'partially_approved';
        if (rejected.length > 0) {
            status = 'rejected';
        } else if (pending.length === 0 && requested.length > 0) {
            status = 'approved';
        } else if (approved.length > 0) {
            status = 'partially_approved';
        } else {
            status = 'pending';
        }

        return {
            invoice_id: invoiceId,
            status,
            required_approvals: requested.length,
            received_approvals: approved.length,
            pending_approvers: pending.map((h) => h.approver_id),
            history,
        };
    }

    // Get pending approvals for user
    async getPendingApprovals(
        approverId: string,
        tenantId: string,
    ): Promise<Invoice[]> {
        const pendingRequests = await this.historyRepo.find({
            where: {
                approver_id: approverId,
                action: 'requested',
            },
        });

        const invoiceIds = pendingRequests.map((r) => r.invoice_id);

        if (invoiceIds.length === 0) {
            return [];
        }

        return this.invoiceRepo
            .createQueryBuilder('invoice')
            .where('invoice.id IN (:...ids)', { ids: invoiceIds })
            .andWhere('invoice.tenant_id = :tenantId', { tenantId })
            .andWhere('invoice.status = :status', { status: 'pending_approval' })
            .getMany();
    }

    // Get approval history
    async getApprovalHistory(invoiceId: string): Promise<ApprovalHistory[]> {
        return this.historyRepo.find({
            where: { invoice_id: invoiceId },
            order: { timestamp: 'ASC' },
        });
    }

    // CRUD for approval rules
    async createRule(ruleData: Partial<ApprovalRule>): Promise<ApprovalRule> {
        const rule = this.ruleRepo.create(ruleData);
        return this.ruleRepo.save(rule);
    }

    async getRules(tenantId: string): Promise<ApprovalRule[]> {
        return this.ruleRepo.find({
            where: { tenant_id: tenantId },
            order: { priority: 'ASC' },
        });
    }

    async updateRule(ruleId: string, updates: Partial<ApprovalRule>): Promise<ApprovalRule> {
        await this.ruleRepo.update(ruleId, { ...updates, updated_at: new Date() });
        return this.ruleRepo.findOne({ where: { id: ruleId } });
    }

    async deleteRule(ruleId: string): Promise<void> {
        await this.ruleRepo.update(ruleId, { is_active: false });
    }
}
