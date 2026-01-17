import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum VirtualAccountStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    CLOSED = 'closed',
}

@Entity('virtual_accounts')
export class VirtualAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'virtual_account_number', unique: true })
    virtualAccountNumber: string;

    @Column({ name: 'ifsc_code' })
    ifscCode: string;

    @Column({ name: 'bank_name' })
    bankName: string;

    @Column({ name: 'customer_id' })
    customerId: string;

    @Column({ name: 'invoice_id', nullable: true })
    invoiceId: string;

    @Column({
        type: 'enum',
        enum: VirtualAccountStatus,
        default: VirtualAccountStatus.ACTIVE,
    })
    status: VirtualAccountStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
