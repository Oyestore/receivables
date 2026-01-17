import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('referral_rewards')
export class ReferralReward {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'referrer_id' })
    referrerId: string;

    @Column({ name: 'referee_id' })
    refereeId: string;

    @Column({ name: 'campaign_id', default: 'DEFAULT_CAMPAIGN' })
    campaignId: string; // e.g., 'HAPPY_MOMENT_PAYMENT', 'PARTNER_PROGRAM'

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ name: 'currency', default: 'INR' })
    currency: string;

    @Column({
        type: 'enum',
        enum: ['PENDING', 'APPROVED', 'PAID', 'REJECTED'],
        default: 'PENDING'
    })
    status: string;

    @Column({ type: 'timestamp', nullable: true })
    paidAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
