import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('invoice_versions')
export class InvoiceVersion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    invoice_id: string;

    @Column('integer')
    version_number: number;

    @Column('jsonb')
    snapshot: {
        // Complete invoice state at this version
        number: string;
        client_id: string;
        issue_date: Date;
        due_date: Date;
        status: string;
        sub_total: number;
        total_tax_amount: number;
        total_discount_amount: number;
        grand_total: number;
        amount_paid: number;
        balance_due: number;
        line_items: any[];
        notes?: string;
        terms_conditions?: string;
    };

    @Column('jsonb', { nullable: true })
    changes: Array<{
        field: string;
        old_value: any;
        new_value: any;
    }>;

    @Column('uuid')
    changed_by: string;

    @CreateDateColumn()
    changed_at: Date;

    @Column('text', { nullable: true })
    change_reason: string;

    @Column('varchar', { length: 50, nullable: true })
    change_type: 'created' | 'updated' | 'status_change' | 'payment' | 'rollback';

    @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;
}
