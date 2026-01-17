import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('approval_rules')
export class ApprovalRule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenant_id: string;

    @Column('varchar', { length: 100 })
    name: string;

    @Column('text', { nullable: true })
    description: string;

    @Column('jsonb')
    condition: {
        field: 'grand_total' | 'client_tier' | 'client_id' | 'status';
        operator: '>' | '<' | '>=' | '<=' | '=' | '!=' | 'in' | 'not_in';
        value: any;
    };

    @Column('jsonb')
    approvers: string[]; // User IDs or role names

    @Column('varchar', { length: 20 })
    approval_type: 'sequential' | 'parallel' | 'any_one';

    @Column('integer', { default: 0 })
    priority: number; // Lower number = higher priority

    @Column('boolean', { default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @Column('timestamp', { nullable: true })
    updated_at: Date;
}

@Entity('approval_history')
export class ApprovalHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    invoice_id: string;

    @Column('uuid')
    rule_id: string;

    @Column('uuid')
    approver_id: string;

    @Column('varchar', { length: 20 })
    action: 'approved' | 'rejected' | 'delegated' | 'requested';

    @Column('text', { nullable: true })
    comments: string;

    @CreateDateColumn()
    timestamp: Date;

    @Column('jsonb', { nullable: true })
    metadata: {
        approver_name?: string;
        approver_email?: string;
        ip_address?: string;
        delegated_to?: string;
    };
}
