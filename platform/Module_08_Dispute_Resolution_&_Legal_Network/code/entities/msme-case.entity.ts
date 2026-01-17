import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DisputeCase } from './dispute-case.entity';

export enum MSMECaseStatus {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    UNDER_REVIEW = 'under_review',
    HEARING_SCHEDULED = 'hearing_scheduled',
    CONCILIATION_IN_PROGRESS = 'conciliation_in_progress',
    AWARD_PASSED = 'award_passed',
    CLOSED = 'closed',
    REJECTED = 'rejected',
}

@Entity('msme_cases')
export class MSMECase {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'dispute_case_id', type: 'uuid' })
    disputeCaseId: string;

    @ManyToOne(() => DisputeCase)
    @JoinColumn({ name: 'dispute_case_id' })
    disputeCase: DisputeCase;

    @Column({ name: 'msme_case_number', unique: true, nullable: true })
    msmeCaseNumber: string;

    @Column({ name: 'msme_application_id', unique: true })
    msmeApplicationId: string;

    @Column({ type: 'enum', enum: MSMECaseStatus, default: MSMECaseStatus.DRAFT })
    status: MSMECaseStatus;

    // Supplier (MSME) details
    @Column({ name: 'supplier_name' })
    supplierName: string;

    @Column({ name: 'supplier_udyam_number' })
    supplierUdyamNumber: string; // MSME registration number

    @Column({ name: 'supplier_email' })
    supplierEmail: string;

    @Column({ name: 'supplier_phone' })
    supplierPhone: string;

    @Column({ name: 'supplier_address', type: 'text' })
    supplierAddress: string;

    // Buyer details
    @Column({ name: 'buyer_name' })
    buyerName: string;

    @Column({ name: 'buyer_pan' })
    buyerPAN: string;

    @Column({ name: 'buyer_email', nullable: true })
    buyerEmail: string;

    @Column({ name: 'buyer_ phone', nullable: true })
    buyerPhone: string;

    @Column({ name: 'buyer_address', type: 'text' })
    buyerAddress: string;

    // Dispute details
    @Column({ name: 'amount_claimed', type: 'decimal', precision: 15, scale: 2 })
    amountClaimed: number;

    @Column({ name: 'dispute_description', type: 'text' })
    disputeDescription: string;

    @Column({ name: 'invoice_numbers', type: 'text', array: true })
    invoiceNumbers: string[];

    @Column({ name: 'documents_uploaded', type: 'jsonb', default: [] })
    documentsUploaded: Array<{
        name: string;
        type: string;
        url: string;
        uploadedAt: Date;
    }>;

    // MSME Portal specific data
    @Column({ name: 'portal_reference_id', nullable: true })
    portalReferenceId: string;

    @Column({ name: 'conciliator_assigned', nullable: true })
    conciliatorAssigned: string;

    @Column({ name: 'hearing_date', type: 'timestamp', nullable: true })
    hearingDate: Date;

    @Column({ name: 'award_details', type: 'jsonb', nullable: true })
    awardDetails: {
        awardNumber?: string;
        awardDate?: Date;
        awardedAmount?: number;
        paymentDueDate?: Date;
        remarks?: string;
    };

    // Tracking
    @Column({ name: 'timeline', type: 'jsonb', default: [] })
    timeline: Array<{
        date: Date;
        status: string;
        description: string;
        updatedBy: string;
    }>;

    @Column({ name: 'last_sync_at', type: 'timestamp', nullable: true })
    lastSyncAt: Date;

    @Column({ name: 'sync_errors', type: 'text', nullable: true })
    syncErrors: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
