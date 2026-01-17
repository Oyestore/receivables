import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceVersion } from '../entities/invoice-version.entity';
import { Invoice } from '../entities/invoice.entity';

export interface VersionDiff {
    field: string;
    old_value: any;
    new_value: any;
    type: 'added' | 'removed' | 'modified';
}

@Injectable()
export class AuditTrailService {
    constructor(
        @InjectRepository(InvoiceVersion)
        private versionRepo: Repository<InvoiceVersion>,
        @InjectRepository(Invoice)
        private invoiceRepo: Repository<Invoice>,
    ) { }

    // Capture version on any update
    async captureVersion(
        invoice: Invoice,
        userId: string,
        changeReason?: string,
        changeType: 'created' | 'updated' | 'status_change' | 'payment' | 'rollback' = 'updated',
    ): Promise<InvoiceVersion> {
        // Get current version number
        const latestVersion = await this.versionRepo.findOne({
            where: { invoice_id: invoice.id },
            order: { version_number: 'DESC' },
        });

        const versionNumber = latestVersion ? latestVersion.version_number + 1 : 1;

        // Calculate changes if previous version exists
        let changes: Array<{ field: string; old_value: any; new_value: any }> = [];
        if (latestVersion) {
            changes = this.calculateChanges(latestVersion.snapshot, invoice);
        }

        const version = this.versionRepo.create({
            invoice_id: invoice.id,
            version_number: versionNumber,
            snapshot: {
                number: invoice.number,
                client_id: invoice.client_id,
                issue_date: invoice.issue_date,
                due_date: invoice.due_date,
                status: invoice.status,
                sub_total: invoice.sub_total,
                total_tax_amount: invoice.total_tax_amount,
                total_discount_amount: invoice.total_discount_amount,
                grand_total: invoice.grand_total,
                amount_paid: invoice.amount_paid,
                balance_due: invoice.balance_due,
                line_items: invoice.line_items || [],
                notes: invoice.notes,
                terms_conditions: invoice.terms_conditions,
            },
            changes,
            changed_by: userId,
            change_reason: changeReason,
            change_type: changeType,
        });

        return this.versionRepo.save(version);
    }

    // Calculate field-level changes
    private calculateChanges(oldSnapshot: any, newInvoice: Invoice): VersionDiff[] {
        const changes: VersionDiff[] = [];
        const fields = [
            'status',
            'sub_total',
            'total_tax_amount',
            'grand_total',
            'amount_paid',
            'balance_due',
            'due_date',
            'notes',
        ];

        for (const field of fields) {
            const oldValue = oldSnapshot[field];
            const newValue = newInvoice[field];

            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({ field, old_value: oldValue, new_value: newValue });
            }
        }

        return changes;
    }

    // Get version history
    async getVersionHistory(
        invoiceId: string,
        tenantId: string,
    ): Promise<InvoiceVersion[]> {
        // Verify invoice belongs to tenant
        const invoice = await this.invoiceRepo.findOne({
            where: { id: invoiceId, tenant_id: tenantId },
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice ${invoiceId} not found`);
        }

        return this.versionRepo.find({
            where: { invoice_id: invoiceId },
            order: { version_number: 'DESC' },
        });
    }

    // Get specific version
    async getVersion(versionId: string): Promise<InvoiceVersion> {
        const version = await this.versionRepo.findOne({ where: { id: versionId } });
        if (!version) {
            throw new NotFoundException(`Version ${versionId} not found`);
        }
        return version;
    }

    // Compare two versions
    async compareVersions(
        versionId1: string,
        versionId2: string,
    ): Promise<{ diff: VersionDiff[]; summary: string }> {
        const [v1, v2] = await Promise.all([
            this.getVersion(versionId1),
            this.getVersion(versionId2),
        ]);

        if (v1.invoice_id !== v2.invoice_id) {
            throw new BadRequestException('Versions belong to different invoices');
        }

        const diff: VersionDiff[] = [];
        const allFields = new Set([
            ...Object.keys(v1.snapshot),
            ...Object.keys(v2.snapshot),
        ]);

        for (const field of allFields) {
            const val1 = v1.snapshot[field];
            const val2 = v2.snapshot[field];

            if (JSON.stringify(val1) !== JSON.stringify(val2)) {
                diff.push({
                    field,
                    old_value: val1,
                    new_value: val2,
                    type: val1 === undefined ? 'added' : val2 === undefined ? 'removed' : 'modified',
                });
            }
        }

        const summary = `${diff.length} field(s) changed between v${v1.version_number} and v${v2.version_number}`;

        return { diff, summary };
    }

    // Rollback to specific version
    async rollbackToVersion(
        invoiceId: string,
        versionId: string,
        userId: string,
        tenantId: string,
    ): Promise<Invoice> {
        const version = await this.getVersion(versionId);

        if (version.invoice_id !== invoiceId) {
            throw new BadRequestException('Version does not belong to this invoice');
        }

        const invoice = await this.invoiceRepo.findOne({
            where: { id: invoiceId, tenant_id: tenantId },
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice ${invoiceId} not found`);
        }

        // Restore snapshot data
        Object.assign(invoice, {
            status: version.snapshot.status,
            sub_total: version.snapshot.sub_total,
            total_tax_amount: version.snapshot.total_tax_amount,
            total_discount_amount: version.snapshot.total_discount_amount,
            grand_total: version.snapshot.grand_total,
            amount_paid: version.snapshot.amount_paid,
            balance_due: version.snapshot.balance_due,
            due_date: version.snapshot.due_date,
            notes: version.snapshot.notes,
            terms_conditions: version.snapshot.terms_conditions,
        });

        const updatedInvoice = await this.invoiceRepo.save(invoice);

        // Create rollback version entry
        await this.captureVersion(
            updatedInvoice,
            userId,
            `Rolled back to version ${version.version_number}`,
            'rollback',
        );

        return updatedInvoice;
    }

    // Generate audit report
    async generateAuditReport(
        tenantId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<{
        total_changes: number;
        invoices_modified: number;
        changes_by_type: { [key: string]: number };
        top_modified_invoices: Array<{ invoice_id: string; change_count: number }>;
    }> {
        const versions = await this.versionRepo
            .createQueryBuilder('version')
            .leftJoinAndSelect('version.invoice', 'invoice')
            .where('invoice.tenant_id = :tenantId', { tenantId })
            .andWhere('version.changed_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
            .getMany();

        const changesByType: { [key: string]: number } = {};
        const invoiceChangeCounts: { [key: string]: number } = {};

        versions.forEach((version) => {
            // Count by type
            changesByType[version.change_type] =
                (changesByType[version.change_type] || 0) + 1;

            // Count by invoice
            invoiceChangeCounts[version.invoice_id] =
                (invoiceChangeCounts[version.invoice_id] || 0) + 1;
        });

        const topModified = Object.entries(invoiceChangeCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([invoice_id, change_count]) => ({ invoice_id, change_count }));

        return {
            total_changes: versions.length,
            invoices_modified: Object.keys(invoiceChangeCounts).length,
            changes_by_type: changesByType,
            top_modified_invoices: topModified,
        };
    }

    // Get changes by user
    async getChangesByUser(
        userId: string,
        tenantId: string,
        limit: number = 50,
    ): Promise<InvoiceVersion[]> {
        return this.versionRepo
            .createQueryBuilder('version')
            .leftJoinAndSelect('version.invoice', 'invoice')
            .where('invoice.tenant_id = :tenantId', { tenantId })
            .andWhere('version.changed_by = :userId', { userId })
            .orderBy('version.changed_at', 'DESC')
            .take(limit)
            .getMany();
    }
}
