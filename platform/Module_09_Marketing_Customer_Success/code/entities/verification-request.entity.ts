import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum VerificationStatus {
    PENDING = 'PENDING',
    VERIFIED = 'VERIFIED',
    REJECTED = 'REJECTED'
}

@Entity('verification_requests')
export class VerificationRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    requesterTenantId: string; // The SME asking for verification

    @Column()
    partnerEmail: string; // The Supplier/Buyer email

    @Column({ nullable: true })
    partnerName: string;

    @Column({
        type: 'varchar',
        default: VerificationStatus.PENDING
    })
    status: VerificationStatus;

    @Column({ type: 'varchar', default: 'SILVER' })
    trustLevel: 'SILVER' | 'GOLD'; // Gold = Verified Tenant, Silver = External

    @Column({ type: 'int', nullable: true })
    rating: number; // 1-5 Stars (How good is this SME?)

    @Column({ type: 'text', nullable: true })
    comments: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    verifiedAt: Date;
}
