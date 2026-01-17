import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('partner_commissions')
@Index('idx_partner_commission_status', ['partnerId', 'status'])
export class PartnerCommission {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    partnerId: string;

    @Column({ type: 'varchar', length: 100 })
    customerId: string;

    @Column({ type: 'varchar', length: 50 })
    transactionType: 'new_customer' | 'renewal' | 'expansion';

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    revenueAmount: number;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    commissionRate: number;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    commissionAmount: number;

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: 'pending' | 'approved' | 'paid' | 'declined';

    @Column({ type: 'varchar', length: 100, nullable: true })
    approvedBy: string;

    @Column({ type: 'timestamp', nullable: true })
    paidAt: Date;

    @Column({ type: 'varchar', length: 50, nullable: true })
    paymentMethod: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    paymentReference: string;

    @CreateDateColumn()
    createdAt: Date;
}
