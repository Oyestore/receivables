import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

@Entity('gl_accounts')
@Index(['tenantId', 'isActive'])
@Index(['accountCode'])
@Index(['accountType'])
export class GlAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'account_code', type: 'varchar', length: 50, unique: true })
    accountCode: string;

    @Column({ name: 'account_name', type: 'varchar', length: 255 })
    accountName: string;

    @Column({ name: 'account_type', type: 'varchar', length: 20 })
    accountType: string;

    @Column({ name: 'normal_balance', type: 'varchar', length: 10 })
    normalBalance: string;

    @Column({ name: 'parent_account_id', type: 'uuid', nullable: true })
    parentAccountId: string;

    @ManyToOne(() => GlAccount)
    @JoinColumn({ name: 'parent_account_id' })
    parentAccount: GlAccount;

    @Column({ type: 'integer', default: 0 })
    level: number;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @Column({ name: 'is_system_account', type: 'boolean', default: false })
    isSystemAccount: boolean;

    @Column({ name: 'current_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    currentBalance: number;

    @Column({ name: 'opening_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    openingBalance: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'jsonb', default: {} })
    metadata: any;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
