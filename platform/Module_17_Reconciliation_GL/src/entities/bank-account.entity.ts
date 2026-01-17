import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { GlAccount } from './gl-account.entity';

@Entity('bank_accounts')
@Index(['tenantId', 'isActive'])
export class BankAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'account_name', type: 'varchar', length: 255 })
    accountName: string;

    @Column({ name: 'account_number_masked', type: 'varchar', length: 50, nullable: true })
    accountNumberMasked: string;

    @Column({ name: 'bank_name', type: 'varchar', length: 255, nullable: true })
    bankName: string;

    @Column({ name: 'ifsc_code', type: 'varchar', length: 20, nullable: true })
    ifscCode: string;

    @Column({ name: 'sync_method', type: 'varchar', length: 30, default: 'manual_upload' })
    syncMethod: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @Column({ name: 'current_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    currentBalance: number;

    @Column({ name: 'last_reconciled_at', type: 'timestamptz', nullable: true })
    lastReconciledAt: Date;

    @Column({ name: 'last_sync_at', type: 'timestamptz', nullable: true })
    lastSyncAt: Date;

    @Column({ name: 'gl_account_id', type: 'uuid', nullable: true })
    glAccountId: string;

    @ManyToOne(() => GlAccount)
    @JoinColumn({ name: 'gl_account_id' })
    glAccount: GlAccount;

    @Column({ name: 'api_credentials', type: 'jsonb', default: {} })
    apiCredentials: any;

    @Column({ type: 'jsonb', default: {} })
    metadata: any;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
