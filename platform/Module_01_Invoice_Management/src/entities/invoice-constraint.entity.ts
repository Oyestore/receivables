import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ConstraintType {
    BLOCKING = 'blocking',
    WARNING = 'warning',
    APPROVAL_REQUIRED = 'approval_required',
}

export enum ConstraintCategory {
    REGULATORY = 'regulatory',
    BUSINESS = 'business',
    CLIENT = 'client',
    HISTORY = 'history',
}

@Entity('invoice_constraints')
@Index(['tenantId', 'isActive'])
export class InvoiceConstraint {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'constraint_name' })
    constraintName: string;

    @Column({ name: 'description', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: ConstraintType,
        default: ConstraintType.WARNING,
        name: 'constraint_type',
    })
    constraintType: ConstraintType;

    @Column({
        type: 'enum',
        enum: ConstraintCategory,
        default: ConstraintCategory.BUSINESS,
        name: 'category',
    })
    category: ConstraintCategory;

    @Column({ type: 'jsonb', name: 'rule_definition' })
    ruleDefinition: any; // Stores the logic (e.g. logic-json or simple condition)

    @Column({ name: 'error_message', nullable: true })
    errorMessage: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
